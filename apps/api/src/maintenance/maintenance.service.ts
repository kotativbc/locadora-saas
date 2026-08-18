import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/audit-log.service';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { RequestUser } from '../auth/types';

@Injectable()
export class MaintenanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async create(dto: CreateMaintenanceDto, actor: RequestUser) {
    if (!actor.companyId) {
      throw new ForbiddenException('Somente usuários de uma empresa podem registrar manutenção.');
    }

    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: dto.vehicleId } });
    if (!vehicle || vehicle.companyId !== actor.companyId) {
      throw new NotFoundException('Veículo não encontrado nesta empresa.');
    }

    const maintenance = await this.prisma.maintenance.create({
      data: {
        companyId: actor.companyId,
        vehicleId: dto.vehicleId,
        type: dto.type,
        description: dto.description,
        odometerKm: dto.odometerKm,
        cost: dto.cost,
        vendor: dto.vendor,
        nextDueDate: dto.nextDueDate ? new Date(dto.nextDueDate) : undefined,
        nextDueKm: dto.nextDueKm,
        createdByUserId: actor.id,
      },
    });

    await this.auditLog.record({
      action: 'maintenance.create',
      userId: actor.id,
      companyId: actor.companyId,
      entityType: 'Maintenance',
      entityId: maintenance.id,
    });

    return maintenance;
  }

  async findAll(actor: RequestUser) {
    if (!actor.companyId) return [];
    return this.prisma.maintenance.findMany({
      where: { companyId: actor.companyId },
      orderBy: { performedAt: 'desc' },
      include: { vehicle: { select: { plate: true, brand: true, model: true } } },
    });
  }
}
