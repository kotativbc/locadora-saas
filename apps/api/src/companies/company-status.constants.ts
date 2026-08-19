export enum CompanyStatus {
  PENDING = 'pending',
  TRIAL = 'trial',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
  ARCHIVED = 'archived',
  SECURITY_BLOCKED = 'security_blocked',
}

export const COMPANY_STATUS_LABELS: Record<CompanyStatus, string> = {
  [CompanyStatus.PENDING]: 'Pendente',
  [CompanyStatus.TRIAL]: 'Em teste',
  [CompanyStatus.ACTIVE]: 'Ativa',
  [CompanyStatus.PAST_DUE]: 'Em atraso',
  [CompanyStatus.SUSPENDED]: 'Suspensa',
  [CompanyStatus.CANCELLED]: 'Cancelada',
  [CompanyStatus.ARCHIVED]: 'Arquivada',
  [CompanyStatus.SECURITY_BLOCKED]: 'Bloqueada por segurança',
};

/** Estados em que os usuários dessa empresa NÃO conseguem logar. */
export const BLOCKING_COMPANY_STATUSES = new Set<CompanyStatus>([
  CompanyStatus.SUSPENDED,
  CompanyStatus.CANCELLED,
  CompanyStatus.ARCHIVED,
  CompanyStatus.SECURITY_BLOCKED,
]);

/** Estados que exigem justificativa obrigatória pra chegar neles. */
export const REASON_REQUIRED_STATUSES = new Set<CompanyStatus>([
  CompanyStatus.SUSPENDED,
  CompanyStatus.CANCELLED,
  CompanyStatus.SECURITY_BLOCKED,
]);

/** Transições válidas — de qual estado pode ir pra quais outros. Única fonte de verdade. */
export const VALID_STATUS_TRANSITIONS: Record<CompanyStatus, CompanyStatus[]> = {
  [CompanyStatus.PENDING]: [CompanyStatus.TRIAL, CompanyStatus.ACTIVE, CompanyStatus.CANCELLED],
  [CompanyStatus.TRIAL]: [CompanyStatus.ACTIVE, CompanyStatus.SUSPENDED, CompanyStatus.CANCELLED],
  [CompanyStatus.ACTIVE]: [
    CompanyStatus.PAST_DUE,
    CompanyStatus.SUSPENDED,
    CompanyStatus.CANCELLED,
    CompanyStatus.SECURITY_BLOCKED,
  ],
  [CompanyStatus.PAST_DUE]: [CompanyStatus.ACTIVE, CompanyStatus.SUSPENDED, CompanyStatus.CANCELLED],
  [CompanyStatus.SUSPENDED]: [CompanyStatus.ACTIVE, CompanyStatus.CANCELLED, CompanyStatus.ARCHIVED],
  [CompanyStatus.CANCELLED]: [CompanyStatus.ARCHIVED, CompanyStatus.ACTIVE],
  [CompanyStatus.ARCHIVED]: [CompanyStatus.ACTIVE],
  [CompanyStatus.SECURITY_BLOCKED]: [CompanyStatus.ACTIVE, CompanyStatus.SUSPENDED],
};

export function isValidStatusTransition(from: CompanyStatus, to: CompanyStatus): boolean {
  if (from === to) return false;
  return VALID_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}
