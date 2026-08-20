import { Controller, Get } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { RequirePermissions } from '../rbac/permissions.decorator';
import { PermissionCode } from '../rbac/rbac.constants';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequestUser } from '../auth/types';

@Controller('reports')
@RequirePermissions(PermissionCode.REPORTS_VIEW)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('financial-summary')
  getFinancialSummary(@CurrentUser() actor: RequestUser) {
    return this.reportsService.getFinancialSummary(actor);
  }

  /** Só Super Admin — sobrescreve a permissão da classe (REPORTS_VIEW), que o Super Admin não tem. */
  @Get('platform-growth')
  @RequirePermissions(PermissionCode.PLATFORM_MANAGE)
  getPlatformGrowth() {
    return this.reportsService.getPlatformGrowth();
  }
}
