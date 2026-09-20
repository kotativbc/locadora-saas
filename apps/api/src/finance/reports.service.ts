import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequestUser } from '../auth/types';
import { daysOverdue, saoPauloTodayUTC } from '../common/date.util';

export interface PendencyItem {
  id: string;
  type: 'charge_overdue' | 'contract_signature' | 'maintenance_due' | 'maintenance_report';
  severity: 'critical' | 'warning';
  title: string;
  description: string;
  link: string;
  date: Date | null;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getFinancialSummary(actor: RequestUser) {
    if (!actor.companyId) {
      return {
        totalReceivable: '0.00',
        totalReceived: '0.00',
        totalPriorEarnings: '0.00',
        totalVehicleSales: '0.00',
        totalExpenses: '0.00',
        balance: '0.00',
        chargesByType: [],
        recentCharges: [],
        recentExpenses: [],
        fleetSize: 0,
        activeContracts: 0,
      };
    }

    const [pendingCharges, paidCharges, expenses, priorEarningsAgg, vehicleSalesAgg, chargesByType, fleetSize, activeContracts, recentCharges, recentExpenses] =
      await Promise.all([
        this.prisma.charge.aggregate({
          // 'atrasado' continua sendo dinheiro a receber, só que já vencido — precisa
          // entrar no total, senão "a receber" fica menor do que a dívida real do cliente.
          where: { companyId: actor.companyId, status: { in: ['pending', 'atrasado'] } },
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
        this.prisma.vehicle.aggregate({
          where: { companyId: actor.companyId, status: 'sold' },
          _sum: { salePrice: true },
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
    const totalVehicleSales = Number(vehicleSalesAgg._sum.salePrice ?? 0);
    const totalReceived = totalReceivedFromCharges + totalPriorEarnings + totalVehicleSales; // ganho retroativo e venda de veículo entram como recebido
    const totalExpenses = Number(expenses._sum.amount ?? 0);

    return {
      totalReceivable: totalReceivable.toFixed(2),
      totalReceived: totalReceived.toFixed(2),
      totalPriorEarnings: totalPriorEarnings.toFixed(2),
      totalVehicleSales: totalVehicleSales.toFixed(2),
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
        // Usa o status persistido ('atrasado'), mantido em dia pelo worker a cada 1 min —
        // não recalcula "dueDate < agora" aqui, porque isso marcaria como atrasada uma
        // cobrança que vence hoje mesmo antes de o dia terminar (bug de fuso horário).
        where: { companyId: actor.companyId, status: 'atrasado' },
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

  /**
   * Pendências gerais, itemizadas — cada uma diz exatamente o que é e pra onde ir.
   * É a fonte da lista "Pendências que precisam de atenção" no Dashboard: cobrança
   * atrasada, contrato esperando assinatura, veículo batendo km/data de revisão, e
   * relato de manutenção do cliente ainda não atendido.
   */
  async getPendencies(actor: RequestUser): Promise<PendencyItem[]> {
    if (!actor.companyId) return [];

    const now = new Date();
    const today = saoPauloTodayUTC(now);

    const [overdueCharges, awaitingSignatureContracts, lastMaintenancePerVehicle, openReports] = await Promise.all([
      this.prisma.charge.findMany({
        where: { companyId: actor.companyId, status: 'atrasado' },
        orderBy: { dueDate: 'asc' },
        include: {
          customer: { select: { name: true } },
          contract: { select: { vehicle: { select: { plate: true } } } },
        },
      }),
      this.prisma.contract.findMany({
        where: { companyId: actor.companyId, status: 'awaiting_signature' },
        orderBy: { createdAt: 'asc' },
        include: {
          customer: { select: { name: true } },
          vehicle: { select: { plate: true } },
        },
      }),
      this.prisma.maintenance.findMany({
        where: { companyId: actor.companyId, nextDueKm: { not: null } },
        orderBy: { performedAt: 'desc' },
        select: {
          vehicleId: true,
          nextDueKm: true,
          nextDueDate: true,
          vehicle: { select: { plate: true, brand: true, model: true, odometerKm: true, status: true } },
        },
      }),
      this.prisma.maintenanceReport.findMany({
        where: { companyId: actor.companyId, status: 'open' },
        orderBy: { reportedAt: 'asc' },
        include: {
          contract: { select: { id: true, customer: { select: { name: true } }, vehicle: { select: { plate: true } } } },
        },
      }),
    ]);

    const items: PendencyItem[] = [];

    for (const c of overdueCharges) {
      const who = c.customer?.name ?? c.contract?.vehicle?.plate ?? 'sem cliente vinculado';
      const days = c.dueDate ? daysOverdue(c.dueDate, now) : 0;
      items.push({
        id: `charge-${c.id}`,
        type: 'charge_overdue',
        severity: 'critical',
        title: `Cobrança atrasada — ${who}`,
        description: `${c.description} · R$ ${Number(c.amount).toFixed(2)} · ${days} dia(s) de atraso`,
        link: `/financeiro?highlight=${c.id}`,
        date: c.dueDate,
      });
    }

    for (const ct of awaitingSignatureContracts) {
      items.push({
        id: `contract-${ct.id}`,
        type: 'contract_signature',
        severity: 'warning',
        title: `Contrato aguardando assinatura — ${ct.customer?.name ?? ct.vehicle?.plate ?? 'sem cliente'}`,
        description: `Veículo ${ct.vehicle?.plate ?? '—'} · criado em ${ct.createdAt.toLocaleDateString('pt-BR')}`,
        link: `/contratos?highlight=${ct.id}`,
        date: ct.createdAt,
      });
    }

    // Manutenção vencida/próxima por km ou data — mesma lógica de dedup por veículo do
    // painel operacional, mas aqui separamos "já vencida" (crítico) de "próxima" (atenção).
    const seenVehicles = new Set<string>();
    for (const m of lastMaintenancePerVehicle) {
      if (seenVehicles.has(m.vehicleId)) continue;
      seenVehicles.add(m.vehicleId);
      if (m.vehicle.status === 'sold' || m.vehicle.status === 'inactive') continue; // fora de operação, não pendência

      const kmRemaining = m.nextDueKm !== null ? m.nextDueKm - m.vehicle.odometerKm : null;
      const dateOverdue = m.nextDueDate ? m.nextDueDate.getTime() <= today.getTime() : false;
      const dateSoon = m.nextDueDate ? m.nextDueDate.getTime() - now.getTime() < 14 * 24 * 60 * 60 * 1000 : false;
      const kmOverdue = kmRemaining !== null && kmRemaining <= 0;
      const kmSoon = kmRemaining !== null && kmRemaining <= 1000;

      if (!kmOverdue && !dateOverdue && !kmSoon && !dateSoon) continue;

      const reason = kmOverdue
        ? `${Math.abs(kmRemaining as number)} km além do previsto pra próxima revisão`
        : dateOverdue
          ? 'revisão prevista já venceu'
          : kmSoon
            ? `faltam ${kmRemaining} km pra próxima revisão`
            : 'revisão prevista pra breve';

      items.push({
        id: `maintenance-${m.vehicleId}`,
        type: 'maintenance_due',
        severity: kmOverdue || dateOverdue ? 'critical' : 'warning',
        title: `Manutenção — ${m.vehicle.plate} ${m.vehicle.brand} ${m.vehicle.model}`,
        description: reason,
        link: `/frota?highlight=${m.vehicleId}`,
        date: m.nextDueDate,
      });
    }

    for (const r of openReports) {
      const who = r.contract.customer?.name ?? r.contract.vehicle?.plate ?? 'sem cliente';
      items.push({
        id: `maintenance-report-${r.id}`,
        type: 'maintenance_report',
        severity: 'warning',
        title: `Relato de manutenção não atendido — ${who}`,
        description: r.description,
        link: `/contratos?highlight=${r.contract.id}`,
        date: r.reportedAt,
      });
    }

    // Crítico primeiro, depois por data (mais antigo primeiro dentro de cada grupo).
    return items.sort((a, b) => {
      if (a.severity !== b.severity) return a.severity === 'critical' ? -1 : 1;
      const da = a.date ? a.date.getTime() : 0;
      const db = b.date ? b.date.getTime() : 0;
      return da - db;
    });
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
