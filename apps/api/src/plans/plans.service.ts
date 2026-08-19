import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/audit-log.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { RequestUser } from '../auth/types';

@Injectable()
export class PlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async create(dto: CreatePlanDto, actor: RequestUser) {
    const existing = await this.prisma.plan.findUnique({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException('Já existe um plano com este código.');
    }

    const plan = await this.prisma.plan.create({ data: dto });

    await this.auditLog.record({
      action: 'plan.create',
      userId: actor.id,
      entityType: 'Plan',
      entityId: plan.id,
    });

    return plan;
  }

  async findAll() {
    return this.prisma.plan.findMany({
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { companies: true } } },
    });
  }

  async update(id: string, dto: UpdatePlanDto, actor: RequestUser) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) {
      throw new NotFoundException('Plano não encontrado.');
    }

    const updated = await this.prisma.plan.update({ where: { id }, data: dto });

    await this.auditLog.record({
      action: 'plan.update',
      userId: actor.id,
      entityType: 'Plan',
      entityId: id,
      metadata: dto as Record<string, unknown>,
    });

    return updated;
  }
}
