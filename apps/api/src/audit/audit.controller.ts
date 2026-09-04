import { Controller, Get, Query } from '@nestjs/common';
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
  search(
    @CurrentUser() actor: RequestUser,
    @Query('companyId') companyId?: string,
    @Query('userSearch') userSearch?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('success') success?: string,
    @Query('ip') ip?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    // A permissão AUDIT_VIEW hoje só existe pro Super Admin (empresas não têm
    // mais acesso), então não precisa restringir por companyId aqui — quem
    // chegou até este endpoint já tem visão de plataforma inteira.
    return this.auditLogService.search({
      companyId: companyId || undefined,
      userSearch: userSearch || undefined,
      action: action || undefined,
      entityType: entityType || undefined,
      success: success === 'true' ? true : success === 'false' ? false : undefined,
      ip: ip || undefined,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get('actions')
  listActions() {
    return this.auditLogService.listDistinctActions();
  }
}
