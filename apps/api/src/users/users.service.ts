import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/audit-log.service';
import { PlanLimitsService } from '../plans/plan-limits.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RequestUser } from '../auth/types';

const USER_LIST_SELECT = {
  id: true,
  name: true,
  email: true,
  active: true,
  lastLoginAt: true,
  createdAt: true,
  roles: { select: { role: { select: { code: true, name: true } } } },
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly planLimits: PlanLimitsService,
  ) {}

  async create(dto: CreateUserDto, actor: RequestUser) {
    if (!actor.companyId) {
      throw new ForbiddenException('Usuários de plataforma não gerenciam usuários de empresa por aqui.');
    }

    await this.planLimits.assertCanAddUser(actor.companyId);

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
      select: USER_LIST_SELECT,
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

  // ---------- Suporte: Super Admin agindo sobre usuários de QUALQUER empresa ----------
  // Métodos separados de propósito (não reaproveitam findAndAssertSameCompany) — aqui
  // o "dono" da ação é a plataforma, não a própria empresa, então o controller já
  // restringe isso a quem tem platform.manage antes mesmo de chegar aqui.

  async findAllForCompany(companyId: string) {
    return this.prisma.user.findMany({
      where: { companyId },
      select: USER_LIST_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async setActiveForSupport(companyId: string, userId: string, active: boolean, actor: RequestUser) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.companyId !== companyId) {
      throw new NotFoundException('Usuário não encontrado nesta empresa.');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { active },
      select: { id: true, name: true, email: true, active: true },
    });

    // Desativar alguém não pode deixar sessões antigas ainda válidas rodando.
    if (!active) {
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    await this.auditLog.record({
      action: active ? 'user.support_reactivate' : 'user.support_deactivate',
      userId: actor.id,
      companyId,
      entityType: 'User',
      entityId: userId,
    });

    return updated;
  }

  /** Gera uma senha temporária, devolve em texto puro só nesta resposta (nunca fica em log). */
  async resetPasswordForSupport(companyId: string, userId: string, actor: RequestUser) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.companyId !== companyId) {
      throw new NotFoundException('Usuário não encontrado nesta empresa.');
    }

    const tempPassword = crypto.randomBytes(9).toString('base64url'); // ~12 caracteres, url-safe
    const passwordHash = await argon2.hash(tempPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await this.auditLog.record({
      action: 'user.support_password_reset',
      userId: actor.id,
      companyId,
      entityType: 'User',
      entityId: userId,
      // nunca a senha em si — só o fato de que foi resetada
    });

    return { tempPassword };
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
