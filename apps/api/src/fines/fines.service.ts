import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/audit-log.service';
import { CreateFineDto } from './dto/create-fine.dto';
import { UpdateFineDto } from './dto/update-fine.dto';
import { RequestUser } from '../auth/types';

@Injectable()
export class FinesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async create(dto: CreateFineDto, actor: RequestUser) {
    if (!actor.companyId) {
      throw new ForbiddenException('Somente usuários de uma empresa podem registrar multas.');
    }

    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: dto.vehicleId } });
    if (!vehicle || vehicle.companyId !== actor.companyId) {
      throw new NotFoundException('Veículo não encontrado nesta empresa.');
    }

    const fine = await this.prisma.fine.create({
      data: {
        companyId: actor.companyId,
        vehicleId: dto.vehicleId,
        contractId: dto.contractId,
        infractionDate: new Date(dto.infractionDate),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        amount: dto.amount,
        description: dto.description,
        documentNumber: dto.documentNumber,
        chargeToCustomer: dto.chargeToCustomer ?? false,
        createdByUserId: actor.id,
      },
    });

    await this.auditLog.record({
      action: 'fine.create',
      userId: actor.id,
      companyId: actor.companyId,
      entityType: 'Fine',
      entityId: fine.id,
    });

    return fine;
  }

  async findAll(actor: RequestUser) {
    if (!actor.companyId) return [];
    return this.prisma.fine.findMany({
      where: { companyId: actor.companyId },
      orderBy: { infractionDate: 'desc' },
      include: { vehicle: { select: { plate: true, brand: true, model: true } } },
    });
  }

  async update(id: string, dto: UpdateFineDto, actor: RequestUser) {
    const fine = await this.prisma.fine.findUnique({ where: { id } });
    if (!fine) {
      throw new NotFoundException('Multa não encontrada.');
    }
    if (!actor.companyId || fine.companyId !== actor.companyId) {
      throw new ForbiddenException('Você não tem acesso a esta multa.');
    }

    const updated = await this.prisma.fine.update({ where: { id }, data: dto });

    await this.auditLog.record({
      action: 'fine.update',
      userId: actor.id,
      companyId: actor.companyId,
      entityType: 'Fine',
      entityId: id,
      metadata: dto as Record<string, unknown>,
    });

    return updated;
  }
}
