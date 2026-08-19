import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/audit-log.service';
import { CreateChargeDto } from './dto/create-charge.dto';
import { UpdateChargeDto } from './dto/update-charge.dto';
import { RequestUser } from '../auth/types';

@Injectable()
export class ChargesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async create(dto: CreateChargeDto, actor: RequestUser) {
    if (!actor.companyId) {
      throw new ForbiddenException('Somente usuários de uma empresa podem criar lançamentos.');
    }

    if (dto.customerId) {
      const customer = await this.prisma.customer.findUnique({ where: { id: dto.customerId } });
      if (!customer || customer.companyId !== actor.companyId) {
        throw new NotFoundException('Cliente não encontrado nesta empresa.');
      }
    }
    if (dto.contractId) {
      const contract = await this.prisma.contract.findUnique({ where: { id: dto.contractId } });
      if (!contract || contract.companyId !== actor.companyId) {
        throw new NotFoundException('Contrato não encontrado nesta empresa.');
      }
    }

    const charge = await this.prisma.charge.create({
      data: {
        companyId: actor.companyId,
        customerId: dto.customerId,
        contractId: dto.contractId,
        type: dto.type,
        description: dto.description,
        amount: dto.amount,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        createdByUserId: actor.id,
      },
    });

    await this.auditLog.record({
      action: 'charge.create',
      userId: actor.id,
      companyId: actor.companyId,
      entityType: 'Charge',
      entityId: charge.id,
    });

    return charge;
  }

  async findAll(actor: RequestUser) {
    if (!actor.companyId) return [];
    return this.prisma.charge.findMany({
      where: { companyId: actor.companyId },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true } },
        contract: { select: { id: true, vehicleId: true } },
      },
    });
  }

  async update(id: string, dto: UpdateChargeDto, actor: RequestUser) {
    const charge = await this.prisma.charge.findUnique({ where: { id } });
    if (!charge) {
      throw new NotFoundException('Lançamento não encontrado.');
    }
    if (!actor.companyId || charge.companyId !== actor.companyId) {
      throw new ForbiddenException('Você não tem acesso a este lançamento.');
    }

    const updated = await this.prisma.charge.update({
      where: { id },
      data: {
        status: dto.status,
        paidAt: dto.status === 'paid' ? new Date() : dto.status === 'pending' ? null : undefined,
      },
    });

    await this.auditLog.record({
      action: 'charge.update',
      userId: actor.id,
      companyId: actor.companyId,
      entityType: 'Charge',
      entityId: id,
      metadata: dto as Record<string, unknown>,
    });

    return updated;
  }
}
