import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/audit-log.service';
import { EMAIL_ADAPTER, EmailAdapter } from '../email/email-adapter.interface';

@Injectable()
export class PublicMaintenanceReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    @Inject(EMAIL_ADAPTER) private readonly emailAdapter: EmailAdapter,
  ) {}

  private async findContractByToken(token: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { maintenanceReportToken: token },
      include: { company: true, vehicle: true, customer: true },
    });
    if (!contract) {
      throw new NotFoundException('Link inválido.');
    }
    return contract;
  }

  /** Detalhes seguros pra confirmar que o cliente está no contrato certo, sem dado interno. */
  async getPreview(token: string) {
    const contract = await this.findContractByToken(token);
    return {
      companyName: contract.company.tradeName ?? contract.company.name,
      vehicle: `${contract.vehicle.brand} ${contract.vehicle.model} — ${contract.vehicle.plate}`,
    };
  }

  async submitReport(token: string, description: string) {
    const contract = await this.findContractByToken(token);

    const report = await this.prisma.maintenanceReport.create({
      data: {
        companyId: contract.companyId,
        contractId: contract.id,
        description,
        reportedByCustomer: true,
      },
    });

    await this.auditLog.record({
      action: 'contract.maintenance_report_submitted_by_customer',
      companyId: contract.companyId,
      entityType: 'MaintenanceReport',
      entityId: report.id,
    });

    // Avisa a empresa por e-mail, se ela tiver um canal de contato cadastrado.
    // Sem SMTP configurado, o LogEmailAdapter só registra — nunca quebra o fluxo do cliente.
    if (contract.company.contactEmail) {
      await this.emailAdapter.send({
        to: contract.company.contactEmail,
        subject: `[Rentovix] Cliente sinalizou um problema — ${contract.vehicle.plate}`,
        text: `${contract.customer.name} sinalizou algo sobre o veículo ${contract.vehicle.brand} ${contract.vehicle.model} (placa ${contract.vehicle.plate}), contrato ${contract.id.slice(0, 8)}:\n\n"${description}"\n\nAcesse o sistema para ver os detalhes.`,
        html: `<p><strong>${contract.customer.name}</strong> sinalizou algo sobre o veículo ${contract.vehicle.brand} ${contract.vehicle.model} (placa ${contract.vehicle.plate}), contrato ${contract.id.slice(0, 8)}:</p><blockquote>${description}</blockquote><p>Acesse o sistema para ver os detalhes.</p>`,
      });
    }

    return { received: true };
  }
}
