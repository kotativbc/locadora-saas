import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { TrackingService } from './tracking.service';
import { RecordPositionDto } from './dto/record-position.dto';
import { RequirePermissions } from '../rbac/permissions.decorator';
import { PermissionCode } from '../rbac/rbac.constants';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequestUser } from '../auth/types';

@Controller('tracking')
@RequirePermissions(PermissionCode.FLEET_MANAGE)
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Post('positions')
  recordPosition(@Body() dto: RecordPositionDto, @CurrentUser() actor: RequestUser) {
    return this.trackingService.recordManualPosition(dto, actor);
  }

  @Get('fleet')
  getLatestForFleet(@CurrentUser() actor: RequestUser) {
    return this.trackingService.getLatestForFleet(actor);
  }

  @Get('vehicles/:vehicleId/latest')
  getLatestPosition(@Param('vehicleId') vehicleId: string, @CurrentUser() actor: RequestUser) {
    return this.trackingService.getLatestPosition(vehicleId, actor);
  }

  @Get('vehicles/:vehicleId/history')
  getHistory(@Param('vehicleId') vehicleId: string, @CurrentUser() actor: RequestUser) {
    return this.trackingService.getHistory(vehicleId, actor);
  }
}
