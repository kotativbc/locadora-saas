import { useState, type FormEvent } from 'react';
import { api, ApiError } from '../api';
import type { BadgeVariant } from './StatusBadge';

export const COMPANY_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  trial: 'Em teste',
  active: 'Ativa',
  past_due: 'Em atraso',
  suspended: 'Suspensa',
  cancelled: 'Cancelada',
  archived: 'Arquivada',
  security_blocked: 'Bloqueada por segurança',
};

export const COMPANY_STATUS_VARIANT: Record<string, BadgeVariant> = {
  pending: 'neutral',
  trial: 'info',
  active: 'success',
  past_due: 'warning',
  suspended: 'danger',
  cancelled: 'danger',
  archived: 'neutral',
  security_blocked: 'danger',
};

const REASON_REQUIRED = new Set(['suspended', 'cancelled', 'security_blocked']);

export function ChangeCompanyStatusForm({
  companyId,
  companyName,
  currentStatus,
  onDone,
  onCancel,
}: {
  companyId: string;
  companyName: string;
  currentStatus: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post(`/companies/${companyId}/status`, { status, reason: reason || undefined });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao mudar o estado da empresa.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card" style={{ borderColor: 'var(--accent)' }} onSubmit={handleSubmit}>
      <h3 style={{ marginTop: 0 }}>Mudar estado — {companyName}</h3>
      <p style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: -8 }}>
        Estado atual: {COMPANY_STATUS_LABELS[currentStatus] ?? currentStatus}
      </p>
      {error && <div className="error-banner">{error}</div>}
      <div className="field">
        <label>Novo estado</label>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {Object.entries(COMPANY_STATUS_LABELS).map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Motivo {REASON_REQUIRED.has(status) ? '(obrigatório para este estado)' : '(opcional)'}</label>
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex: pagamento em atraso há 30 dias" />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? 'Salvando...' : 'Confirmar mudança'}
        </button>
        <button type="button" className="logout-btn" style={{ color: 'var(--ink-muted)', borderColor: 'var(--border)' }} onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
