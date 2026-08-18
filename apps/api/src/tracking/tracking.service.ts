import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/audit-log.service';
import { RecordPositionDto } from './dto/record-position.dto';
import { TRACKING_ADAPTER, TrackingAdapter } from './tracking-adapter.interface';
import { RequestUser } from '../auth/types';

@Injectable()
export class TrackingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    @Inject(TRACKING_ADAPTER) private readonly adapter: TrackingAdapter,
  ) {}

  /** Registro manual — só faz sentido no modo manual; adapters reais escrevem direto no armazenamento deles. */
  async recordManualPosition(dto: RecordPositionDto, actor: RequestUser) {
    if (!actor.companyId) {
      throw new ForbiddenException('Somente usuários de uma empresa podem registrar posição.');
    }
    if (!dto.locationText && (dto.latitude === undefined || dto.longitude === undefined)) {
      throw new BadRequestException('Informe coordenadas (latitude/longitude) ou uma descrição do local.');
    }

    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: dto.vehicleId } });
    if (!vehicle || vehicle.companyId !== actor.companyId) {
      throw new NotFoundException('Veículo não encontrado nesta empresa.');
    }

    const position = await this.prisma.vehiclePosition.create({
      data: {
        companyId: actor.companyId,
        vehicleId: dto.vehicleId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        locationText: dto.locationText,
        source: 'manual',
        recordedByUserId: actor.id,
      },
    });

    await this.auditLog.record({
      action: 'tracking.position_recorded',
      userId: actor.id,
      companyId: actor.companyId,
      entityType: 'Vehicle',
      entityId: dto.vehicleId,
      metadata: { positionId: position.id },
    });

    return position;
  }

  async getLatestPosition(vehicleId: string, actor: RequestUser) {
    await this.assertVehicleInCompany(vehicleId, actor);
    return this.adapter.getLatestPosition(vehicleId);
  }

  async getHistory(vehicleId: string, actor: RequestUser) {
    await this.assertVehicleInCompany(vehicleId, actor);
    return this.adapter.getHistory(vehicleId);
  }

  async getLatestForFleet(actor: RequestUser) {
    if (!actor.companyId) return [];
    const vehicles = await this.prisma.vehicle.findMany({
      where: { companyId: actor.companyId },
      select: { id: true, plate: true, brand: true, model: true },
    });
    const results = await Promise.all(
      vehicles.map(async (v) => ({
        vehicle: v,
        position: await this.adapter.getLatestPosition(v.id),
      })),
    );
    return results;
  }

  private async assertVehicleInCompany(vehicleId: string, actor: RequestUser) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle || !actor.companyId || vehicle.companyId !== actor.companyId) {
      throw new NotFoundException('Veículo não encontrado nesta empresa.');
    }
  }
}
