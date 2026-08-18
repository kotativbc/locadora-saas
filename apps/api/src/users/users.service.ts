import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/audit-log.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RequestUser } from '../auth/types';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async create(dto: CreateUserDto, actor: RequestUser) {
    if (!actor.companyId) {
      throw new ForbiddenException('Usuários de plataforma não gerenciam usuários de empresa por aqui.');
    }

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Já existe um usuário com este e-mail.');
    }

    const role = await this.prisma.role.findUniqueOrThrow({ where: { code: dto.roleCode } });
    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        companyId: actor.companyId,
        name: dto.name,
        email: dto.email,
        passwordHash,
        roles: { create: { roleId: role.id } },
      },
      select: { id: true, name: true, email: true, active: true, createdAt: true },
    });

    await this.auditLog.record({
      action: 'user.create',
      userId: actor.id,
      companyId: actor.companyId,
      entityType: 'User',
      entityId: user.id,
      metadata: { roleCode: dto.roleCode },
    });

    return user;
  }

  async findAll(actor: RequestUser) {
    if (!actor.companyId) {
      throw new ForbiddenException('Informe uma empresa para listar usuários.');
    }
    return this.prisma.user.findMany({
      where: { companyId: actor.companyId },
      select: {
        id: true,
        name: true,
        email: true,
        active: true,
        lastLoginAt: true,
        createdAt: true,
        roles: { select: { role: { select: { code: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, dto: UpdateUserDto, actor: RequestUser) {
    const user = await this.findAndAssertSameCompany(id, actor);

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: dto,
      select: { id: true, name: true, email: true, active: true },
    });

    await this.auditLog.record({
      action: 'user.update',
      userId: actor.id,
      companyId: actor.companyId,
      entityType: 'User',
      entityId: id,
      metadata: dto as Record<string, unknown>,
    });

    return updated;
  }

  private async findAndAssertSameCompany(id: string, actor: RequestUser) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }
    if (!actor.companyId || user.companyId !== actor.companyId) {
      throw new ForbiddenException('Você não tem acesso a este usuário.');
    }
    return user;
  }
}
