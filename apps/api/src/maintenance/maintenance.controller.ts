import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import { RequirePermissions } from '../rbac/permissions.decorator';
import { PermissionCode } from '../rbac/rbac.constants';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequestUser } from '../auth/types';

@Controller('maintenance')
@RequirePermissions(PermissionCode.FLEET_MANAGE)
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post()
  create(@Body() dto: CreateMaintenanceDto, @CurrentUser() actor: RequestUser) {
    return this.maintenanceService.create(dto, actor);
  }

  @Get()
  findAll(@CurrentUser() actor: RequestUser) {
    return this.maintenanceService.findAll(actor);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMaintenanceDto, @CurrentUser() actor: RequestUser) {
    return this.maintenanceService.update(id, dto, actor);
  }
}
