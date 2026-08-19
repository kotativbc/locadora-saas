import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequestUser } from '../auth/types';
import { RoleCode } from '../rbac/rbac.constants';

interface AuditEntry {
  action: string;
  companyId?: string | null;
  userId?: string | null;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
}

/**
 * Registra eventos sensíveis (login, criação de empresa/usuário, mudanças de papel etc.).
 * Nunca lança erro para não derrubar a operação principal por falha de auditoria;
 * apenas loga no console/stderr para investigação manual.
 */
@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: entry.action,
          companyId: entry.companyId ?? null,
          userId: entry.userId ?? null,
          entityType: entry.entityType,
          entityId: entry.entityId,
          metadata: entry.metadata as any,
          ip: entry.ip,
        },
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[audit-log] falha ao gravar evento de auditoria', entry.action, err);
    }
  }

  /**
   * Super Admin (sem empresa) vê o log de toda a plataforma; qualquer outro
   * usuário só vê o log da própria empresa — nunca de outra.
   */
  async findRecent(actor: RequestUser, limit = 200) {
    const isSuperAdmin = actor.roles.includes(RoleCode.SUPER_ADMIN);
    if (!isSuperAdmin && !actor.companyId) {
      return [];
    }

    return this.prisma.auditLog.findMany({
      where: isSuperAdmin ? {} : { companyId: actor.companyId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { name: true, email: true } },
        company: { select: { name: true } },
      },
    });
  }
}
