import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/audit-log.service';
import { CreateDamageDto } from './dto/create-damage.dto';
import { UpdateDamageDto } from './dto/update-damage.dto';
import { RequestUser } from '../auth/types';

@Injectable()
export class DamagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async create(dto: CreateDamageDto, actor: RequestUser) {
    if (!actor.companyId) {
      throw new ForbiddenException('Somente usuários de uma empresa podem registrar avarias.');
    }

    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: dto.vehicleId } });
    if (!vehicle || vehicle.companyId !== actor.companyId) {
      throw new NotFoundException('Veículo não encontrado nesta empresa.');
    }

    const damage = await this.prisma.damage.create({
      data: {
        companyId: actor.companyId,
        vehicleId: dto.vehicleId,
        contractId: dto.contractId,
        inspectionId: dto.inspectionId,
        description: dto.description,
        severity: dto.severity ?? 'minor',
        estimatedCost: dto.estimatedCost,
        chargeToCustomer: dto.chargeToCustomer ?? false,
      },
    });

    await this.auditLog.record({
      action: 'damage.create',
      userId: actor.id,
      companyId: actor.companyId,
      entityType: 'Damage',
      entityId: damage.id,
    });

    return damage;
  }

  async findAll(actor: RequestUser) {
    if (!actor.companyId) return [];
    return this.prisma.damage.findMany({
      where: { companyId: actor.companyId },
      orderBy: { createdAt: 'desc' },
      include: { vehicle: { select: { plate: true, brand: true, model: true } } },
    });
  }

  async update(id: string, dto: UpdateDamageDto, actor: RequestUser) {
    const damage = await this.prisma.damage.findUnique({ where: { id } });
    if (!damage) {
      throw new NotFoundException('Avaria não encontrada.');
    }
    if (!actor.companyId || damage.companyId !== actor.companyId) {
      throw new ForbiddenException('Você não tem acesso a esta avaria.');
    }

    const updated = await this.prisma.damage.update({ where: { id }, data: dto });

    await this.auditLog.record({
      action: 'damage.update',
      userId: actor.id,
      companyId: actor.companyId,
      entityType: 'Damage',
      entityId: id,
      metadata: dto as Record<string, unknown>,
    });

    return updated;
  }
}
