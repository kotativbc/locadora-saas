import { JwtService } from '@nestjs/jwt';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/audit-log.service';
import { EmailAdapter } from '../email/email-adapter.interface';
import { PermissionCode } from '../rbac/rbac.constants';

/**
 * Testa o login com PrismaService mockado (sem banco de verdade) — cobre
 * exatamente os pontos que a auditoria de segurança verificou manualmente:
 * senha errada e e-mail inexistente devolvem a mesma mensagem (evita
 * enumeration), usuário inativo é barrado, empresa bloqueada é barrada, e as
 * permissões do token são a união correta dos papéis do usuário. Isso vira
 * rede de segurança pra não regressão silenciosa nessa lógica.
 */
describe('AuthService.login', () => {
  let prisma: { user: { findUnique: jest.Mock; update: jest.Mock } };
  let auditLog: { record: jest.Mock };
  let emailAdapter: EmailAdapter;
  let service: AuthService;

  const PASSWORD = 'senha-correta-123';
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await argon2.hash(PASSWORD);
  });

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue(undefined),
      },
    };
    auditLog = { record: jest.fn().mockResolvedValue(undefined) };
    emailAdapter = { send: jest.fn().mockResolvedValue({ sent: true }) };

    service = new AuthService(
      prisma as unknown as PrismaService,
      new JwtService({ secret: 'test-secret-only' }),
      { get: jest.fn(), getOrThrow: jest.fn() } as any,
      auditLog as unknown as AuditLogService,
      emailAdapter,
    );

    // usado só por issueRefreshToken, chamado depois de validar a senha
    (prisma as any).refreshToken = { create: jest.fn().mockResolvedValue(undefined) };
  });

  function fakeUser(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      id: 'user-1',
      email: 'samuel@example.com',
      passwordHash,
      active: true,
      companyId: 'company-1',
      name: 'Samuel',
      company: { status: 'active' },
      roles: [
        {
          role: {
            code: 'COMPANY_ADMIN',
            permissions: [
              { permission: { code: PermissionCode.FLEET_MANAGE } },
              { permission: { code: PermissionCode.CONTRACTS_MANAGE } },
            ],
          },
        },
        {
          // segundo papel repetindo uma permissão — testa a deduplicação
          role: {
            code: 'FINANCE',
            permissions: [{ permission: { code: PermissionCode.FLEET_MANAGE } }],
          },
        },
      ],
      ...overrides,
    };
  }

  it('rejeita e-mail inexistente com a mesma mensagem genérica de senha errada', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.login('naoexiste@example.com', 'qualquer')).rejects.toThrow(UnauthorizedException);
    await expect(service.login('naoexiste@example.com', 'qualquer')).rejects.toThrow('E-mail ou senha inválidos.');
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.login_failed', success: false }),
    );
  });

  it('rejeita senha errada com a mesma mensagem genérica de e-mail inexistente', async () => {
    prisma.user.findUnique.mockResolvedValue(fakeUser());

    await expect(service.login('samuel@example.com', 'senha-errada')).rejects.toThrow('E-mail ou senha inválidos.');
  });

  it('rejeita usuário inativo mesmo com a senha certa', async () => {
    prisma.user.findUnique.mockResolvedValue(fakeUser({ active: false }));

    await expect(service.login('samuel@example.com', PASSWORD)).rejects.toThrow(UnauthorizedException);
  });

  it('rejeita login se a empresa estiver suspensa/cancelada/arquivada/bloqueada', async () => {
    prisma.user.findUnique.mockResolvedValue(fakeUser({ company: { status: 'suspended' } }));

    await expect(service.login('samuel@example.com', PASSWORD)).rejects.toThrow(ForbiddenException);
  });

  it('aceita credenciais corretas e devolve a união deduplicada das permissões dos papéis', async () => {
    prisma.user.findUnique.mockResolvedValue(fakeUser());

    const result = await service.login('samuel@example.com', PASSWORD, '203.0.113.10');

    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.user.companyId).toBe('company-1');
    expect(result.user.roles.sort()).toEqual(['COMPANY_ADMIN', 'FINANCE'].sort());
    // FLEET_MANAGE aparece nos dois papéis mas só deve contar uma vez
    expect(result.user.permissions.sort()).toEqual(
      [PermissionCode.FLEET_MANAGE, PermissionCode.CONTRACTS_MANAGE].sort(),
    );
    expect(auditLog.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'auth.login' }));
  });
});
