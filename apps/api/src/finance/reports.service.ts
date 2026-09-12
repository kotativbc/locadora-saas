import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequestUser } from '../auth/types';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getFinancialSummary(actor: RequestUser) {
    if (!actor.companyId) {
      return {
        totalReceivable: '0.00',
        totalReceived: '0.00',
        totalPriorEarnings: '0.00',
        totalExpenses: '0.00',
        balance: '0.00',
        chargesByType: [],
        recentCharges: [],
        recentExpenses: [],
        fleetSize: 0,
        activeContracts: 0,
      };
    }

    const [pendingCharges, paidCharges, expenses, priorEarningsAgg, chargesByType, fleetSize, activeContracts, recentCharges, recentExpenses] =
      await Promise.all([
        this.prisma.charge.aggregate({
          where: { companyId: actor.companyId, status: 'pending' },
          _sum: { amount: true },
        }),
        this.prisma.charge.aggregate({
          where: { companyId: actor.companyId, status: 'paid' },
          _sum: { amount: true },
        }),
        this.prisma.expense.aggregate({
          where: { companyId: actor.companyId },
          _sum: { amount: true },
        }),
        this.prisma.vehicle.aggregate({
          where: { companyId: actor.companyId },
          _sum: { priorEarnings: true },
        }),
        this.prisma.charge.groupBy({
          by: ['type'],
          where: { companyId: actor.companyId },
          _sum: { amount: true },
          _count: true,
        }),
        this.prisma.vehicle.count({ where: { companyId: actor.companyId } }),
        this.prisma.contract.count({ where: { companyId: actor.companyId, status: 'active' } }),
        this.prisma.charge.findMany({
          where: { companyId: actor.companyId },
          orderBy: { createdAt: 'desc' },
          take: 8,
          include: {
            customer: { select: { name: true } },
            contract: { select: { vehicle: { select: { plate: true } } } },
          },
        }),
        this.prisma.expense.findMany({
          where: { companyId: actor.companyId },
          orderBy: { createdAt: 'desc' },
          take: 8,
          include: { vehicle: { select: { plate: true, brand: true, model: true } } },
        }),
      ]);

    const totalReceivable = Number(pendingCharges._sum.amount ?? 0);
    const totalReceivedFromCharges = Number(paidCharges._sum.amount ?? 0);
    const totalPriorEarnings = Number(priorEarningsAgg._sum.priorEarnings ?? 0);
    const totalReceived = totalReceivedFromCharges + totalPriorEarnings; // ganho retroativo entra como recebido, igual no painel do veículo
    const totalExpenses = Number(expenses._sum.amount ?? 0);

    return {
      totalReceivable: totalReceivable.toFixed(2),
      totalReceived: totalReceived.toFixed(2),
      totalPriorEarnings: totalPriorEarnings.toFixed(2),
      totalExpenses: totalExpenses.toFixed(2),
      balance: (totalReceived - totalExpenses).toFixed(2),
      chargesByType: chargesByType.map((c: { type: string; _count: number; _sum: { amount: unknown } }) => ({
        type: c.type,
        count: c._count,
        total: Number(c._sum.amount ?? 0).toFixed(2),
      })),
      recentCharges: recentCharges.map(
        (c: {
          id: string;
          type: string;
          description: string;
          amount: { toString(): string };
          status: string;
          createdAt: Date;
          customer: { name: string } | null;
          contract: { vehicle: { plate: string } } | null;
        }) => ({
          id: c.id,
          type: c.type,
          description: c.description,
          amount: c.amount.toString(),
          status: c.status,
          createdAt: c.createdAt,
          customerName: c.customer?.name ?? null,
          vehiclePlate: c.contract?.vehicle?.plate ?? null,
        }),
      ),
      recentExpenses: recentExpenses.map(
        (e: {
          id: string;
          category: string;
          description: string;
          amount: { toString(): string };
          incurredAt: Date;
          vehicle: { plate: string; brand: string; model: string } | null;
        }) => ({
          id: e.id,
          category: e.category,
          description: e.description,
        amount: e.amount.toString(),
        incurredAt: e.incurredAt,
        vehicle: e.vehicle ? `${e.vehicle.plate} — ${e.vehicle.brand} ${e.vehicle.model}` : null,
      })),
      fleetSize,
      activeContracts,
    };
  }

  /** Painel operacional completo — visão geral de toda a operação, não só financeiro. */
  async getOperationsDashboard(actor: RequestUser) {
    if (!actor.companyId) {
      return {
        fleetByStatus: { available: 0, rented: 0, maintenance: 0, inactive: 0 },
        contractsByStatus: { draft: 0, awaiting_signature: 0, active: 0, completed: 0, cancelled: 0 },
        upcomingPayments: [],
        overdue: { count: 0, total: '0.00' },
        maintenanceReminders: [],
      };
    }

    const now = new Date();
    const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const [fleetStatusRows, contractStatusRows, upcomingChargesRaw, overdueAgg] = await Promise.all([
      this.prisma.vehicle.groupBy({ by: ['status'], where: { companyId: actor.companyId }, _count: true }),
      this.prisma.contract.groupBy({ by: ['status'], where: { companyId: actor.companyId }, _count: true }),
      this.prisma.charge.findMany({
        where: { companyId: actor.companyId, status: 'pending', dueDate: { gte: now, lte: in14Days } },
        orderBy: { dueDate: 'asc' },
        take: 10,
        include: {
          customer: { select: { name: true } },
          contract: { select: { vehicle: { select: { plate: true } } } },
        },
      }),
      this.prisma.charge.aggregate({
        where: { companyId: actor.companyId, status: 'pending', dueDate: { lt: now } },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    const fleetByStatus: Record<string, number> = { available: 0, rented: 0, maintenance: 0, inactive: 0 };
    for (const row of fleetStatusRows as { status: string; _count: number }[]) {
      fleetByStatus[row.status] = row._count;
    }

    const contractsByStatus: Record<string, number> = {
      draft: 0,
      awaiting_signature: 0,
      active: 0,
      completed: 0,
      cancelled: 0,
    };
    for (const row of contractStatusRows as { status: string; _count: number }[]) {
      contractsByStatus[row.status] = row._count;
    }

    const upcomingPayments = upcomingChargesRaw.map(
      (c: {
        id: string;
        description: string;
        amount: { toString(): string };
        dueDate: Date | null;
        customer: { name: string } | null;
        contract: { vehicle: { plate: string } } | null;
      }) => ({
        id: c.id,
        description: c.description,
        amount: c.amount.toString(),
        dueDate: c.dueDate,
        customerName: c.customer?.name ?? null,
        vehiclePlate: c.contract?.vehicle?.plate ?? null,
      }),
    );

    // Manutenção preventiva próxima do vencimento — comparado por km, direto dos registros
    // de manutenção mais recentes de cada veículo (nextDueKm), sem precisar de campo derivado.
    const lastMaintenancePerVehicle = await this.prisma.maintenance.findMany({
      where: { companyId: actor.companyId, nextDueKm: { not: null } },
      orderBy: { performedAt: 'desc' },
      select: { vehicleId: true, nextDueKm: true, nextDueDate: true, vehicle: { select: { plate: true, brand: true, model: true, odometerKm: true } } },
    });
    const seenVehicles = new Set<string>();
    const maintenanceReminders: { vehicleId: string; plate: string; brand: string; model: string; reason: string }[] = [];
    for (const m of lastMaintenancePerVehicle) {
      if (seenVehicles.has(m.vehicleId)) continue; // já pegamos o registro mais recente desse veículo
      seenVehicles.add(m.vehicleId);
      const kmRemaining = m.nextDueKm !== null ? m.nextDueKm - m.vehicle.odometerKm : null;
      const dateSoon = m.nextDueDate && m.nextDueDate.getTime() - now.getTime() < 14 * 24 * 60 * 60 * 1000;
      if ((kmRemaining !== null && kmRemaining <= 1000) || dateSoon) {
        maintenanceReminders.push({
          vehicleId: m.vehicleId,
          plate: m.vehicle.plate,
          brand: m.vehicle.brand,
          model: m.vehicle.model,
          reason:
            kmRemaining !== null && kmRemaining <= 1000
              ? kmRemaining <= 0
                ? `${Math.abs(kmRemaining)} km além do previsto pra próxima revisão`
                : `faltam ${kmRemaining} km pra próxima revisão`
              : 'revisão prevista pra breve',
        });
      }
    }

    return {
      fleetByStatus,
      contractsByStatus,
      upcomingPayments,
      overdue: {
        count: overdueAgg._count,
        total: Number(overdueAgg._sum.amount ?? 0).toFixed(2),
      },
      maintenanceReminders: maintenanceReminders.slice(0, 10),
    };
  }

  /** Só Super Admin — visão de crescimento da plataforma inteira, não de uma empresa. */
  async getPlatformGrowth() {
    const [totalCompanies, companiesByStatus, totalUsers, totalVehicles, totalContracts, activeContracts, companies, plans] =
      await Promise.all([
        this.prisma.company.count(),
        this.prisma.company.groupBy({ by: ['status'], _count: true }),
        this.prisma.user.count(),
        this.prisma.vehicle.count(),
        this.prisma.contract.count(),
        this.prisma.contract.count({ where: { status: 'active' } }),
        this.prisma.company.findMany({ select: { createdAt: true, planId: true } }),
        this.prisma.plan.findMany({ select: { id: true, name: true } }),
      ]);

    // Últimos 12 meses, preenchendo com zero os meses sem empresa nova —
    // sem isso o gráfico fica enganoso (meses "sumindo" em vez de mostrar zero).
    const months: { key: string; label: string; count: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({ key, label: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), count: 0 });
    }
    const monthIndex = new Map(months.map((m, i) => [m.key, i]));
    for (const c of companies) {
      const key = `${c.createdAt.getFullYear()}-${String(c.createdAt.getMonth() + 1).padStart(2, '0')}`;
      const idx = monthIndex.get(key);
      if (idx !== undefined) months[idx].count += 1;
    }

    const planCounts = new Map<string, number>();
    for (const c of companies) {
      const key = c.planId ?? 'none';
      planCounts.set(key, (planCounts.get(key) ?? 0) + 1);
    }
    const planDistribution = [
      ...plans.map((p) => ({ planName: p.name, count: planCounts.get(p.id) ?? 0 })),
      { planName: 'Sem plano', count: planCounts.get('none') ?? 0 },
    ].filter((p) => p.count > 0 || plans.length === 0);

    return {
      totalCompanies,
      totalUsers,
      totalVehicles,
      totalContracts,
      activeContracts,
      companiesByStatus: companiesByStatus.map((s) => ({ status: s.status, count: s._count })),
      monthlyCompanyGrowth: months.map(({ label, count }) => ({ label, count })),
      planDistribution,
    };
  }
}
