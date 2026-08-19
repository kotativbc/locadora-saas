import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/audit-log.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { RequestUser } from '../auth/types';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async create(dto: CreateExpenseDto, actor: RequestUser) {
    if (!actor.companyId) {
      throw new ForbiddenException('Somente usuários de uma empresa podem registrar despesas.');
    }

    if (dto.vehicleId) {
      const vehicle = await this.prisma.vehicle.findUnique({ where: { id: dto.vehicleId } });
      if (!vehicle || vehicle.companyId !== actor.companyId) {
        throw new NotFoundException('Veículo não encontrado nesta empresa.');
      }
    }

    const expense = await this.prisma.expense.create({
      data: {
        companyId: actor.companyId,
        vehicleId: dto.vehicleId,
        category: dto.category,
        description: dto.description,
        amount: dto.amount,
        incurredAt: dto.incurredAt ? new Date(dto.incurredAt) : undefined,
        createdByUserId: actor.id,
      },
    });

    await this.auditLog.record({
      action: 'expense.create',
      userId: actor.id,
      companyId: actor.companyId,
      entityType: 'Expense',
      entityId: expense.id,
    });

    return expense;
  }

  async findAll(actor: RequestUser) {
    if (!actor.companyId) return [];
    return this.prisma.expense.findMany({
      where: { companyId: actor.companyId },
      orderBy: { incurredAt: 'desc' },
      include: { vehicle: { select: { plate: true, brand: true, model: true } } },
    });
  }
}
