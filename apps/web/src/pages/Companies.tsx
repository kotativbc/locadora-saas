import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '../api';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge, type BadgeVariant } from '../components/StatusBadge';

interface Company {
  id: string;
  name: string;
  tradeName: string | null;
  cnpj: string | null;
  status: string;
  statusReason: string | null;
  createdAt: string;
}

interface StatusEvent {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  reason: string | null;
  createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  trial: 'Em teste',
  active: 'Ativa',
  past_due: 'Em atraso',
  suspended: 'Suspensa',
  cancelled: 'Cancelada',
  archived: 'Arquivada',
  security_blocked: 'Bloqueada por segurança',
};

const STATUS_VARIANT: Record<string, BadgeVariant> = {
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

export function Companies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<Company | null>(null);
  const [historyTarget, setHistoryTarget] = useState<Company | null>(null);
  const [history, setHistory] = useState<StatusEvent[]>([]);

  async function load() {
    setLoading(true);
    try {
      setCompanies(await api.get<Company[]>('/companies'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar empresas.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleShowHistory(company: Company) {
    setHistoryTarget(company);
    try {
      setHistory(await api.get<StatusEvent[]>(`/companies/${company.id}/status-history`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar histórico.');
    }
  }

  const activeCount = companies.filter((c) => c.status === 'active').length;
  const blockedCount = companies.filter((c) => ['suspended', 'cancelled', 'archived', 'security_blocked'].includes(c.status)).length;

  return (
    <div>
      <div className="page-header">
        <h1>Empresas cadastradas</h1>
        <div className="page-header__rule" />
      </div>

      {error && <div className="error-banner">{error}</div>}

      {!loading && companies.length > 0 && (
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-card__label">Empresas na plataforma</div>
            <div className="kpi-card__value">{companies.length}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-card__label">Ativas</div>
            <div className="kpi-card__value kpi-card__value--success">{activeCount}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-card__label">Bloqueadas (qualquer motivo)</div>
            <div className="kpi-card__value kpi-card__value--danger">{blockedCount}</div>
          </div>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <strong>{companies.length} empresa(s)</strong>
          <button className="btn btn--accent" onClick={() => setFormOpen((v) => !v)}>
            {formOpen ? 'Cancelar' : '+ Nova empresa'}
          </button>
        </div>

        {loading ? (
          <p>Carregando...</p>
        ) : companies.length === 0 ? (
          <EmptyState title="Nenhuma empresa cadastrada" body="Cadastre a primeira empresa locadora pra começar a usar a plataforma." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>CNPJ</th>
                <th>Status</th>
                <th>Criada em</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.cnpj ? <span className="plate">{c.cnpj}</span> : '—'}</td>
                  <td>
                    <StatusBadge label={STATUS_LABELS[c.status] ?? c.status} variant={STATUS_VARIANT[c.status] ?? 'neutral'} />
                    {c.statusReason && (
                      <div style={{ fontSize: 11, color: 'var(--rtv-ink-400)', marginTop: 3 }}>{c.statusReason}</div>
                    )}
                  </td>
                  <td>{new Date(c.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      className="logout-btn"
                      style={{ color: 'var(--rtv-navy-900)', borderColor: 'var(--rtv-line-strong)' }}
                      onClick={() => setStatusTarget(c)}
                    >
                      Mudar estado
                    </button>
                    <button
                      className="logout-btn"
                      style={{ color: 'var(--rtv-navy-900)', borderColor: 'var(--rtv-line-strong)' }}
                      onClick={() => handleShowHistory(c)}
                    >
                      Histórico
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {statusTarget && (
        <ChangeStatusForm
          company={statusTarget}
          onDone={() => {
            setStatusTarget(null);
            load();
          }}
          onCancel={() => setStatusTarget(null)}
        />
      )}

      {historyTarget && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <strong>Histórico — {historyTarget.name}</strong>
            <button className="logout-btn" style={{ color: 'var(--ink-muted)', borderColor: 'var(--border)' }} onClick={() => setHistoryTarget(null)}>
              Fechar
            </button>
          </div>
          {history.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-muted)' }}>Sem mudanças de estado registradas.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>De</th>
                  <th>Para</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td>{new Date(h.createdAt).toLocaleString('pt-BR')}</td>
                    <td>{h.fromStatus ? STATUS_LABELS[h.fromStatus] ?? h.fromStatus : '—'}</td>
                    <td>{STATUS_LABELS[h.toStatus] ?? h.toStatus}</td>
                    <td>{h.reason ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {formOpen && <NewCompanyForm onCreated={() => { setFormOpen(false); load(); }} />}
    </div>
  );
}

function ChangeStatusForm({ company, onDone, onCancel }: { company: Company; onDone: () => void; onCancel: () => void }) {
  const [status, setStatus] = useState(company.status);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post(`/companies/${company.id}/status`, { status, reason: reason || undefined });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao mudar o estado da empresa.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card" style={{ borderColor: 'var(--accent)' }} onSubmit={handleSubmit}>
      <h3 style={{ marginTop: 0 }}>Mudar estado — {company.name}</h3>
      <p style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: -8 }}>
        Estado atual: {STATUS_LABELS[company.status] ?? company.status}
      </p>
      {error && <div className="error-banner">{error}</div>}
      <div className="field">
        <label>Novo estado</label>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {Object.entries(STATUS_LABELS).map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>
          Motivo {REASON_REQUIRED.has(status) ? '(obrigatório para este estado)' : '(opcional)'}
        </label>
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

function NewCompanyForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/companies', {
        name,
        tradeName: tradeName || undefined,
        cnpj: cnpj || undefined,
        adminName,
        adminEmail,
        adminPassword,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao criar empresa.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h3 style={{ marginTop: 0 }}>Nova empresa</h3>
      {error && <div className="error-banner">{error}</div>}
      <div className="field-group">
        <div className="field-group__label">Dados da empresa</div>
        <div className="field">
          <label>Razão social</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label>Nome fantasia (opcional)</label>
          <input value={tradeName} onChange={(e) => setTradeName(e.target.value)} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>CNPJ (opcional)</label>
          <input value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
        </div>
      </div>
      <div className="field-group">
        <div className="field-group__label">Administrador inicial desta empresa</div>
        <div className="field">
          <label>Nome do admin</label>
          <input required value={adminName} onChange={(e) => setAdminName(e.target.value)} />
        </div>
        <div className="field">
          <label>E-mail do admin</label>
          <input required type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Senha inicial</label>
          <input
            required
            type="password"
            minLength={8}
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
          />
        </div>
      </div>
      <p style={{ fontSize: 12, color: 'var(--ink-muted)' }}>A empresa já nasce com estado "Ativa".</p>
      <button className="btn" type="submit" disabled={submitting}>
        {submitting ? 'Criando...' : 'Criar empresa'}
      </button>
    </form>
  );
}
