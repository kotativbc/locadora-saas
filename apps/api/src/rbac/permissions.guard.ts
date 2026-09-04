import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { PermissionCode } from './rbac.constants';
import { AuthenticatedRequest } from '../auth/types';
import { AuditLogService } from '../common/audit-log.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditLog: AuditLogService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<PermissionCode[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userPermissions = new Set(req.user?.permissions ?? []);

    // "Pelo menos uma" das permissões listadas — não "todas". Hoje nenhuma
    // rota exige mais de uma permissão ao mesmo tempo; isso existe pra
    // permitir "A ou B" (ex: dono da empresa OU Super Admin da plataforma).
    const hasAny = required.some((perm) => userPermissions.has(perm));
    if (!hasAny) {
      await this.auditLog.record({
        action: 'auth.access_denied',
        userId: req.user?.id,
        companyId: req.user?.companyId,
        metadata: { requiredPermissions: required, userPermissions: Array.from(userPermissions) },
        success: false,
      });
      throw new ForbiddenException('Você não tem permissão para executar esta ação.');
    }
    return true;
  }
}
