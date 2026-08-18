import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/audit-log.service';
import { CreateClaimDto } from './dto/create-claim.dto';
import { UpdateClaimDto } from './dto/update-claim.dto';
import { RequestUser } from '../auth/types';

@Injectable()
export class ClaimsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async create(dto: CreateClaimDto, actor: RequestUser) {
    if (!actor.companyId) {
      throw new ForbiddenException('Somente usuários de uma empresa podem registrar sinistros.');
    }

    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: dto.vehicleId } });
    if (!vehicle || vehicle.companyId !== actor.companyId) {
      throw new NotFoundException('Veículo não encontrado nesta empresa.');
    }

    const claim = await this.prisma.claim.create({
      data: {
        companyId: actor.companyId,
        vehicleId: dto.vehicleId,
        contractId: dto.contractId,
        type: dto.type,
        occurredAt: new Date(dto.occurredAt),
        location: dto.location,
        description: dto.description,
        policeReportNumber: dto.policeReportNumber,
        thirdPartyInvolved: dto.thirdPartyInvolved ?? false,
        thirdPartyDescription: dto.thirdPartyDescription,
        insuranceClaimNumber: dto.insuranceClaimNumber,
        estimatedCost: dto.estimatedCost,
        createdByUserId: actor.id,
      },
    });

    await this.auditLog.record({
      action: 'claim.create',
      userId: actor.id,
      companyId: actor.companyId,
      entityType: 'Claim',
      entityId: claim.id,
    });

    return claim;
  }

  async findAll(actor: RequestUser) {
    if (!actor.companyId) return [];
    return this.prisma.claim.findMany({
      where: { companyId: actor.companyId },
      orderBy: { occurredAt: 'desc' },
      include: { vehicle: { select: { plate: true, brand: true, model: true } } },
    });
  }

  async update(id: string, dto: UpdateClaimDto, actor: RequestUser) {
    const claim = await this.prisma.claim.findUnique({ where: { id } });
    if (!claim) {
      throw new NotFoundException('Sinistro não encontrado.');
    }
    if (!actor.companyId || claim.companyId !== actor.companyId) {
      throw new ForbiddenException('Você não tem acesso a este sinistro.');
    }

    const updated = await this.prisma.claim.update({ where: { id }, data: dto });

    await this.auditLog.record({
      action: 'claim.update',
      userId: actor.id,
      companyId: actor.companyId,
      entityType: 'Claim',
      entityId: id,
      metadata: dto as Record<string, unknown>,
    });

    return updated;
  }
}
