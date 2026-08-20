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
        totalExpenses: '0.00',
        balance: '0.00',
        chargesByType: [],
        fleetSize: 0,
        activeContracts: 0,
      };
    }

    const [pendingCharges, paidCharges, expenses, chargesByType, fleetSize, activeContracts] = await Promise.all([
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
      this.prisma.charge.groupBy({
        by: ['type'],
        where: { companyId: actor.companyId },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.vehicle.count({ where: { companyId: actor.companyId } }),
      this.prisma.contract.count({ where: { companyId: actor.companyId, status: 'active' } }),
    ]);

    const totalReceivable = Number(pendingCharges._sum.amount ?? 0);
    const totalReceived = Number(paidCharges._sum.amount ?? 0);
    const totalExpenses = Number(expenses._sum.amount ?? 0);

    return {
      totalReceivable: totalReceivable.toFixed(2),
      totalReceived: totalReceived.toFixed(2),
      totalExpenses: totalExpenses.toFixed(2),
      balance: (totalReceived - totalExpenses).toFixed(2),
      chargesByType: chargesByType.map((c) => ({
        type: c.type,
        count: c._count,
        total: Number(c._sum.amount ?? 0).toFixed(2),
      })),
      fleetSize,
      activeContracts,
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
