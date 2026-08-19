import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Toda regra de "esta empresa pode adicionar mais um X?" mora aqui — Frota e
 * Usuários chamam isso antes de criar, nenhum dos dois reimplementa a
 * contagem/comparação com o limite do plano por conta própria.
 */
@Injectable()
export class PlanLimitsService {
  constructor(private readonly prisma: PrismaService) {}

  async assertCanAddVehicle(companyId: string): Promise<void> {
    const company = await this.prisma.company.findUnique({ where: { id: companyId }, include: { plan: true } });
    if (!company?.plan?.maxVehicles) return; // sem plano ou plano sem limite = sem restrição

    const count = await this.prisma.vehicle.count({ where: { companyId } });
    if (count >= company.plan.maxVehicles) {
      throw new ForbiddenException(
        `Limite do plano "${company.plan.name}" atingido: máximo de ${company.plan.maxVehicles} veículos. Fale com o administrador da plataforma pra aumentar o limite.`,
      );
    }
  }

  async assertCanAddUser(companyId: string): Promise<void> {
    const company = await this.prisma.company.findUnique({ where: { id: companyId }, include: { plan: true } });
    if (!company?.plan?.maxUsers) return;

    const count = await this.prisma.user.count({ where: { companyId } });
    if (count >= company.plan.maxUsers) {
      throw new ForbiddenException(
        `Limite do plano "${company.plan.name}" atingido: máximo de ${company.plan.maxUsers} usuários. Fale com o administrador da plataforma pra aumentar o limite.`,
      );
    }
  }
}
