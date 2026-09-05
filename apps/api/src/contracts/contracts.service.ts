import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/audit-log.service';
import { ContractPdfService } from './pdf/contract-pdf.service';
import { ChargeGeneratorService } from '../finance/charge-generator.service';
import { EMAIL_ADAPTER, EmailAdapter } from '../email/email-adapter.interface';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDraftDto } from './dto/update-contract-draft.dto';
import { UpdateContractOperationalDto } from './dto/update-contract-operational.dto';
import { CreateCautionInstallmentDto } from './dto/create-caution-installment.dto';
import { UpdateCautionInstallmentDto } from './dto/update-caution-installment.dto';
import { CreateRentInstallmentDto } from './dto/create-rent-installment.dto';
import { CreateMaintenanceReportDto } from './dto/create-maintenance-report.dto';
import { UpdateMaintenanceReportDto } from './dto/update-maintenance-report.dto';
import { RequestUser } from '../auth/types';

const SIGNATURE_LINK_TTL_HOURS = 48;

function daysBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

/** Se o período fecha em semana(s) exata(s) e a tarifa tem valor semanal cadastrado, usa ele — geralmente mais barato que diária × 7. Senão, cai na diária normal. */
function calculatePeriodValue(dailyRate: string, weeklyRate: string | null | undefined, days: number): string {
  if (weeklyRate && days % 7 === 0) {
    const weeks = days / 7;
    return (Number(weeklyRate) * weeks).toFixed(2);
  }
  return (Number(dailyRate) * days).toFixed(2);
}

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly pdfService: ContractPdfService,
    private readonly chargeGenerator: ChargeGeneratorService,
    @Inject(EMAIL_ADAPTER) private readonly emailAdapter: EmailAdapter,
  ) {}

  async create(dto: CreateContractDto, actor: RequestUser) {
    if (!actor.companyId) {
      throw new ForbiddenException('Somente usuários de uma empresa podem criar contratos.');
    }

    const [customer, vehicle] = await Promise.all([
      this.prisma.customer.findUnique({ where: { id: dto.customerId } }),
      this.prisma.vehicle.findUnique({ where: { id: dto.vehicleId } }),
    ]);

    if (!customer || customer.companyId !== actor.companyId) {
      throw new NotFoundException('Cliente não encontrado nesta empresa.');
    }
    if (!vehicle || vehicle.companyId !== actor.companyId) {
      throw new NotFoundException('Veículo não encontrado nesta empresa.');
    }
    // "available"/"rented" não bloqueiam mais a criação — quem decide isso é a
    // checagem de conflito de datas abaixo. Só manutenção/inativo tiram o
    // veículo de circulação por completo, independente de data.
    if (vehicle.status === 'maintenance' || vehicle.status === 'inactive') {
      throw new ConflictException('Este veículo está em manutenção ou inativo no momento.');
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (endDate <= startDate) {
      throw new BadRequestException('A data de devolução deve ser depois da data de início.');
    }

    // Conflito de agenda: outro contrato do mesmo veículo (rascunho, aguardando
    // assinatura ou ativo) cujo período se sobrepõe ao solicitado.
    const overlapping = await this.prisma.contract.findFirst({
      where: {
        vehicleId: dto.vehicleId,
        status: { in: ['draft', 'awaiting_signature', 'active'] },
        startDate: { lt: endDate },
        endDate: { gt: startDate },
      },
    });
    if (overlapping) {
      throw new ConflictException(
        `Este veículo já tem outro contrato de ${overlapping.startDate.toLocaleDateString('pt-BR')} a ${overlapping.endDate.toLocaleDateString('pt-BR')}.`,
      );
    }

    let dailyRate: string;
    let totalValue: string;
    let monthlyKmLimitSnapshot: number | undefined;
    let extraKmRateSnapshot: string | undefined;
    let cautionAmountSnapshot: string | undefined;
    const templateType = dto.templateType ?? 'standard';
    const days = daysBetween(startDate, endDate);

    ({ dailyRate, totalValue, monthlyKmLimitSnapshot, extraKmRateSnapshot, cautionAmountSnapshot } =
      await this.computeContractFinancials(dto, templateType, days, actor));

    // Controle manual: se veio um valor ajustado, ele prevalece sobre o calculado
    // automaticamente (mas os "snapshots" de KM/caução continuam vindo da tarifa).
    if (dto.totalValueOverride) {
      totalValue = dto.totalValueOverride;
    }

    const contract = await this.prisma.contract.create({
      data: {
        companyId: actor.companyId,
        customerId: dto.customerId,
        vehicleId: dto.vehicleId,
        ratePlanId: dto.ratePlanId,
        templateType,
        startDate,
        endDate,
        dailyRateSnapshot: dailyRate,
        totalValue,
        monthlyKmLimitSnapshot,
        extraKmRateSnapshot,
        cautionAmountSnapshot,
        status: 'draft',
        createdByUserId: actor.id,
      },
    });

    await this.auditLog.record({
      action: 'contract.create',
      userId: actor.id,
      companyId: actor.companyId,
      entityType: 'Contract',
      entityId: contract.id,
    });

    return contract;
  }

  /** Extraído de create() pra ser reaproveitado na edição completa (só permitida antes da assinatura). */
  private async computeContractFinancials(
    dto: { ratePlanId?: string; dailyRate?: string },
    templateType: string,
    days: number,
    actor: RequestUser,
  ): Promise<{
    dailyRate: string;
    totalValue: string;
    monthlyKmLimitSnapshot: number | undefined;
    extraKmRateSnapshot: string | undefined;
    cautionAmountSnapshot: string | undefined;
  }> {
    let dailyRate: string;
    let totalValue: string;
    let monthlyKmLimitSnapshot: number | undefined;
    let extraKmRateSnapshot: string | undefined;
    let cautionAmountSnapshot: string | undefined;

    if (templateType === 'monthly_app_driver') {
      if (!dto.ratePlanId) {
        throw new BadRequestException('Contrato de motorista de aplicativo exige uma tarifa cadastrada com valor mensal.');
      }
      const ratePlan = await this.prisma.ratePlan.findUnique({ where: { id: dto.ratePlanId } });
      if (!ratePlan || ratePlan.companyId !== actor.companyId) {
        throw new NotFoundException('Tarifa não encontrada nesta empresa.');
      }
      if (!ratePlan.monthlyRate) {
        throw new BadRequestException('Esta tarifa não tem valor mensal cadastrado — edite a tarifa antes de usar neste tipo de contrato.');
      }
      dailyRate = (Number(ratePlan.monthlyRate) / 30).toFixed(2);
      totalValue = (Number(dailyRate) * days).toFixed(2); // proporcional: (dias/30) × valor mensal
      monthlyKmLimitSnapshot = ratePlan.kmAllowancePerMonth ?? undefined;
      extraKmRateSnapshot = ratePlan.extraKmRate?.toString();
      cautionAmountSnapshot = ratePlan.cautionAmount?.toString();
    } else if (templateType === 'protected') {
      if (!dto.ratePlanId) {
        throw new BadRequestException('Contrato com proteção total exige uma tarifa cadastrada com caução e limite de KM.');
      }
      const ratePlan = await this.prisma.ratePlan.findUnique({ where: { id: dto.ratePlanId } });
      if (!ratePlan || ratePlan.companyId !== actor.companyId) {
        throw new NotFoundException('Tarifa não encontrada nesta empresa.');
      }
      if (!ratePlan.cautionAmount || !ratePlan.kmAllowancePerMonth || !ratePlan.extraKmRate) {
        throw new BadRequestException(
          'Esta tarifa precisa ter caução, limite de KM mensal e valor do KM excedente cadastrados pra usar neste tipo de contrato.',
        );
      }
      dailyRate = ratePlan.dailyRate.toString();
      totalValue = calculatePeriodValue(dailyRate, ratePlan.weeklyRate?.toString(), days);
      monthlyKmLimitSnapshot = ratePlan.kmAllowancePerMonth;
      extraKmRateSnapshot = ratePlan.extraKmRate.toString();
      cautionAmountSnapshot = ratePlan.cautionAmount.toString();
    } else if (dto.ratePlanId) {
      const ratePlan = await this.prisma.ratePlan.findUnique({ where: { id: dto.ratePlanId } });
      if (!ratePlan || ratePlan.companyId !== actor.companyId) {
        throw new NotFoundException('Tarifa não encontrada nesta empresa.');
      }
      dailyRate = ratePlan.dailyRate.toString();
      totalValue = calculatePeriodValue(dailyRate, ratePlan.weeklyRate?.toString(), days);
    } else if (dto.dailyRate) {
      dailyRate = dto.dailyRate;
      totalValue = (Number(dailyRate) * days).toFixed(2);
    } else {
      throw new BadRequestException('Informe uma tarifa cadastrada ou uma diária avulsa.');
    }

    return { dailyRate, totalValue, monthlyKmLimitSnapshot, extraKmRateSnapshot, cautionAmountSnapshot };
  }

  /** Edição completa — só permitida antes da assinatura (rascunho ou aguardando assinatura). */
  async updateDraft(id: string, dto: UpdateContractDraftDto, actor: RequestUser) {
    const contract = await this.findAndAssertSameCompany(id, actor);
    if (contract.status !== 'draft' && contract.status !== 'awaiting_signature') {
      throw new BadRequestException(
        'Este contrato já foi assinado — os termos centrais não podem mais ser alterados. Use a edição operacional (data de devolução/observações), ou cancele e crie um novo se precisar mudar algo maior.',
      );
    }

    const customerId = dto.customerId ?? contract.customerId;
    const vehicleId = dto.vehicleId ?? contract.vehicleId;
    const startDate = dto.startDate ? new Date(dto.startDate) : contract.startDate;
    const endDate = dto.endDate ? new Date(dto.endDate) : contract.endDate;
    const templateType = dto.templateType ?? contract.templateType;

    if (endDate <= startDate) {
      throw new BadRequestException('A data de devolução deve ser depois da data de início.');
    }

    if (dto.customerId) {
      const customer = await this.prisma.customer.findUnique({ where: { id: dto.customerId } });
      if (!customer || customer.companyId !== actor.companyId) {
        throw new NotFoundException('Cliente não encontrado nesta empresa.');
      }
    }
    if (dto.vehicleId) {
      const vehicle = await this.prisma.vehicle.findUnique({ where: { id: dto.vehicleId } });
      if (!vehicle || vehicle.companyId !== actor.companyId) {
        throw new NotFoundException('Veículo não encontrado nesta empresa.');
      }
    }

    // Conflito de agenda, ignorando o próprio contrato sendo editado.
    const overlapping = await this.prisma.contract.findFirst({
      where: {
        id: { not: id },
        vehicleId,
        status: { in: ['draft', 'awaiting_signature', 'active'] },
        startDate: { lt: endDate },
        endDate: { gt: startDate },
      },
    });
    if (overlapping) {
      throw new ConflictException(
        `Este veículo já tem outro contrato de ${overlapping.startDate.toLocaleDateString('pt-BR')} a ${overlapping.endDate.toLocaleDateString('pt-BR')}.`,
      );
    }

    const days = daysBetween(startDate, endDate);
    const ratePlanId = dto.ratePlanId ?? contract.ratePlanId ?? undefined;
    const computed = await this.computeContractFinancials({ ratePlanId, dailyRate: dto.dailyRate }, templateType, days, actor);
    const { dailyRate, monthlyKmLimitSnapshot, extraKmRateSnapshot, cautionAmountSnapshot } = computed;
    const totalValue = dto.totalValueOverride ?? computed.totalValue;

    const updated = await this.prisma.contract.update({
      where: { id },
      data: {
        customerId,
        vehicleId,
        ratePlanId,
        templateType,
        startDate,
        endDate,
        dailyRateSnapshot: dailyRate,
        totalValue,
        monthlyKmLimitSnapshot,
        extraKmRateSnapshot,
        cautionAmountSnapshot,
      },
    });

    await this.auditLog.record({
      action: 'contract.update_draft',
      userId: actor.id,
      companyId: actor.companyId,
      entityType: 'Contract',
      entityId: id,
      metadata: dto as unknown as Record<string, unknown>,
    });

    return updated;
  }

  /** Edição operacional — pra contratos já assinados. Só data de devolução e observações; nunca os termos centrais. */
  async updateOperational(id: string, dto: UpdateContractOperationalDto, actor: RequestUser) {
    const contract = await this.findAndAssertSameCompany(id, actor);
    if (contract.status === 'draft' || contract.status === 'awaiting_signature') {
      throw new BadRequestException('Este contrato ainda não foi assinado — use a edição completa em vez desta.');
    }
    if (contract.status === 'cancelled') {
      throw new BadRequestException('Este contrato está cancelado e não pode mais ser editado.');
    }

    const data: { endDate?: Date; notes?: string } = {};
    if (dto.endDate) {
      const endDate = new Date(dto.endDate);
      if (endDate <= contract.startDate) {
        throw new BadRequestException('A data de devolução deve ser depois da data de início.');
      }
      data.endDate = endDate;
    }
    if (dto.notes !== undefined) {
      data.notes = dto.notes;
    }

    const updated = await this.prisma.contract.update({ where: { id }, data });

    await this.auditLog.record({
      action: 'contract.update_operational',
      userId: actor.id,
      companyId: actor.companyId,
      entityType: 'Contract',
      entityId: id,
      metadata: dto as unknown as Record<string, unknown>,
    });

    return updated;
  }

  /** Cancela o contrato — some das listas ativas, mas todo o histórico (lançamentos, vistorias, etc.) é preservado. Reversível manualmente se necessário. */
  async cancel(id: string, actor: RequestUser) {
    const contract = await this.findAndAssertSameCompany(id, actor);
    if (contract.status === 'cancelled') {
      throw new BadRequestException('Este contrato já está cancelado.');
    }

    const updated = await this.prisma.contract.update({ where: { id }, data: { status: 'cancelled' } });

    await this.auditLog.record({
      action: 'contract.cancel',
      userId: actor.id,
      companyId: actor.companyId,
      entityType: 'Contract',
      entityId: id,
    });

    return updated;
  }

  /**
   * Exclusão definitiva — só permitida se o contrato NUNCA foi assinado (rascunho
   * ou aguardando assinatura). Contratos assinados têm força jurídica e histórico
   * financeiro real; pra esses, use cancel() em vez de remove(). O banco já cuida
   * de apagar em cascata o que só faz sentido junto do contrato (parcelas,
   * vistorias, sinalizações) e de desvincular sem apagar o que é um registro real
   * por si só (multas, avarias, sinistros, lançamentos já gerados).
   */
  async remove(id: string, actor: RequestUser) {
    const contract = await this.findAndAssertSameCompany(id, actor);

    if (contract.status === 'active' || contract.status === 'completed') {
      throw new BadRequestException(
        'Este contrato está assinado e ativo/concluído — não pode ser excluído definitivamente. Cancele primeiro se quiser removê-lo das listas.',
      );
    }

    // Rascunho/aguardando assinatura: nunca teve força jurídica nem dinheiro
    // real — pode excluir direto. Cancelado é o caso que precisa de checagem:
    // pode ter sido cancelado ANTES de assinar (mesma situação seguraacima) ou
    // DEPOIS (aí teve força jurídica e possivelmente cobrança paga de verdade).
    if (contract.status === 'cancelled') {
      const [signature, paidCharge] = await Promise.all([
        this.prisma.contractSignature.findUnique({ where: { contractId: id } }),
        this.prisma.charge.findFirst({ where: { contractId: id, status: 'paid' } }),
      ]);
      if (signature?.signedAt) {
        throw new BadRequestException(
          'Este contrato cancelado chegou a ser assinado antes do cancelamento — tem força jurídica registrada, não pode ser excluído definitivamente.',
        );
      }
      if (paidCharge) {
        throw new BadRequestException(
          'Este contrato cancelado tem pelo menos um lançamento já pago vinculado — não pode ser excluído definitivamente, pra preservar o histórico financeiro.',
        );
      }
    }

    await this.prisma.contract.delete({ where: { id } });

    await this.auditLog.record({
      action: 'contract.delete',
      userId: actor.id,
      companyId: actor.companyId,
      entityType: 'Contract',
      entityId: id,
      metadata: { previousStatus: contract.status },
    });

    return { deleted: true };
  }

  async findAll(actor: RequestUser) {
    if (!actor.companyId) return [];
    return this.prisma.contract.findMany({
      where: { companyId: actor.companyId },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true, document: true } },
        vehicle: { select: { plate: true, brand: true, model: true } },
        signature: { select: { signedAt: true, expiresAt: true, token: true } },
      },
    });
  }

  async findOne(id: string, actor: RequestUser) {
    return this.findAndAssertSameCompany(id, actor);
  }

  /** Fatura/extrato em PDF — todos os lançamentos (Charge) deste contrato, formatado pra enviar ao cliente. */
  async buildInvoicePdf(contractId: string, actor: RequestUser): Promise<Buffer> {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: { company: true, customer: true, vehicle: true },
    });
    if (!contract || contract.companyId !== actor.companyId) {
      throw new NotFoundException('Contrato não encontrado nesta empresa.');
    }

    const charges = await this.prisma.charge.findMany({
      where: { contractId },
      orderBy: { createdAt: 'asc' },
    });

    return this.pdfService.renderInvoice({
      contractId: contract.id,
      invoiceNumber: contract.id.slice(0, 8).toUpperCase(),
      issuedAt: new Date(),
      company: {
        name: contract.company.name,
        tradeName: contract.company.tradeName,
        cnpj: contract.company.cnpj,
        addressCity: contract.company.addressCity,
        addressState: contract.company.addressState,
        contactEmail: contract.company.contactEmail,
      },
      customer: {
        name: contract.customer.name,
        document: contract.customer.document,
        documentType: contract.customer.documentType,
        email: contract.customer.email,
        phone: contract.customer.phone,
        address: contract.customer.address,
        addressStreet: contract.customer.addressStreet,
        addressNumber: contract.customer.addressNumber,
        addressComplement: contract.customer.addressComplement,
        addressNeighborhood: contract.customer.addressNeighborhood,
        addressCity: contract.customer.addressCity,
        addressState: contract.customer.addressState,
        addressZipCode: contract.customer.addressZipCode,
      },
      vehicle: {
        plate: contract.vehicle.plate,
        brand: contract.vehicle.brand,
        model: contract.vehicle.model,
      },
      period: { startDate: contract.startDate, endDate: contract.endDate },
      charges: charges.map(
        (c: { createdAt: Date; description: string; type: string; status: string; amount: { toString(): string } }) => ({
          createdAt: c.createdAt,
          description: c.description,
          type: c.type,
          status: c.status,
          amount: c.amount.toString(),
        }),
      ),
    });
  }

  /** Gera a fatura e envia por e-mail ao cliente, se ele tiver e-mail cadastrado. */
  async sendInvoiceByEmail(contractId: string, actor: RequestUser) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: { customer: true, company: true },
    });
    if (!contract || contract.companyId !== actor.companyId) {
      throw new NotFoundException('Contrato não encontrado nesta empresa.');
    }
    if (!contract.customer.email) {
      throw new BadRequestException('Este cliente não tem e-mail cadastrado — não há pra onde enviar.');
    }

    const pdfBuffer = await this.buildInvoicePdf(contractId, actor);
    const companyLabel = contract.company.tradeName ?? contract.company.name;
    const invoiceNumber = contract.id.slice(0, 8).toUpperCase();

    const result = await this.emailAdapter.send({
      to: contract.customer.email,
      subject: `Fatura ${invoiceNumber} — ${companyLabel}`,
      text: `Olá, ${contract.customer.name}. Segue em anexo a fatura referente ao seu contrato com ${companyLabel}.`,
      html: `<p>Olá, ${contract.customer.name}.</p><p>Segue em anexo a fatura referente ao seu contrato com ${companyLabel}.</p>`,
      attachments: [{ filename: `fatura-${invoiceNumber}.pdf`, content: pdfBuffer }],
    });

    if (!result.sent) {
      throw new BadRequestException(
        'Não foi possível enviar o e-mail — confira se o SMTP está configurado corretamente no servidor.',
      );
    }

    await this.auditLog.record({
      action: 'contract.invoice_emailed',
      userId: actor.id,
      companyId: actor.companyId,
      entityType: 'Contract',
      entityId: contractId,
    });

    return { sent: true, to: contract.customer.email };
  }

  // ---------- Parcelas de caução (Anexo II — cronograma manual) ----------

  async listCautionInstallments(contractId: string, actor: RequestUser) {
    await this.findAndAssertSameCompany(contractId, actor);
    return this.prisma.cautionInstallment.findMany({
      where: { contractId },
      orderBy: { dueDate: 'asc' },
    });
  }

  async addCautionInstallment(contractId: string, dto: CreateCautionInstallmentDto, actor: RequestUser) {
    await this.findAndAssertSameCompany(contractId, actor);
    const installment = await this.prisma.cautionInstallment.create({
      data: { contractId, dueDate: new Date(dto.dueDate), amount: dto.amount },
    });
    await this.auditLog.record({
      action: 'contract.caution_installment_added',
      userId: actor.id,
      companyId: actor.companyId,
      entityType: 'CautionInstallment',
      entityId: installment.id,
      metadata: { contractId, amount: dto.amount, dueDate: dto.dueDate },
    });
    return installment;
  }

  async setCautionInstallmentPaid(
    contractId: string,
    installmentId: string,
    dto: UpdateCautionInstallmentDto,
    actor: RequestUser,
  ) {
    await this.findAndAssertSameCompany(contractId, actor);
    const installment = await this.prisma.cautionInstallment.findUnique({ where: { id: installmentId } });
    if (!installment || installment.contractId !== contractId) {
      throw new NotFoundException('Parcela não encontrada neste contrato.');
    }
    return this.prisma.cautionInstallment.update({
      where: { id: installmentId },
      data: { paidAt: dto.paid ? new Date() : null },
    });
  }

  async removeCautionInstallment(contractId: string, installmentId: string, actor: RequestUser) {
    await this.findAndAssertSameCompany(contractId, actor);
    const installment = await this.prisma.cautionInstallment.findUnique({ where: { id: installmentId } });
    if (!installment || installment.contractId !== contractId) {
      throw new NotFoundException('Parcela não encontrada neste contrato.');
    }
    await this.prisma.cautionInstallment.delete({ where: { id: installmentId } });
    return { deleted: true };
  }

  // ---------- Parcelas de aluguel (cronograma semanal — Motorista de App) ----------
  // Só pode ser alterado ANTES da assinatura: na assinatura, o cronograma é
  // "congelado" em lançamentos financeiros individuais (public-signatures.service.ts).

  private assertContractNotYetSigned(contract: { status: string }) {
    if (contract.status !== 'draft' && contract.status !== 'awaiting_signature') {
      throw new BadRequestException(
        'Este contrato já foi assinado — o cronograma de pagamento não pode mais ser alterado (os lançamentos já foram gerados).',
      );
    }
  }

  async listRentInstallments(contractId: string, actor: RequestUser) {
    await this.findAndAssertSameCompany(contractId, actor);
    return this.prisma.rentInstallment.findMany({ where: { contractId }, orderBy: { dueDate: 'asc' } });
  }

  async addRentInstallment(contractId: string, dto: CreateRentInstallmentDto, actor: RequestUser) {
    const contract = await this.findAndAssertSameCompany(contractId, actor);
    this.assertContractNotYetSigned(contract);
    const installment = await this.prisma.rentInstallment.create({
      data: { contractId, dueDate: new Date(dto.dueDate), amount: dto.amount },
    });
    await this.auditLog.record({
      action: 'contract.rent_installment_added',
      userId: actor.id,
      companyId: actor.companyId,
      entityType: 'RentInstallment',
      entityId: installment.id,
      metadata: { contractId, amount: dto.amount, dueDate: dto.dueDate },
    });
    return installment;
  }

  async removeRentInstallment(contractId: string, installmentId: string, actor: RequestUser) {
    const contract = await this.findAndAssertSameCompany(contractId, actor);
    this.assertContractNotYetSigned(contract);
    const installment = await this.prisma.rentInstallment.findUnique({ where: { id: installmentId } });
    if (!installment || installment.contractId !== contractId) {
      throw new NotFoundException('Parcela não encontrada neste contrato.');
    }
    await this.prisma.rentInstallment.delete({ where: { id: installmentId } });
    return { deleted: true };
  }

  // ---------- Sinalização de manutenção (link público + registro manual) ----------

  /** Gera (na primeira vez) ou retorna o link público existente pro cliente sinalizar problema. */
  async getOrCreateMaintenanceReportLink(id: string, actor: RequestUser) {
    const contract = await this.findAndAssertSameCompany(id, actor);
    if (contract.maintenanceReportToken) {
      return { token: contract.maintenanceReportToken };
    }
    const token = crypto.randomBytes(24).toString('hex');
    await this.prisma.contract.update({ where: { id }, data: { maintenanceReportToken: token } });
    await this.auditLog.record({
      action: 'contract.maintenance_report_link_created',
      userId: actor.id,
      companyId: actor.companyId,
      entityType: 'Contract',
      entityId: id,
    });
    return { token };
  }

  async listMaintenanceReports(contractId: string, actor: RequestUser) {
    await this.findAndAssertSameCompany(contractId, actor);
    return this.prisma.maintenanceReport.findMany({ where: { contractId }, orderBy: { reportedAt: 'desc' } });
  }

  /** Registro manual — pra quando o cliente avisa por telefone/mensagem em vez de usar o link. */
  async addMaintenanceReport(contractId: string, dto: CreateMaintenanceReportDto, actor: RequestUser) {
    const contract = await this.findAndAssertSameCompany(contractId, actor);
    const report = await this.prisma.maintenanceReport.create({
      data: {
        companyId: contract.companyId,
        contractId,
        description: dto.description,
        reportedByCustomer: false,
      },
    });
    await this.auditLog.record({
      action: 'contract.maintenance_report_added_by_staff',
      userId: actor.id,
      companyId: actor.companyId,
      entityType: 'MaintenanceReport',
      entityId: report.id,
    });
    return report;
  }

  async updateMaintenanceReportStatus(
    contractId: string,
    reportId: string,
    dto: UpdateMaintenanceReportDto,
    actor: RequestUser,
  ) {
    await this.findAndAssertSameCompany(contractId, actor);
    const report = await this.prisma.maintenanceReport.findUnique({ where: { id: reportId } });
    if (!report || report.contractId !== contractId) {
      throw new NotFoundException('Sinalização não encontrada neste contrato.');
    }
    return this.prisma.maintenanceReport.update({ where: { id: reportId }, data: { status: dto.status } });
  }

  /**
   * Confirma a cobrança da multa de devolução antecipada sugerida pela
   * vistoria de devolução. Recalcula do zero a partir dos dados do contrato
   * (não confia em valor vindo do cliente) — evita manipulação do valor.
   */
  async chargeEarlyReturnPenalty(contractId: string, actor: RequestUser) {
    const contract = await this.findAndAssertSameCompany(contractId, actor);
    if (!contract.returnedAt) {
      throw new BadRequestException('Este contrato ainda não teve devolução registrada.');
    }
    if (contract.returnedAt.getTime() >= contract.endDate.getTime()) {
      throw new BadRequestException('Este contrato não teve devolução antecipada — nada a cobrar aqui.');
    }

    const totalDays = daysBetween(contract.startDate, contract.endDate);
    const daysRemaining = daysBetween(contract.returnedAt, contract.endDate);
    const remainingValue = (Number(contract.totalValue) / totalDays) * daysRemaining;
    const penalty = (remainingValue * 0.1).toFixed(2);

    const charge = await this.chargeGenerator.createAutoCharge({
      companyId: contract.companyId,
      customerId: contract.customerId,
      contractId: contract.id,
      type: 'other',
      description: `Multa por devolução antecipada — contrato ${contract.id.slice(0, 8)} (${daysRemaining} dia(s) restante(s))`,
      amount: penalty,
    });

    return charge;
  }

  /** Gera (ou renova) o link público de assinatura de um contrato em rascunho. */
  async createSignatureLink(id: string, actor: RequestUser) {
    const contract = await this.findAndAssertSameCompany(id, actor);
    if (contract.status !== 'draft') {
      throw new ConflictException('Só é possível gerar link de assinatura para contratos em rascunho.');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SIGNATURE_LINK_TTL_HOURS * 60 * 60 * 1000);

    await this.prisma.contractSignature.upsert({
      where: { contractId: id },
      update: { token, expiresAt, signedAt: null, termsHash: null, signerIp: null, signerUserAgent: null },
      create: { contractId: id, token, expiresAt, createdByUserId: actor.id },
    });

    await this.prisma.contract.update({ where: { id }, data: { status: 'awaiting_signature' } });

    await this.auditLog.record({
      action: 'contract.signature_link_created',
      userId: actor.id,
      companyId: actor.companyId,
      entityType: 'Contract',
      entityId: id,
    });

    return { token, expiresAt };
  }

  async renderPdf(id: string, actor: RequestUser): Promise<Buffer> {
    const contract = await this.findAndAssertSameCompany(id, actor);
    return this.buildPdf(contract.id);
  }

  /** Usado tanto pela rota autenticada quanto pela pública (via token, já validado por quem chama). */
  async buildPdf(contractId: string): Promise<Buffer> {
    const contract = await this.prisma.contract.findUniqueOrThrow({
      where: { id: contractId },
      include: { company: true, customer: true, vehicle: true, signature: true },
    });

    if (contract.templateType === 'monthly_app_driver') {
      const [deliveryInspection, returnInspection, rentInstallments] = await Promise.all([
        this.prisma.inspection.findFirst({ where: { contractId, type: 'delivery' }, orderBy: { performedAt: 'desc' } }),
        this.prisma.inspection.findFirst({ where: { contractId, type: 'return' }, orderBy: { performedAt: 'desc' } }),
        this.prisma.rentInstallment.findMany({ where: { contractId }, orderBy: { dueDate: 'asc' } }),
      ]);

      return this.pdfService.renderMonthlyDriverContract({
        contractId: contract.id,
        company: {
          name: contract.company.name,
          tradeName: contract.company.tradeName,
          cnpj: contract.company.cnpj,
          addressStreet: contract.company.addressStreet,
          addressNumber: contract.company.addressNumber,
          addressComplement: contract.company.addressComplement,
          addressNeighborhood: contract.company.addressNeighborhood,
          addressCity: contract.company.addressCity,
          addressState: contract.company.addressState,
          addressZipCode: contract.company.addressZipCode,
        },
        customer: {
          name: contract.customer.name,
          document: contract.customer.document,
          documentType: contract.customer.documentType,
          driverLicenseNumber: contract.customer.driverLicenseNumber,
          driverLicenseCategory: contract.customer.driverLicenseCategory,
          address: contract.customer.address,
          addressStreet: contract.customer.addressStreet,
          addressNumber: contract.customer.addressNumber,
          addressComplement: contract.customer.addressComplement,
          addressNeighborhood: contract.customer.addressNeighborhood,
          addressCity: contract.customer.addressCity,
          addressState: contract.customer.addressState,
          addressZipCode: contract.customer.addressZipCode,
          email: contract.customer.email,
          phone: contract.customer.phone,
          bankName: contract.customer.bankName,
          bankAgency: contract.customer.bankAgency,
          bankAccount: contract.customer.bankAccount,
          pixKey: contract.customer.pixKey,
        },
        vehicle: {
          plate: contract.vehicle.plate,
          brand: contract.vehicle.brand,
          model: contract.vehicle.model,
          chassis: contract.vehicle.chassis,
          fipeValue: contract.vehicle.fipeValue?.toString() ?? null,
          maintenanceIntervalKm: contract.vehicle.maintenanceIntervalKm,
        },
        contract: {
          startDate: contract.startDate,
          endDate: contract.endDate,
          monthlyRate: contract.totalValue.toString(),
          monthlyKmLimit: contract.monthlyKmLimitSnapshot,
          extraKmRate: contract.extraKmRateSnapshot?.toString() ?? null,
          cautionAmount: contract.cautionAmountSnapshot?.toString() ?? null,
          createdAt: contract.createdAt,
        },
        signature:
          contract.signature?.signedAt && contract.signature.termsHash
            ? {
                signedAt: contract.signature.signedAt,
                signerIp: contract.signature.signerIp,
                termsHash: contract.signature.termsHash,
              }
            : null,
        inspections: {
          delivery: deliveryInspection
            ? {
                performedAt: deliveryInspection.performedAt,
                odometerKm: deliveryInspection.odometerKm,
                fuelLevel: deliveryInspection.fuelLevel,
                exteriorNotes: deliveryInspection.exteriorNotes,
              }
            : null,
          return: returnInspection
            ? {
                performedAt: returnInspection.performedAt,
                odometerKm: returnInspection.odometerKm,
                fuelLevel: returnInspection.fuelLevel,
                exteriorNotes: returnInspection.exteriorNotes,
              }
            : null,
        },
        rentInstallments: rentInstallments.map((i: { dueDate: Date; amount: { toString(): string } }) => ({
          dueDate: i.dueDate,
          amount: i.amount.toString(),
        })),
      });
    }

    if (contract.templateType === 'protected') {
      const [deliveryInspection, returnInspection, cautionInstallments] = await Promise.all([
        this.prisma.inspection.findFirst({ where: { contractId, type: 'delivery' }, orderBy: { performedAt: 'desc' } }),
        this.prisma.inspection.findFirst({ where: { contractId, type: 'return' }, orderBy: { performedAt: 'desc' } }),
        this.prisma.cautionInstallment.findMany({ where: { contractId }, orderBy: { dueDate: 'asc' } }),
      ]);

      return this.pdfService.renderProtectedContract({
        contractId: contract.id,
        company: {
          name: contract.company.name,
          tradeName: contract.company.tradeName,
          cnpj: contract.company.cnpj,
          addressStreet: contract.company.addressStreet,
          addressNumber: contract.company.addressNumber,
          addressNeighborhood: contract.company.addressNeighborhood,
          addressCity: contract.company.addressCity,
          addressState: contract.company.addressState,
        },
        customer: {
          name: contract.customer.name,
          document: contract.customer.document,
          documentType: contract.customer.documentType,
          identityNumber: contract.customer.identityNumber,
          driverLicenseNumber: contract.customer.driverLicenseNumber,
          address: contract.customer.address,
          addressStreet: contract.customer.addressStreet,
          addressNumber: contract.customer.addressNumber,
          addressComplement: contract.customer.addressComplement,
          addressNeighborhood: contract.customer.addressNeighborhood,
          addressCity: contract.customer.addressCity,
          addressState: contract.customer.addressState,
          addressZipCode: contract.customer.addressZipCode,
        },
        vehicle: {
          plate: contract.vehicle.plate,
          brand: contract.vehicle.brand,
          model: contract.vehicle.model,
          modelYear: contract.vehicle.modelYear,
          manufactureYear: contract.vehicle.manufactureYear,
          renavam: contract.vehicle.renavam,
          chassis: contract.vehicle.chassis,
          fipeValue: contract.vehicle.fipeValue?.toString() ?? null,
        },
        contract: {
          startDate: contract.startDate,
          endDate: contract.endDate,
          monthlyKmLimit: contract.monthlyKmLimitSnapshot,
          extraKmRate: contract.extraKmRateSnapshot?.toString() ?? null,
          cautionAmount: contract.cautionAmountSnapshot?.toString() ?? null,
          createdAt: contract.createdAt,
        },
        signature:
          contract.signature?.signedAt && contract.signature.termsHash
            ? {
                signedAt: contract.signature.signedAt,
                signerIp: contract.signature.signerIp,
                termsHash: contract.signature.termsHash,
              }
            : null,
        inspections: {
          delivery: deliveryInspection
            ? {
                performedAt: deliveryInspection.performedAt,
                odometerKm: deliveryInspection.odometerKm,
                fuelLevel: deliveryInspection.fuelLevel,
                exteriorNotes: deliveryInspection.exteriorNotes,
              }
            : null,
          return: returnInspection
            ? {
                performedAt: returnInspection.performedAt,
                odometerKm: returnInspection.odometerKm,
                fuelLevel: returnInspection.fuelLevel,
                exteriorNotes: returnInspection.exteriorNotes,
              }
            : null,
        },
        cautionInstallments: cautionInstallments.map((i: { dueDate: Date; amount: { toString(): string } }) => ({
          dueDate: i.dueDate,
          amount: i.amount.toString(),
        })),
      });
    }

    return this.pdfService.render({
      company: {
        name: contract.company.name,
        tradeName: contract.company.tradeName,
        cnpj: contract.company.cnpj,
      },
      customer: {
        name: contract.customer.name,
        document: contract.customer.document,
        documentType: contract.customer.documentType,
        driverLicenseNumber: contract.customer.driverLicenseNumber,
      },
      vehicle: {
        plate: contract.vehicle.plate,
        brand: contract.vehicle.brand,
        model: contract.vehicle.model,
        modelYear: contract.vehicle.modelYear,
        category: contract.vehicle.category,
      },
      contract: {
        startDate: contract.startDate,
        endDate: contract.endDate,
        days: daysBetween(contract.startDate, contract.endDate),
        dailyRateSnapshot: contract.dailyRateSnapshot.toString(),
        totalValue: contract.totalValue.toString(),
        status: contract.status,
      },
      signature:
        contract.signature?.signedAt && contract.signature.termsHash
          ? {
              signedAt: contract.signature.signedAt,
              signerIp: contract.signature.signerIp,
              termsHash: contract.signature.termsHash,
            }
          : null,
    });
  }

  private async findAndAssertSameCompany(id: string, actor: RequestUser) {
    const contract = await this.prisma.contract.findUnique({ where: { id } });
    if (!contract) {
      throw new NotFoundException('Contrato não encontrado.');
    }
    if (!actor.companyId || contract.companyId !== actor.companyId) {
      throw new ForbiddenException('Você não tem acesso a este contrato.');
    }
    return contract;
  }
}
