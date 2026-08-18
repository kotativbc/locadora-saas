import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/audit-log.service';
import { JwtPayload } from './types';
import { PermissionCode } from '../rbac/rbac.constants';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_DAYS = 7;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditLog: AuditLogService,
  ) {}

  async login(email: string, password: string, ip?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
      },
    });

    // Mesma mensagem de erro tanto para e-mail inexistente quanto senha errada,
    // pra não revelar se um e-mail está cadastrado (enumeration).
    if (!user || !user.active) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    const passwordValid = await argon2.verify(user.passwordHash, password);
    if (!passwordValid) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    const roles = user.roles.map((ur) => ur.role.code);
    const permissions = Array.from(
      new Set(
        user.roles.flatMap((ur) => ur.role.permissions.map((rp) => rp.permission.code as PermissionCode)),
      ),
    );

    const payload: JwtPayload = {
      sub: user.id,
      name: user.name,
      email: user.email,
      companyId: user.companyId,
      roles,
      permissions,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: ACCESS_TOKEN_TTL });
    const refreshToken = await this.issueRefreshToken(user.id);

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await this.auditLog.record({
      action: 'auth.login',
      userId: user.id,
      companyId: user.companyId,
      ip,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        companyId: user.companyId,
        roles,
        permissions,
      },
    };
  }

  async refresh(rawToken: string, ip?: string) {
    const tokenHash = this.hashToken(rawToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
          },
        },
      },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date() || !stored.user.active) {
      throw new UnauthorizedException('Sessão expirada, faça login novamente.');
    }

    // Rotaciona o refresh token (revoga o antigo, emite um novo) — reduz o
    // impacto de um token roubado, já que só é válido por um uso.
    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });

    const user = stored.user;
    const roles = user.roles.map((ur) => ur.role.code);
    const permissions = Array.from(
      new Set(
        user.roles.flatMap((ur) => ur.role.permissions.map((rp) => rp.permission.code as PermissionCode)),
      ),
    );

    const payload: JwtPayload = { sub: user.id, name: user.name, email: user.email, companyId: user.companyId, roles, permissions };
    const accessToken = this.jwtService.sign(payload, { expiresIn: ACCESS_TOKEN_TTL });
    const newRefreshToken = await this.issueRefreshToken(user.id);

    await this.auditLog.record({ action: 'auth.refresh', userId: user.id, companyId: user.companyId, ip });

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(rawToken: string) {
    const tokenHash = this.hashToken(rawToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueRefreshToken(userId: string): Promise<string> {
    const rawToken = crypto.randomBytes(48).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    return rawToken;
  }

  private hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }
}
