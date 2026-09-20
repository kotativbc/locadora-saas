import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs/promises';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/audit-log.service';
import { PlanLimitsService } from '../plans/plan-limits.service';
import { ownerDocumentsDir } from '../common/storage';
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
      where: { companyId: actor.companyId, status: { not: 'sold' } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Veículos vendidos — tela própria, com o comparativo custou/rendeu/vendeu. */
  async findSold(actor: RequestUser) {
    if (!actor.companyId) return [];
    const vehicles = await this.prisma.vehicle.findMany({
      where: { companyId: actor.companyId, status: 'sold' },
      orderBy: { soldAt: 'desc' },
    });

    return Promise.all(
      vehicles.map(
        async (vehicle: {
          id: string;
          plate: string;
          brand: string;
          model: string;
          soldAt: Date | null;
          salePrice: { toString(): string } | null;
          acquisitionCost: { toString(): string } | null;
          priorEarnings: { toString(): string } | null;
        }) => {
        const [paidCharges, expenses] = await Promise.all([
          this.prisma.charge.aggregate({ where: { status: 'paid', contract: { vehicleId: vehicle.id } }, _sum: { amount: true } }),
          this.prisma.expense.aggregate({ where: { vehicleId: vehicle.id }, _sum: { amount: true } }),
        ]);
        const totalReceived = Number(paidCharges._sum.amount ?? 0) + Number(vehicle.priorEarnings ?? 0);
        const totalExpenses = Number(expenses._sum.amount ?? 0);
        const acquisitionCost = vehicle.acquisitionCost ? Number(vehicle.acquisitionCost) : null;
        const salePrice = vehicle.salePrice ? Number(vehicle.salePrice) : 0;
        // Resultado do ciclo de vida inteiro do veículo: o que rendeu enquanto locado, menos
        // o que gastou, menos o que custou pra adquirir, mais o que entrou na venda.
        const lifetimeResult = totalReceived - totalExpenses - (acquisitionCost ?? 0) + salePrice;

        return {
          id: vehicle.id,
          plate: vehicle.plate,
          brand: vehicle.brand,
          model: vehicle.model,
          soldAt: vehicle.soldAt,
          acquisitionCost: vehicle.acquisitionCost?.toString() ?? null,
          totalReceived: totalReceived.toFixed(2),
          totalExpenses: totalExpenses.toFixed(2),
          salePrice: salePrice.toFixed(2),
          lifetimeResult: lifetimeResult.toFixed(2),
        };
      }),
    );
  }

  /** Marca como vendido — some da frota ativa, mas o histórico continua intacto pro comparativo. */
  async markAsSold(id: string, salePrice: string, actor: RequestUser) {
    const vehicle = await this.findAndAssertSameCompany(id, actor);

    const updated = await this.prisma.vehicle.update({
      where: { id },
      data: { status: 'sold', soldAt: new Date(), salePrice },
    });

    await this.auditLog.record({
      action: 'vehicle.sold',
      userId: actor.id,
      companyId: actor.companyId,
      entityType: 'Vehicle',
      entityId: id,
      metadata: { plate: vehicle.plate, salePrice },
    });

    return updated;
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

  /** Painel agregado de toda a frota — pra tela de Frota mostrar o quadro geral, não só veículo por veículo. */
  async getFleetSummary(actor: RequestUser) {
    if (!actor.companyId) {
      throw new ForbiddenException('Somente usuários de uma empresa podem ver o resumo da frota.');
    }

    const [vehicleAgg, statusCounts, paidCharges, pendingCharges, expenses] = await Promise.all([
      this.prisma.vehicle.aggregate({
        where: { companyId: actor.companyId, status: { not: 'sold' } },
        _sum: { acquisitionCost: true, fipeValue: true, priorEarnings: true },
        _count: true,
      }),
      this.prisma.vehicle.groupBy({
        by: ['status'],
        where: { companyId: actor.companyId, status: { not: 'sold' } },
        _count: true,
      }),
      this.prisma.charge.aggregate({
        where: {
          companyId: actor.companyId,
          status: 'paid',
          OR: [{ contractId: null }, { contract: { vehicle: { status: { not: 'sold' } } } }],
        },
        _sum: { amount: true },
      }),
      this.prisma.charge.aggregate({
        where: {
          companyId: actor.companyId,
          status: 'pending',
          OR: [{ contractId: null }, { contract: { vehicle: { status: { not: 'sold' } } } }],
        },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        // conta despesa sem veículo (geral da empresa) OU de veículo que ainda está na frota ativa
        where: { companyId: actor.companyId, OR: [{ vehicleId: null }, { vehicle: { status: { not: 'sold' } } }] },
        _sum: { amount: true },
      }),
    ]);

    const totalAcquisitionCost = Number(vehicleAgg._sum.acquisitionCost ?? 0);
    const totalFipeValue = Number(vehicleAgg._sum.fipeValue ?? 0);
    const totalPriorEarnings = Number(vehicleAgg._sum.priorEarnings ?? 0);
    const totalReceivedFromCharges = Number(paidCharges._sum.amount ?? 0);
    const totalReceived = totalReceivedFromCharges + totalPriorEarnings;
    const totalPending = Number(pendingCharges._sum.amount ?? 0);
    const totalExpenses = Number(expenses._sum.amount ?? 0);
    const netResult = totalReceived - totalExpenses;

    const byStatus: Record<string, number> = { available: 0, rented: 0, maintenance: 0, inactive: 0 };
    for (const row of statusCounts as { status: string; _count: number }[]) {
      byStatus[row.status] = row._count;
    }

    return {
      totalVehicles: vehicleAgg._count,
      byStatus,
      totalAcquisitionCost: totalAcquisitionCost.toFixed(2),
      totalFipeValue: totalFipeValue.toFixed(2),
      totalPriorEarnings: totalPriorEarnings.toFixed(2),
      totalReceived: totalReceived.toFixed(2),
      totalPending: totalPending.toFixed(2),
      totalExpenses: totalExpenses.toFixed(2),
      netResult: netResult.toFixed(2),
      fleetPaybackProgress:
        totalAcquisitionCost > 0 ? Math.min(100, (netResult / totalAcquisitionCost) * 100).toFixed(1) : null,
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

  /**
   * Exclusão definitiva — bloqueada se o veículo tiver qualquer contrato (o banco
   * já recusaria de qualquer jeito, Contract.vehicleId é obrigatório e sem
   * cascata, mas aqui confere antes pra dar uma mensagem clara). Pra veículo com
   * histórico, use "marcar como vendido" em vez de excluir.
   */
  async remove(id: string, actor: RequestUser) {
    const vehicle = await this.findAndAssertSameCompany(id, actor);

    const contractCount = await this.prisma.contract.count({ where: { vehicleId: id } });
    if (contractCount > 0) {
      throw new BadRequestException(
        `Este veículo tem ${contractCount} contrato(s) vinculado(s) e não pode ser excluído. Se ele já rodou de verdade, use "Marcar como vendido" em vez de excluir — isso preserva o histórico pro comparativo financeiro.`,
      );
    }

    await this.auditLog.record({
      action: 'vehicle.delete',
      userId: actor.id,
      companyId: actor.companyId,
      entityType: 'Vehicle',
      entityId: id,
      metadata: { plate: vehicle.plate },
    });

    await this.prisma.vehicle.delete({ where: { id } });

    if (actor.companyId) {
      await fs.rm(ownerDocumentsDir(actor.companyId, 'vehicles', id), { recursive: true, force: true }).catch(() => undefined);
    }

    return { deleted: true };
  }
}
