import { ConflictException, ForbiddenException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as fs from 'fs/promises';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/audit-log.service';
import { ownerDocumentsDir } from '../common/storage';
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

  /**
   * Exclusão definitiva. Bloqueada se o cliente tiver qualquer contrato (o banco
   * já recusaria de qualquer jeito — Contract.customerId é obrigatório e sem
   * cascata — mas aqui a gente confere antes e dá uma mensagem clara em vez de
   * deixar vazar um erro cru de constraint). Documentos anexados (CNH, etc.) são
   * apagados junto, banco e disco.
   */
  async remove(id: string, actor: RequestUser) {
    const customer = await this.findAndAssertSameCompany(id, actor);

    const contractCount = await this.prisma.contract.count({ where: { customerId: id } });
    if (contractCount > 0) {
      throw new BadRequestException(
        `Este cliente tem ${contractCount} contrato(s) vinculado(s) e não pode ser excluído — isso vale mesmo pra contratos em rascunho. Se for um cadastro de teste, exclua os contratos primeiro (só é possível excluir contrato que nunca foi assinado).`,
      );
    }

    await this.auditLog.record({
      action: 'customer.delete',
      userId: actor.id,
      companyId: actor.companyId,
      entityType: 'Customer',
      entityId: id,
      metadata: { name: customer.name, document: customer.document },
    });

    await this.prisma.customer.delete({ where: { id } });

    // Limpeza de arquivo é melhor-esforço — o dado já foi apagado do banco
    // (isso é o que importa de verdade); se sobrar lixo em disco, não trava a operação.
    if (actor.companyId) {
      await fs.rm(ownerDocumentsDir(actor.companyId, 'customers', id), { recursive: true, force: true }).catch(() => undefined);
    }

    return { deleted: true };
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
