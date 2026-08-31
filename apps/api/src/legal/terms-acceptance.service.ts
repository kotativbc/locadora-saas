import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/audit-log.service';
import { RequestUser } from '../auth/types';
import { CURRENT_TERMS_VERSION } from './terms-version';

@Injectable()
export class TermsAcceptanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  /** Usuário de plataforma (sem empresa) não tem Termos de Contratante pra aceitar. */
  async getStatus(actor: RequestUser) {
    if (!actor.companyId) {
      return { applicable: false, accepted: true, currentVersion: CURRENT_TERMS_VERSION };
    }

    const latest = await this.prisma.termsAcceptance.findFirst({
      where: { companyId: actor.companyId, documentType: 'terms_dpa' },
      orderBy: { acceptedAt: 'desc' },
    });

    return {
      applicable: true,
      accepted: latest?.version === CURRENT_TERMS_VERSION,
      currentVersion: CURRENT_TERMS_VERSION,
      lastAcceptedVersion: latest?.version ?? null,
      lastAcceptedAt: latest?.acceptedAt ?? null,
    };
  }

  async accept(actor: RequestUser, ip: string | undefined) {
    if (!actor.companyId) {
      throw new ForbiddenException('Usuário de plataforma não representa uma empresa contratante.');
    }

    const record = await this.prisma.termsAcceptance.create({
      data: {
        companyId: actor.companyId,
        userId: actor.id,
        documentType: 'terms_dpa',
        version: CURRENT_TERMS_VERSION,
        ip,
      },
    });

    await this.auditLog.record({
      action: 'terms.accepted',
      userId: actor.id,
      companyId: actor.companyId,
      entityType: 'TermsAcceptance',
      entityId: record.id,
      metadata: { version: CURRENT_TERMS_VERSION },
      ip,
    });

    return { accepted: true, version: CURRENT_TERMS_VERSION };
  }
}
