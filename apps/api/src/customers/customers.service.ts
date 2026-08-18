import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/audit-log.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { RequestUser } from '../auth/types';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async create(dto: CreateCustomerDto, actor: RequestUser) {
    if (!actor.companyId) {
      throw new ForbiddenException('Somente usuários de uma empresa podem cadastrar clientes.');
    }

    const existing = await this.prisma.customer.findUnique({
      where: { companyId_document: { companyId: actor.companyId, document: dto.document } },
    });
    if (existing) {
      throw new ConflictException('Já existe um cliente com este documento nesta empresa.');
    }

    const customer = await this.prisma.customer.create({
      data: {
        ...dto,
        companyId: actor.companyId,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        driverLicenseExpiry: dto.driverLicenseExpiry ? new Date(dto.driverLicenseExpiry) : undefined,
      },
    });

    await this.auditLog.record({
      action: 'customer.create',
      userId: actor.id,
      companyId: actor.companyId,
      entityType: 'Customer',
      entityId: customer.id,
    });

    return customer;
  }

  async findAll(actor: RequestUser) {
    if (!actor.companyId) return [];
    return this.prisma.customer.findMany({
      where: { companyId: actor.companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, actor: RequestUser) {
    return this.findAndAssertSameCompany(id, actor);
  }

  async update(id: string, dto: UpdateCustomerDto, actor: RequestUser) {
    await this.findAndAssertSameCompany(id, actor);

    const customer = await this.prisma.customer.update({
      where: { id },
      data: {
        ...dto,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        driverLicenseExpiry: dto.driverLicenseExpiry ? new Date(dto.driverLicenseExpiry) : undefined,
      },
    });

    await this.auditLog.record({
      action: 'customer.update',
      userId: actor.id,
      companyId: actor.companyId,
      entityType: 'Customer',
      entityId: id,
    });

    return customer;
  }

  private async findAndAssertSameCompany(id: string, actor: RequestUser) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      throw new NotFoundException('Cliente não encontrado.');
    }
    if (!actor.companyId || customer.companyId !== actor.companyId) {
      throw new ForbiddenException('Você não tem acesso a este cliente.');
    }
    return customer;
  }
}
