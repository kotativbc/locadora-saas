import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/audit-log.service';
import { PlanLimitsService } from '../plans/plan-limits.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { RequestUser } from '../auth/types';

@Injectable()
export class VehiclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly planLimits: PlanLimitsService,
  ) {}

  async create(dto: CreateVehicleDto, actor: RequestUser) {
    if (!actor.companyId) {
      throw new ForbiddenException('Somente usuários de uma empresa podem cadastrar veículos.');
    }

    await this.planLimits.assertCanAddVehicle(actor.companyId);

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

  /** Custo (o que a empresa pagou) x retorno real (o que o veículo já gerou) — não confundir com a Tabela FIPE, que é valor de mercado. */
  async getFinancialSummary(id: string, actor: RequestUser) {
    const vehicle = await this.findAndAssertSameCompany(id, actor);

    const [paidCharges, pendingCharges, expenses] = await Promise.all([
      this.prisma.charge.aggregate({
        where: { status: 'paid', contract: { vehicleId: id } },
        _sum: { amount: true },
      }),
      this.prisma.charge.aggregate({
        where: { status: 'pending', contract: { vehicleId: id } },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: { vehicleId: id },
        _sum: { amount: true },
      }),
    ]);

    const totalReceivedFromCharges = Number(paidCharges._sum.amount ?? 0);
    const priorEarnings = vehicle.priorEarnings ? Number(vehicle.priorEarnings) : 0;
    const totalReceived = totalReceivedFromCharges + priorEarnings; // ganho retroativo entra direto como recebido
    const totalPending = Number(pendingCharges._sum.amount ?? 0);
    const totalExpenses = Number(expenses._sum.amount ?? 0);
    const acquisitionCost = vehicle.acquisitionCost ? Number(vehicle.acquisitionCost) : null;
    const netResult = totalReceived - totalExpenses;

    return {
      acquisitionCost: vehicle.acquisitionCost?.toString() ?? null,
      priorEarnings: vehicle.priorEarnings?.toString() ?? null,
      totalReceived: totalReceived.toFixed(2),
      totalPending: totalPending.toFixed(2),
      totalExpenses: totalExpenses.toFixed(2),
      netResult: netResult.toFixed(2),
      // já pagou o veículo? só faz sentido comparar se o custo de aquisição foi informado
      paybackProgress: acquisitionCost && acquisitionCost > 0 ? Math.min(100, (netResult / acquisitionCost) * 100).toFixed(1) : null,
    };
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
