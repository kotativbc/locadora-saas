import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/audit-log.service';

interface AutoChargeInput {
  companyId: string;
  customerId?: string | null;
  contractId?: string | null;
  type: 'rental' | 'damage' | 'fine' | 'other';
  description: string;
  amount: string;
  dueDate?: Date | null;
}

/**
 * Não tem controller próprio — é usado internamente por ContractsService
 * (aluguel), DamagesService e FinesService (quando marcados "cobrar do
 * cliente") pra criar o lançamento financeiro correspondente automaticamente.
 */
@Injectable()
export class ChargeGeneratorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async createAutoCharge(input: AutoChargeInput) {
    const charge = await this.prisma.charge.create({
      data: {
        companyId: input.companyId,
        customerId: input.customerId ?? undefined,
        contractId: input.contractId ?? undefined,
        type: input.type,
        description: input.description,
        amount: input.amount,
        dueDate: input.dueDate ?? undefined,
      },
    });

    await this.auditLog.record({
      action: 'charge.auto_created',
      companyId: input.companyId,
      entityType: 'Charge',
      entityId: charge.id,
      metadata: { type: input.type, amount: input.amount },
    });

    return charge;
  }
}
