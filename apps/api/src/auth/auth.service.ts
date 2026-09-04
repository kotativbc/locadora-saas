import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/audit-log.service';
import { EMAIL_ADAPTER, EmailAdapter } from '../email/email-adapter.interface';
import { JwtPayload, RequestUser } from './types';
import { PermissionCode } from '../rbac/rbac.constants';
import { BLOCKING_COMPANY_STATUSES, COMPANY_STATUS_LABELS, CompanyStatus } from '../companies/company-status.constants';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_DAYS = 7;
const IMPERSONATION_TTL_MINUTES = 10;
const PASSWORD_RESET_TTL_MINUTES = 60;

// Permissões concedidas numa sessão de suporte: dá visibilidade completa da
// empresa (mesmo nível de um Admin da Empresa), mas o ImpersonationReadOnlyGuard
// bloqueia qualquer escrita antes mesmo de chegar na checagem de permissão.
const IMPERSONATION_PERMISSIONS: PermissionCode[] = [
  PermissionCode.COMPANIES_MANAGE,
  PermissionCode.USERS_MANAGE,
  PermissionCode.FLEET_MANAGE,
  PermissionCode.CUSTOMERS_MANAGE,
  PermissionCode.RATES_MANAGE,
  PermissionCode.RESERVATIONS_MANAGE,
  PermissionCode.CONTRACTS_MANAGE,
  PermissionCode.FINANCE_MANAGE,
  PermissionCode.REPORTS_VIEW,
  PermissionCode.AUDIT_VIEW,
];

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditLog: AuditLogService,
    @Inject(EMAIL_ADAPTER) private readonly emailAdapter: EmailAdapter,
  ) {}

  async login(email: string, password: string, ip?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
        company: { select: { status: true } },
      },
    });

    // Mesma mensagem de erro tanto para e-mail inexistente quanto senha errada,
    // pra não revelar se um e-mail está cadastrado (enumeration).
    if (!user || !user.active) {
      await this.auditLog.record({
        action: 'auth.login_failed',
        metadata: { email, reason: !user ? 'email_not_found' : 'user_inactive' },
        ip,
        success: false,
      });
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    const passwordValid = await argon2.verify(user.passwordHash, password);
    if (!passwordValid) {
      await this.auditLog.record({
        action: 'auth.login_failed',
        userId: user.id,
        companyId: user.companyId,
        metadata: { email, reason: 'wrong_password' },
        ip,
        success: false,
      });
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    try {
      this.assertCompanyAllowsAccess(user.company?.status);
    } catch (err) {
      await this.auditLog.record({
        action: 'auth.login_blocked',
        userId: user.id,
        companyId: user.companyId,
        metadata: { email, reason: 'company_access_blocked', companyStatus: user.company?.status },
        ip,
        success: false,
      });
      throw err;
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
            company: { select: { status: true } },
          },
        },
      },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date() || !stored.user.active) {
      throw new UnauthorizedException('Sessão expirada, faça login novamente.');
    }

    // Empresa pode ter sido suspensa/bloqueada depois que a sessão começou —
    // checa de novo a cada refresh, então o bloqueio vale em até 15 minutos
    // (duração do access token), não só no próximo login.
    this.assertCompanyAllowsAccess(stored.user.company?.status);

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

  /**
   * Sessão de suporte do Super Admin ("entrar como"). Não gera refresh token
   * — é um token curto (10min) e, se expirar, quem quiser continuar clica
   * de novo. `sub` continua sendo o Super Admin real (é ele quem aparece
   * como autor em qualquer tentativa de escrita bloqueada e na auditoria),
   * só o `companyId` muda pra o da empresa visualizada.
   */
  async createImpersonationSession(companyId: string, actor: RequestUser, ip?: string) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      throw new NotFoundException('Empresa não encontrada.');
    }

    const payload: JwtPayload = {
      sub: actor.id,
      name: actor.name,
      email: actor.email,
      companyId,
      roles: ['SUPPORT_VIEW'],
      permissions: IMPERSONATION_PERMISSIONS,
      impersonation: true,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: `${IMPERSONATION_TTL_MINUTES}m` });
    const expiresAt = new Date(Date.now() + IMPERSONATION_TTL_MINUTES * 60 * 1000);

    await this.auditLog.record({
      action: 'company.impersonation_started',
      userId: actor.id,
      companyId,
      entityType: 'Company',
      entityId: companyId,
      metadata: { ttlMinutes: IMPERSONATION_TTL_MINUTES },
      ip,
    });

    return { accessToken, companyName: company.name, expiresAt: expiresAt.toISOString() };
  }

  /**
   * Sempre responde com sucesso genérico, exista ou não o e-mail — evita
   * enumeration (alguém descobrir quais e-mails têm conta só testando aqui).
   * Se SMTP não estiver configurado, o LogEmailAdapter registra no log e o
   * fluxo segue normal (nunca quebra por falta de e-mail configurado).
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.active) {
      return;
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000);

    await this.prisma.passwordReset.create({ data: { userId: user.id, tokenHash, expiresAt } });

    const appUrl = this.configService.get<string>('PUBLIC_APP_URL') ?? '';
    const resetUrl = `${appUrl}/redefinir-senha/${rawToken}`;

    await this.emailAdapter.send({
      to: user.email,
      subject: 'Redefinição de senha — Rentovix',
      text: `Recebemos um pedido para redefinir sua senha na Rentovix.\n\nAcesse o link abaixo pra criar uma nova senha (válido por 1 hora):\n${resetUrl}\n\nSe você não pediu isso, pode ignorar este e-mail — sua senha continua a mesma.`,
      html: `<p>Recebemos um pedido para redefinir sua senha na Rentovix.</p><p><a href="${resetUrl}">Clique aqui para criar uma nova senha</a> (link válido por 1 hora).</p><p>Se você não pediu isso, pode ignorar este e-mail — sua senha continua a mesma.</p>`,
    });

    await this.auditLog.record({
      action: 'auth.password_reset_requested',
      userId: user.id,
      companyId: user.companyId,
    });
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    const reset = await this.prisma.passwordReset.findUnique({ where: { tokenHash } });

    if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
      throw new BadRequestException('Link de redefinição inválido ou expirado. Peça um novo link.');
    }

    const passwordHash = await argon2.hash(newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: reset.userId }, data: { passwordHash } }),
      this.prisma.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
      // Redefinir a senha derruba todas as sessões ativas — se alguém mais
      // tinha acesso indevido, perde o acesso na hora.
      this.prisma.refreshToken.updateMany({
        where: { userId: reset.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    const user = await this.prisma.user.findUnique({ where: { id: reset.userId } });
    await this.auditLog.record({
      action: 'auth.password_reset_completed',
      userId: reset.userId,
      companyId: user?.companyId,
    });
  }

  /** Usuário de plataforma (sem empresa, ex: Super Admin) não passa por essa checagem. */
  private assertCompanyAllowsAccess(companyStatus: string | undefined) {
    if (!companyStatus) return;
    if (BLOCKING_COMPANY_STATUSES.has(companyStatus as CompanyStatus)) {
      const label = COMPANY_STATUS_LABELS[companyStatus as CompanyStatus] ?? companyStatus;
      throw new ForbiddenException(
        `O acesso desta empresa está bloqueado (status: ${label}). Fale com o administrador da plataforma.`,
      );
    }
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
