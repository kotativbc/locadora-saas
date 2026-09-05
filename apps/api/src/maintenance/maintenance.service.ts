import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/audit-log.service';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
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

    // Se tem custo, já nasce como despesa de verdade — é o que faz o valor
    // contar em Financeiro → Despesas e nos relatórios/desempenho do veículo.
    let expenseId: string | undefined;
    if (dto.cost) {
      const expense = await this.prisma.expense.create({
        data: {
          companyId: actor.companyId,
          vehicleId: dto.vehicleId,
          category: 'maintenance',
          description: `Manutenção — ${dto.description}`,
          amount: dto.cost,
          createdByUserId: actor.id,
        },
      });
      expenseId = expense.id;
    }

    const maintenance = await this.prisma.maintenance.create({
      data: {
        companyId: actor.companyId,
        vehicleId: dto.vehicleId,
        type: dto.type,
        description: dto.description,
        odometerKm: dto.odometerKm,
        cost: dto.cost,
        expenseId,
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

  private async findAndAssertSameCompany(id: string, actor: RequestUser) {
    const maintenance = await this.prisma.maintenance.findUnique({ where: { id } });
    if (!maintenance) {
      throw new NotFoundException('Manutenção não encontrada.');
    }
    if (!actor.companyId || maintenance.companyId !== actor.companyId) {
      throw new ForbiddenException('Você não tem acesso a esta manutenção.');
    }
    return maintenance;
  }

  async update(id: string, dto: UpdateMaintenanceDto, actor: RequestUser) {
    const maintenance = await this.findAndAssertSameCompany(id, actor);

    const updated = await this.prisma.maintenance.update({
      where: { id },
      data: {
        type: dto.type,
        description: dto.description,
        performedAt: dto.performedAt ? new Date(dto.performedAt) : undefined,
        odometerKm: dto.odometerKm,
        cost: dto.cost,
        vendor: dto.vendor,
        nextDueDate: dto.nextDueDate ? new Date(dto.nextDueDate) : undefined,
        nextDueKm: dto.nextDueKm,
      },
    });

    // Mantém a despesa vinculada em dia — cria se ainda não existir (ex: essa
    // manutenção nasceu sem custo e agora ganhou um), ou atualiza a existente.
    if (dto.cost !== undefined) {
      if (maintenance.expenseId) {
        await this.prisma.expense.update({
          where: { id: maintenance.expenseId },
          data: {
            amount: dto.cost,
            description: `Manutenção — ${dto.description ?? maintenance.description}`,
            incurredAt: dto.performedAt ? new Date(dto.performedAt) : undefined,
          },
        });
      } else if (dto.cost) {
        const expense = await this.prisma.expense.create({
          data: {
            companyId: actor.companyId!,
            vehicleId: maintenance.vehicleId,
            category: 'maintenance',
            description: `Manutenção — ${dto.description ?? maintenance.description}`,
            amount: dto.cost,
            incurredAt: dto.performedAt ? new Date(dto.performedAt) : maintenance.performedAt,
            createdByUserId: actor.id,
          },
        });
        await this.prisma.maintenance.update({ where: { id }, data: { expenseId: expense.id } });
      }
    }

    await this.auditLog.record({
      action: 'maintenance.update',
      userId: actor.id,
      companyId: actor.companyId,
      entityType: 'Maintenance',
      entityId: id,
      metadata: dto as Record<string, unknown>,
    });

    return updated;
  }
}
