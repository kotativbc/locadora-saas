import { GoneException, Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/audit-log.service';
import { ContractsService } from '../contracts/contracts.service';
import { ChargeGeneratorService } from '../finance/charge-generator.service';

function daysBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

@Injectable()
export class PublicSignaturesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly contractsService: ContractsService,
    private readonly chargeGenerator: ChargeGeneratorService,
  ) {}

  private async findValidSignature(token: string) {
    const signature = await this.prisma.contractSignature.findUnique({
      where: { token },
      include: {
        contract: { include: { company: true, customer: true, vehicle: true } },
      },
    });
    if (!signature) {
      throw new NotFoundException('Link de assinatura inválido.');
    }
    if (signature.signedAt) {
      throw new GoneException('Este contrato já foi assinado.');
    }
    if (signature.expiresAt < new Date()) {
      throw new GoneException('Este link de assinatura expirou. Peça um novo à locadora.');
    }
    return signature;
  }

  /** Detalhes seguros pra exibir na tela pública antes do aceite — sem dados internos. */
  async getPreview(token: string) {
    const signature = await this.findValidSignature(token);
    const c = signature.contract;

    return {
      companyName: c.company.tradeName ?? c.company.name,
      customerName: c.customer.name,
      vehicle: `${c.vehicle.brand} ${c.vehicle.model} — ${c.vehicle.plate}`,
      startDate: c.startDate,
      endDate: c.endDate,
      days: daysBetween(c.startDate, c.endDate),
      dailyRate: c.dailyRateSnapshot.toString(),
      totalValue: c.totalValue.toString(),
      expiresAt: signature.expiresAt,
    };
  }

  async getPdf(token: string): Promise<Buffer> {
    const signature = await this.findValidSignature(token);
    return this.contractsService.buildPdf(signature.contract.id);
  }

  async accept(token: string, ip: string | undefined, userAgent: string | undefined) {
    const signature = await this.findValidSignature(token);
    const c = signature.contract;

    // Hash dos termos exatamente como aceitos — permite verificar depois que
    // o contrato não foi alterado após a assinatura.
    const canonicalTerms = JSON.stringify({
      contractId: c.id,
      customerId: c.customerId,
      vehicleId: c.vehicleId,
      startDate: c.startDate.toISOString(),
      endDate: c.endDate.toISOString(),
      dailyRateSnapshot: c.dailyRateSnapshot.toString(),
      totalValue: c.totalValue.toString(),
    });
    const termsHash = crypto.createHash('sha256').update(canonicalTerms).digest('hex');
    const signedAt = new Date();

    await this.prisma.$transaction([
      this.prisma.contractSignature.update({
        where: { id: signature.id },
        data: { signedAt, termsHash, signerIp: ip, signerUserAgent: userAgent },
      }),
      this.prisma.contract.update({ where: { id: c.id }, data: { status: 'active' } }),
    ]);

    await this.auditLog.record({
      action: 'contract.signed',
      companyId: c.companyId,
      entityType: 'Contract',
      entityId: c.id,
      metadata: { termsHash, ip },
      ip,
    });

    // Lançamento financeiro do aluguel — nasce automaticamente na assinatura.
    await this.chargeGenerator.createAutoCharge({
      companyId: c.companyId,
      customerId: c.customerId,
      contractId: c.id,
      type: 'rental',
      description: `Locação — contrato ${c.id.slice(0, 8)}`,
      amount: c.totalValue.toString(),
      dueDate: c.endDate,
    });

    return { signedAt, termsHash };
  }
}
