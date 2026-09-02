import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/audit-log.service';
import { ContractPdfService } from './pdf/contract-pdf.service';
import { ChargeGeneratorService } from '../finance/charge-generator.service';
import { CreateContractDto } from './dto/create-contract.dto';
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

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly pdfService: ContractPdfService,
    private readonly chargeGenerator: ChargeGeneratorService,
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

    if (templateType === 'monthly_app_driver') {
      // Modalidade mensal sempre usa tarifa cadastrada — precisa dos campos
      // de KM/caução, que não existem numa diária avulsa.
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
      totalValue = ratePlan.monthlyRate.toString();
      dailyRate = (Number(ratePlan.monthlyRate) / 30).toFixed(2); // equivalente só pra manter o campo preenchido
      monthlyKmLimitSnapshot = ratePlan.kmAllowancePerMonth ?? undefined;
      extraKmRateSnapshot = ratePlan.extraKmRate?.toString();
      cautionAmountSnapshot = ratePlan.cautionAmount?.toString();
    } else if (templateType === 'protected') {
      // "Padrão com proteção total" — diária normal (qualquer duração), mas
      // exige tarifa com caução, limite de KM e KM excedente cadastrados,
      // já que essas cláusulas são o motivo de escolher esse modelo.
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
      totalValue = (Number(dailyRate) * days).toFixed(2);
      monthlyKmLimitSnapshot = ratePlan.kmAllowancePerMonth;
      extraKmRateSnapshot = ratePlan.extraKmRate.toString();
      cautionAmountSnapshot = ratePlan.cautionAmount.toString();
    } else if (dto.ratePlanId) {
      const ratePlan = await this.prisma.ratePlan.findUnique({ where: { id: dto.ratePlanId } });
      if (!ratePlan || ratePlan.companyId !== actor.companyId) {
        throw new NotFoundException('Tarifa não encontrada nesta empresa.');
      }
      dailyRate = ratePlan.dailyRate.toString();
      totalValue = (Number(dailyRate) * days).toFixed(2);
    } else if (dto.dailyRate) {
      dailyRate = dto.dailyRate;
      totalValue = (Number(dailyRate) * days).toFixed(2);
    } else {
      throw new BadRequestException('Informe uma tarifa cadastrada ou uma diária avulsa.');
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
