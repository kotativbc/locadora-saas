import { Controller, Get } from '@nestjs/common';
import { AuditLogService } from '../common/audit-log.service';
import { RequirePermissions } from '../rbac/permissions.decorator';
import { PermissionCode } from '../rbac/rbac.constants';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequestUser } from '../auth/types';

@Controller('audit-logs')
@RequirePermissions(PermissionCode.AUDIT_VIEW)
export class AuditController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  findRecent(@CurrentUser() actor: RequestUser) {
    return this.auditLogService.findRecent(actor);
  }
}
