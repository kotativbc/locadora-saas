/**
 * Papéis padrão da plataforma. SUPER_ADMIN não pertence a nenhuma empresa
 * (companyId nulo) — os demais sempre pertencem a uma empresa (tenant).
 */
export enum RoleCode {
  SUPER_ADMIN = 'SUPER_ADMIN',
  COMPANY_ADMIN = 'COMPANY_ADMIN',
  FLEET_MANAGER = 'FLEET_MANAGER',
  AGENT = 'AGENT',
  FINANCE = 'FINANCE',
  CLIENT = 'CLIENT',
}

/**
 * Permissões granulares checadas pelos guards. Módulos futuros (frota, contratos,
 * reservas etc.) vão adicionar suas próprias permissões aqui nas próximas fases.
 */
export enum PermissionCode {
  PLATFORM_MANAGE = 'platform.manage', // gerenciar a plataforma (empresas cadastradas)
  COMPANIES_MANAGE = 'companies.manage', // gerenciar a própria empresa (dados cadastrais)
  USERS_MANAGE = 'users.manage',
  FLEET_MANAGE = 'fleet.manage',
  RESERVATIONS_MANAGE = 'reservations.manage',
  CONTRACTS_MANAGE = 'contracts.manage',
  FINANCE_MANAGE = 'finance.manage',
  REPORTS_VIEW = 'reports.view',
  AUDIT_VIEW = 'audit.view',
}

export const ROLE_PERMISSIONS: Record<RoleCode, PermissionCode[]> = {
  [RoleCode.SUPER_ADMIN]: [PermissionCode.PLATFORM_MANAGE, PermissionCode.AUDIT_VIEW],
  [RoleCode.COMPANY_ADMIN]: [
    PermissionCode.COMPANIES_MANAGE,
    PermissionCode.USERS_MANAGE,
    PermissionCode.FLEET_MANAGE,
    PermissionCode.RESERVATIONS_MANAGE,
    PermissionCode.CONTRACTS_MANAGE,
    PermissionCode.FINANCE_MANAGE,
    PermissionCode.REPORTS_VIEW,
    PermissionCode.AUDIT_VIEW,
  ],
  [RoleCode.FLEET_MANAGER]: [PermissionCode.FLEET_MANAGE],
  [RoleCode.AGENT]: [PermissionCode.RESERVATIONS_MANAGE, PermissionCode.CONTRACTS_MANAGE],
  [RoleCode.FINANCE]: [PermissionCode.FINANCE_MANAGE, PermissionCode.REPORTS_VIEW],
  [RoleCode.CLIENT]: [],
};

export const PERMISSION_DESCRIPTIONS: Record<PermissionCode, string> = {
  [PermissionCode.PLATFORM_MANAGE]: 'Gerenciar empresas cadastradas na plataforma',
  [PermissionCode.COMPANIES_MANAGE]: 'Gerenciar dados cadastrais da própria empresa',
  [PermissionCode.USERS_MANAGE]: 'Gerenciar usuários da empresa',
  [PermissionCode.FLEET_MANAGE]: 'Gerenciar frota de veículos',
  [PermissionCode.RESERVATIONS_MANAGE]: 'Gerenciar reservas',
  [PermissionCode.CONTRACTS_MANAGE]: 'Gerenciar contratos',
  [PermissionCode.FINANCE_MANAGE]: 'Gerenciar financeiro gerencial',
  [PermissionCode.REPORTS_VIEW]: 'Visualizar relatórios',
  [PermissionCode.AUDIT_VIEW]: 'Visualizar trilha de auditoria',
};
