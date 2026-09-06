import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/audit-log.service';
import { RequestContextService } from '../common/request-context.service';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { SubmitInspectionLinkDto } from './dto/submit-inspection-link.dto';
import { RequestUser } from '../auth/types';

const LINK_TTL_HOURS = 6; // pensado pra uso presencial imediato — não é um link que fica válido por dias

function daysBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

interface FinalizeInput {
  contract: { id: string; vehicleId: string; startDate: Date; endDate: Date; totalValue: unknown };
  companyId: string;
  type: 'delivery' | 'return';
  odometerKm: number;
  fuelLevel: string;
  exteriorNotes?: string;
  checklistItems?: unknown;
  performedByUserId?: string;
  signature?: { name: string; image: string; ip: string | null; userAgent: string | null };
}

@Injectable()
export class InspectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly requestContext: RequestContextService,
  ) {}

  /** Confere se dá pra registrar esse tipo de vistoria agora — mesma regra pro preenchimento direto e pro link digital. */
  private assertCanRegister(
    contract: { status: string; deliveredAt: Date | null; returnedAt: Date | null },
    type: 'delivery' | 'return',
  ) {
    if (type === 'delivery') {
      if (contract.status !== 'active') {
        throw new ConflictException('Só é possível registrar entrega de um contrato ativo (já assinado).');
      }
      if (contract.deliveredAt) {
        throw new ConflictException('A entrega deste contrato já foi registrada.');
      }
    } else {
      if (!contract.deliveredAt) {
        throw new ConflictException('Registre a entrega antes de registrar a devolução.');
      }
      if (contract.returnedAt) {
        throw new ConflictException('A devolução deste contrato já foi registrada.');
      }
    }
  }

  /**
   * Núcleo da regra de negócio — usado tanto pelo preenchimento direto da
   * equipe (create) quanto pela conclusão do link digital assinado pelo
   * cliente (submitByToken). Atualiza odômetro do veículo, datas do
   * contrato, e calcula a multa sugerida de devolução antecipada.
   */
  private async finalizeInspection(input: FinalizeInput, existingInspectionId?: string) {
    if (input.odometerKm < 0) {
      throw new BadRequestException('Odômetro inválido.');
    }
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: input.contract.vehicleId } });
    if (vehicle && input.odometerKm < vehicle.odometerKm) {
      throw new BadRequestException(
        `O odômetro informado (${input.odometerKm} km) é menor que o registrado atualmente para o veículo (${vehicle.odometerKm} km).`,
      );
    }

    const performedAt = new Date();

    const inspection = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const data = {
        performedAt,
        odometerKm: input.odometerKm,
        fuelLevel: input.fuelLevel,
        exteriorNotes: input.exteriorNotes,
        checklistItems: input.checklistItems as any,
        performedByUserId: input.performedByUserId,
        signedAt: input.signature ? performedAt : undefined,
        signerName: input.signature?.name,
        signatureImage: input.signature?.image,
        signerIp: input.signature?.ip ?? undefined,
        signerUserAgent: input.signature?.userAgent ?? undefined,
        token: null, // consumido — link não serve mais depois de enviado
        tokenExpiresAt: null,
      };

      const created = existingInspectionId
        ? await tx.inspection.update({ where: { id: existingInspectionId }, data })
        : await tx.inspection.create({
            data: {
              ...data,
              companyId: input.companyId,
              contractId: input.contract.id,
              vehicleId: input.contract.vehicleId,
              type: input.type,
            },
          });

      await tx.vehicle.update({ where: { id: input.contract.vehicleId }, data: { odometerKm: input.odometerKm } });

      if (input.type === 'delivery') {
        await tx.contract.update({ where: { id: input.contract.id }, data: { deliveredAt: performedAt } });
      } else {
        await tx.contract.update({
          where: { id: input.contract.id },
          data: { returnedAt: performedAt, status: 'completed' },
        });
      }

      return created;
    });

    await this.auditLog.record({
      action: input.type === 'delivery' ? 'contract.delivered' : 'contract.returned',
      companyId: input.companyId,
      entityType: 'Contract',
      entityId: input.contract.id,
      metadata: {
        inspectionId: inspection.id,
        odometerKm: input.odometerKm,
        viaDigitalLink: !!input.signature,
        signerName: input.signature?.name,
      },
    });

    let earlyReturn: { daysRemaining: number; suggestedPenalty: string } | null = null;
    if (input.type === 'return' && performedAt.getTime() < input.contract.endDate.getTime()) {
      const totalDays = daysBetween(input.contract.startDate, input.contract.endDate);
      const daysRemaining = daysBetween(performedAt, input.contract.endDate);
      const remainingValue = (Number(input.contract.totalValue) / totalDays) * daysRemaining;
      earlyReturn = { daysRemaining, suggestedPenalty: (remainingValue * 0.1).toFixed(2) };
    }

    return { ...inspection, earlyReturn };
  }

  /** Preenchimento direto pela equipe, sem assinatura do cliente — como já funcionava. */
  async create(dto: CreateInspectionDto, actor: RequestUser) {
    if (!actor.companyId) {
      throw new ForbiddenException('Somente usuários de uma empresa podem registrar vistorias.');
    }
    const contract = await this.prisma.contract.findUnique({ where: { id: dto.contractId } });
    if (!contract || contract.companyId !== actor.companyId) {
      throw new NotFoundException('Contrato não encontrado nesta empresa.');
    }
    this.assertCanRegister(contract, dto.type);

    return this.finalizeInspection({
      contract,
      companyId: actor.companyId,
      type: dto.type,
      odometerKm: dto.odometerKm,
      fuelLevel: dto.fuelLevel,
      exteriorNotes: dto.exteriorNotes,
      performedByUserId: actor.id,
    });
  }

  async findAllForContract(contractId: string, actor: RequestUser) {
    if (!actor.companyId) return [];
    return this.prisma.inspection.findMany({
      where: { contractId, companyId: actor.companyId },
      orderBy: { performedAt: 'asc' },
    });
  }

  /** Gera o link público de preenchimento digital — pensado pra abrir na hora, no dispositivo do cliente ou da equipe, presencialmente. */
  async generateLink(contractId: string, type: 'delivery' | 'return', actor: RequestUser) {
    if (!actor.companyId) {
      throw new ForbiddenException('Somente usuários de uma empresa podem gerar link de vistoria.');
    }
    const contract = await this.prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract || contract.companyId !== actor.companyId) {
      throw new NotFoundException('Contrato não encontrado nesta empresa.');
    }
    this.assertCanRegister(contract, type);

    const token = crypto.randomBytes(24).toString('hex');
    const tokenExpiresAt = new Date(Date.now() + LINK_TTL_HOURS * 60 * 60 * 1000);

    await this.prisma.inspection.create({
      data: {
        companyId: actor.companyId,
        contractId,
        vehicleId: contract.vehicleId,
        type,
        token,
        tokenExpiresAt,
      },
    });

    await this.auditLog.record({
      action: 'inspection.link_created',
      userId: actor.id,
      companyId: actor.companyId,
      entityType: 'Contract',
      entityId: contractId,
      metadata: { type },
    });

    return { token, expiresAt: tokenExpiresAt };
  }

  /** Página pública de preenchimento — dados só o suficiente pra confirmar visualmente que é o carro/cliente certo, sem expor mais que isso. */
  async getByToken(token: string) {
    const inspection = await this.prisma.inspection.findUnique({
      where: { token },
      include: {
        contract: {
          include: {
            customer: { select: { name: true, document: true } },
            vehicle: { select: { plate: true, brand: true, model: true, odometerKm: true } },
            company: { select: { name: true } },
          },
        },
      },
    });
    if (!inspection) {
      throw new NotFoundException('Link de vistoria inválido ou já utilizado.');
    }
    if (inspection.tokenExpiresAt && inspection.tokenExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Este link de vistoria expirou. Peça pra equipe gerar um novo.');
    }

    return {
      type: inspection.type,
      contractNumber: inspection.contract.number,
      customer: inspection.contract.customer,
      vehicle: inspection.contract.vehicle,
      companyName: inspection.contract.company.name,
    };
  }

  /** Conclusão do link digital — checklist + assinatura desenhada pelo cliente, presencial. */
  async submitByToken(token: string, dto: SubmitInspectionLinkDto) {
    const pending = await this.prisma.inspection.findUnique({ where: { token }, include: { contract: true } });
    if (!pending) {
      throw new NotFoundException('Link de vistoria inválido ou já utilizado.');
    }
    if (pending.tokenExpiresAt && pending.tokenExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Este link de vistoria expirou. Peça pra equipe gerar um novo.');
    }
    // Revalida a regra de negócio no momento do envio — pode ter mudado desde que o link foi gerado.
    this.assertCanRegister(pending.contract, pending.type as 'delivery' | 'return');

    const ctx = this.requestContext.get();

    return this.finalizeInspection(
      {
        contract: pending.contract,
        companyId: pending.companyId,
        type: pending.type as 'delivery' | 'return',
        odometerKm: dto.odometerKm,
        fuelLevel: dto.fuelLevel,
        exteriorNotes: dto.exteriorNotes,
        checklistItems: dto.checklistItems,
        signature: {
          name: dto.signerName,
          image: dto.signatureImage,
          ip: ctx?.ip ?? null,
          userAgent: ctx?.userAgent ?? null,
        },
      },
      pending.id,
    );
  }
}
