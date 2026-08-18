import { SetMetadata } from '@nestjs/common';
import { PermissionCode } from './rbac.constants';

export const PERMISSIONS_KEY = 'requiredPermissions';

/**
 * Marca uma rota como exigindo uma ou mais permissões. O usuário precisa ter
 * pelo menos uma role que conceda TODAS as permissões listadas.
 */
export const RequirePermissions = (...permissions: PermissionCode[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
