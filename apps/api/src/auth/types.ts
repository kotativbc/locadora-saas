import { Request } from 'express';
import { PermissionCode } from '../rbac/rbac.constants';

export interface JwtPayload {
  sub: string; // user id
  name: string;
  email: string;
  companyId: string | null;
  roles: string[];
  permissions: PermissionCode[];
  impersonation?: boolean; // sessão de suporte do Super Admin — somente leitura, bloqueado no guard
}

export interface RequestUser {
  id: string;
  name: string;
  email: string;
  companyId: string | null;
  roles: string[];
  permissions: PermissionCode[];
  impersonation?: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: RequestUser;
}
