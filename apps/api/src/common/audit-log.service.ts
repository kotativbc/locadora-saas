import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequestContextService } from './request-context.service';
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
  success?: boolean; // default true — passe false pra registrar uma tentativa que falhou
}

export interface AuditFilters {
  companyId?: string;
  userSearch?: string; // nome ou e-mail (parcial)
  action?: string;
  entityType?: string;
  success?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  ip?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Registra eventos sensíveis (login, criação de empresa/usuário, mudanças de papel etc.).
 * Nunca lança erro para não derrubar a operação principal por falha de auditoria;
 * apenas loga no console/stderr para investigação manual.
 */
@Injectable()
export class AuditLogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
  ) {}

  async record(entry: AuditEntry): Promise<void> {
    try {
      const ctx = this.requestContext.get();
      await this.prisma.auditLog.create({
        data: {
          action: entry.action,
          companyId: entry.companyId ?? null,
          userId: entry.userId ?? null,
          entityType: entry.entityType,
          entityId: entry.entityId,
          metadata: entry.metadata as any,
          ip: entry.ip ?? ctx?.ip ?? null,
          userAgent: ctx?.userAgent ?? null,
          method: ctx?.method ?? null,
          path: ctx?.path ?? null,
          success: entry.success ?? true,
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

  /**
   * Busca com filtros detalhados — só pra Super Admin (o controller já trava
   * isso via permissão, mas aqui também não restringe por empresa, já que só
   * quem tem acesso de plataforma inteira chega até aqui).
   */
  async search(filters: AuditFilters) {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const pageSize = filters.pageSize && filters.pageSize > 0 && filters.pageSize <= 500 ? filters.pageSize : 100;

    const where: Record<string, unknown> = {};
    if (filters.companyId) where.companyId = filters.companyId;
    if (filters.userSearch) {
      where.user = {
        OR: [
          { name: { contains: filters.userSearch, mode: 'insensitive' } },
          { email: { contains: filters.userSearch, mode: 'insensitive' } },
        ],
      };
    }
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.success !== undefined) where.success = filters.success;
    if (filters.ip) where.ip = { contains: filters.ip };
    if (filters.action) where.action = { contains: filters.action };
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {
        ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
        ...(filters.dateTo ? { lte: filters.dateTo } : {}),
      };
    }

    const [total, entries] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { name: true, email: true } },
          company: { select: { name: true } },
        },
      }),
    ]);

    return { total, page, pageSize, entries };
  }

  /** Lista de valores distintos já usados em "action" — alimenta o filtro dropdown sem precisar manter uma lista fixa manualmente. */
  async listDistinctActions(): Promise<string[]> {
    const rows = await this.prisma.auditLog.findMany({
      distinct: ['action'],
      select: { action: true },
      orderBy: { action: 'asc' },
    });
    return rows.map((r: { action: string }) => r.action);
  }
}
