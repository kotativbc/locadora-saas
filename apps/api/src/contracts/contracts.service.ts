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
import { CreateContractDto } from './dto/create-contract.dto';
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
    if (dto.ratePlanId) {
      const ratePlan = await this.prisma.ratePlan.findUnique({ where: { id: dto.ratePlanId } });
      if (!ratePlan || ratePlan.companyId !== actor.companyId) {
        throw new NotFoundException('Tarifa não encontrada nesta empresa.');
      }
      dailyRate = ratePlan.dailyRate.toString();
    } else if (dto.dailyRate) {
      dailyRate = dto.dailyRate;
    } else {
      throw new BadRequestException('Informe uma tarifa cadastrada ou uma diária avulsa.');
    }

    const days = daysBetween(startDate, endDate);
    const totalValue = (Number(dailyRate) * days).toFixed(2);

    const contract = await this.prisma.contract.create({
      data: {
        companyId: actor.companyId,
        customerId: dto.customerId,
        vehicleId: dto.vehicleId,
        ratePlanId: dto.ratePlanId,
        startDate,
        endDate,
        dailyRateSnapshot: dailyRate,
        totalValue,
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
