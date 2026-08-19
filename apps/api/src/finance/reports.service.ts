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
}
