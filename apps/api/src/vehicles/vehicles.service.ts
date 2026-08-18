import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/audit-log.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { RequestUser } from '../auth/types';

@Injectable()
export class VehiclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async create(dto: CreateVehicleDto, actor: RequestUser) {
    if (!actor.companyId) {
      throw new ForbiddenException('Somente usuários de uma empresa podem cadastrar veículos.');
    }

    const plateInUse = await this.prisma.vehicle.findUnique({
      where: { companyId_plate: { companyId: actor.companyId, plate: dto.plate.toUpperCase() } },
    });
    if (plateInUse) {
      throw new ConflictException('Já existe um veículo com esta placa nesta empresa.');
    }

    const vehicle = await this.prisma.vehicle.create({
      data: { ...dto, plate: dto.plate.toUpperCase(), companyId: actor.companyId },
    });

    await this.auditLog.record({
      action: 'vehicle.create',
      userId: actor.id,
      companyId: actor.companyId,
      entityType: 'Vehicle',
      entityId: vehicle.id,
    });

    return vehicle;
  }

  async findAll(actor: RequestUser) {
    if (!actor.companyId) return [];
    return this.prisma.vehicle.findMany({
      where: { companyId: actor.companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, actor: RequestUser) {
    const vehicle = await this.findAndAssertSameCompany(id, actor);
    return vehicle;
  }

  async update(id: string, dto: UpdateVehicleDto, actor: RequestUser) {
    await this.findAndAssertSameCompany(id, actor);

    const vehicle = await this.prisma.vehicle.update({ where: { id }, data: dto });

    await this.auditLog.record({
      action: 'vehicle.update',
      userId: actor.id,
      companyId: actor.companyId,
      entityType: 'Vehicle',
      entityId: id,
      metadata: dto as Record<string, unknown>,
    });

    return vehicle;
  }

  private async findAndAssertSameCompany(id: string, actor: RequestUser) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado.');
    }
    if (!actor.companyId || vehicle.companyId !== actor.companyId) {
      throw new ForbiddenException('Você não tem acesso a este veículo.');
    }
    return vehicle;
  }
}
