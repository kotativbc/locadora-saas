import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/audit-log.service';
import { CreateRatePlanDto } from './dto/create-rate-plan.dto';
import { UpdateRatePlanDto } from './dto/update-rate-plan.dto';
import { RequestUser } from '../auth/types';

@Injectable()
export class RatePlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async create(dto: CreateRatePlanDto, actor: RequestUser) {
    if (!actor.companyId) {
      throw new ForbiddenException('Somente usuários de uma empresa podem cadastrar tarifas.');
    }

    if (dto.vehicleId) {
      const vehicle = await this.prisma.vehicle.findUnique({ where: { id: dto.vehicleId } });
      if (!vehicle || vehicle.companyId !== actor.companyId) {
        throw new ForbiddenException('Veículo informado não pertence à sua empresa.');
      }
    }

    const ratePlan = await this.prisma.ratePlan.create({
      data: { ...dto, companyId: actor.companyId },
    });

    await this.auditLog.record({
      action: 'rate_plan.create',
      userId: actor.id,
      companyId: actor.companyId,
      entityType: 'RatePlan',
      entityId: ratePlan.id,
    });

    return ratePlan;
  }

  async findAll(actor: RequestUser) {
    if (!actor.companyId) return [];
    return this.prisma.ratePlan.findMany({
      where: { companyId: actor.companyId },
      orderBy: { createdAt: 'desc' },
      include: { vehicle: { select: { plate: true, brand: true, model: true } } },
    });
  }

  async update(id: string, dto: UpdateRatePlanDto, actor: RequestUser) {
    const ratePlan = await this.prisma.ratePlan.findUnique({ where: { id } });
    if (!ratePlan) {
      throw new NotFoundException('Tarifa não encontrada.');
    }
    if (!actor.companyId || ratePlan.companyId !== actor.companyId) {
      throw new ForbiddenException('Você não tem acesso a esta tarifa.');
    }

    const updated = await this.prisma.ratePlan.update({ where: { id }, data: dto });

    await this.auditLog.record({
      action: 'rate_plan.update',
      userId: actor.id,
      companyId: actor.companyId,
      entityType: 'RatePlan',
      entityId: id,
    });

    return updated;
  }

  async remove(id: string, actor: RequestUser) {
    const ratePlan = await this.prisma.ratePlan.findUnique({ where: { id } });
    if (!ratePlan) {
      throw new NotFoundException('Tarifa não encontrada.');
    }
    if (!actor.companyId || ratePlan.companyId !== actor.companyId) {
      throw new ForbiddenException('Você não tem acesso a esta tarifa.');
    }

    // Seguro: contratos já feitos guardam o valor da tarifa "congelado" no
    // momento da criação (dailyRateSnapshot etc.) — excluir a tarifa só
    // desvincula (ratePlanId vira null), nunca muda o valor de um contrato
    // já existente.
    await this.prisma.ratePlan.delete({ where: { id } });

    await this.auditLog.record({
      action: 'rate_plan.delete',
      userId: actor.id,
      companyId: actor.companyId,
      entityType: 'RatePlan',
      entityId: id,
    });

    return { deleted: true };
  }
}
