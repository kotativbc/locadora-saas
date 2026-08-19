import { Controller, Get } from '@nestjs/common';
import { BackupsService } from './backups.service';
import { RequirePermissions } from '../rbac/permissions.decorator';
import { PermissionCode } from '../rbac/rbac.constants';

@Controller('backups')
@RequirePermissions(PermissionCode.PLATFORM_MANAGE)
export class BackupsController {
  constructor(private readonly backupsService: BackupsService) {}

  @Get('status')
  getStatus() {
    return this.backupsService.getStatus();
  }
}
