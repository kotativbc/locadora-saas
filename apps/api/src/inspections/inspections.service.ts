import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/audit-log.service';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { RequestUser } from '../auth/types';

@Injectable()
export class InspectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async create(dto: CreateInspectionDto, actor: RequestUser) {
    if (!actor.companyId) {
      throw new ForbiddenException('Somente usuários de uma empresa podem registrar vistorias.');
    }

    const contract = await this.prisma.contract.findUnique({
      where: { id: dto.contractId },
      include: { vehicle: true },
    });
    if (!contract || contract.companyId !== actor.companyId) {
      throw new NotFoundException('Contrato não encontrado nesta empresa.');
    }

    if (dto.type === 'delivery') {
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

    if (dto.odometerKm < contract.vehicle.odometerKm) {
      throw new BadRequestException(
        `O odômetro informado (${dto.odometerKm} km) é menor que o registrado atualmente para o veículo (${contract.vehicle.odometerKm} km).`,
      );
    }

    const performedAt = new Date();

    const inspection = await this.prisma.$transaction(async (tx) => {
      const created = await tx.inspection.create({
        data: {
          companyId: actor.companyId!,
          contractId: dto.contractId,
          vehicleId: contract.vehicleId,
          type: dto.type,
          performedAt,
          odometerKm: dto.odometerKm,
          fuelLevel: dto.fuelLevel,
          exteriorNotes: dto.exteriorNotes,
          performedByUserId: actor.id,
        },
      });

      await tx.vehicle.update({ where: { id: contract.vehicleId }, data: { odometerKm: dto.odometerKm } });

      if (dto.type === 'delivery') {
        await tx.contract.update({ where: { id: contract.id }, data: { deliveredAt: performedAt } });
      } else {
        await tx.contract.update({
          where: { id: contract.id },
          data: { returnedAt: performedAt, status: 'completed' },
        });
      }

      return created;
    });

    await this.auditLog.record({
      action: dto.type === 'delivery' ? 'contract.delivered' : 'contract.returned',
      userId: actor.id,
      companyId: actor.companyId,
      entityType: 'Contract',
      entityId: contract.id,
      metadata: { inspectionId: inspection.id, odometerKm: dto.odometerKm },
    });

    return inspection;
  }

  async findAllForContract(contractId: string, actor: RequestUser) {
    if (!actor.companyId) return [];
    return this.prisma.inspection.findMany({
      where: { contractId, companyId: actor.companyId },
      orderBy: { performedAt: 'asc' },
    });
  }
}
