import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TrackingAdapter, VehiclePositionResult } from './tracking-adapter.interface';

@Injectable()
export class ManualTrackingAdapter implements TrackingAdapter {
  constructor(private readonly prisma: PrismaService) {}

  async getLatestPosition(vehicleId: string): Promise<VehiclePositionResult | null> {
    const position = await this.prisma.vehiclePosition.findFirst({
      where: { vehicleId },
      orderBy: { recordedAt: 'desc' },
    });
    if (!position) return null;
    return this.toResult(position);
  }

  async getHistory(vehicleId: string, limit = 20): Promise<VehiclePositionResult[]> {
    const positions = await this.prisma.vehiclePosition.findMany({
      where: { vehicleId },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });
    return positions.map((p) => this.toResult(p));
  }

  private toResult(p: {
    latitude: unknown;
    longitude: unknown;
    locationText: string | null;
    recordedAt: Date;
    source: string;
  }): VehiclePositionResult {
    return {
      latitude: p.latitude !== null ? Number(p.latitude) : null,
      longitude: p.longitude !== null ? Number(p.longitude) : null,
      locationText: p.locationText,
      recordedAt: p.recordedAt,
      source: p.source,
    };
  }
}
