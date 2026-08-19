import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api, ApiError } from '../api';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge } from '../components/StatusBadge';
import { ChangeCompanyStatusForm, COMPANY_STATUS_LABELS, COMPANY_STATUS_VARIANT } from '../components/CompanyStatusControls';

interface Company {
  id: string;
  name: string;
  tradeName: string | null;
  cnpj: string | null;
  status: string;
  statusReason: string | null;
  createdAt: string;
}

interface Summary {
  company: Company;
  consumption: {
    users: number;
    vehicles: number;
    customers: number;
    contracts: number;
    activeContracts: number;
  };
}

interface StatusEvent {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  reason: string | null;
  createdAt: string;
}

interface SupportUser {
  id: string;
  name: string;
  email: string;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  roles: { role: { code: string; name: string } }[];
}

export function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [history, setHistory] = useState<StatusEvent[]>([]);
  const [users, setUsers] = useState<SupportUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFormOpen, setStatusFormOpen] = useState(false);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<{ email: string; password: string } | null>(null);

  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      const [s, h, u] = await Promise.all([
        api.get<Summary>(`/companies/${id}/summary`),
        api.get<StatusEvent[]>(`/companies/${id}/status-history`),
        api.get<SupportUser[]>(`/companies/${id}/users`),
      ]);
      setSummary(s);
      setHistory(h);
      setUsers(u);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar dados da empresa.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleToggleUser(user: SupportUser) {
    if (!id) return;
    setSavingUserId(user.id);
    setError(null);
    try {
      await api.patch(`/companies/${id}/users/${user.id}/active`, { active: !user.active });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao atualizar usuário.');
    } finally {
      setSavingUserId(null);
    }
  }

  async function handleResetPassword(user: SupportUser) {
    if (!id) return;
    if (!confirm(`Redefinir a senha de ${user.name}? A senha atual dele para de funcionar imediatamente.`)) return;
    setSavingUserId(user.id);
    setError(null);
    try {
      const result = await api.post<{ tempPassword: string }>(`/companies/${id}/users/${user.id}/reset-password`);
      setTempPassword({ email: user.email, password: result.tempPassword });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao redefinir senha.');
    } finally {
      setSavingUserId(null);
    }
  }

  if (loading) {
    return <p>Carregando...</p>;
  }

  if (!summary) {
    return (
      <div>
        {error && <div className="error-banner">{error}</div>}
        <Link to="/empresas" style={{ color: 'var(--rtv-teal-600)' }}>
          ← Voltar pra Empresas
        </Link>
      </div>
    );
  }

  const { company, consumption } = summary;

  return (
    <div>
      <Link
        to="/empresas"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--rtv-ink-600)', fontSize: 13, marginBottom: 10, textDecoration: 'none' }}
      >
        <ArrowLeft size={14} /> Empresas
      </Link>

      <div className="page-header">
        <div>
          <h1>{company.name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <StatusBadge label={COMPANY_STATUS_LABELS[company.status] ?? company.status} variant={COMPANY_STATUS_VARIANT[company.status] ?? 'neutral'} />
            {company.statusReason && <span style={{ fontSize: 12, color: 'var(--rtv-ink-400)' }}>{company.statusReason}</span>}
          </div>
        </div>
        <button className="btn btn--accent" onClick={() => setStatusFormOpen((v) => !v)}>
          {statusFormOpen ? 'Cancelar' : 'Mudar estado'}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {statusFormOpen && (
        <ChangeCompanyStatusForm
          companyId={company.id}
          companyName={company.name}
          currentStatus={company.status}
          onDone={() => {
            setStatusFormOpen(false);
            load();
          }}
          onCancel={() => setStatusFormOpen(false)}
        />
      )}

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card__label">Usuários</div>
          <div className="kpi-card__value">{consumption.users}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card__label">Veículos</div>
          <div className="kpi-card__value">{consumption.vehicles}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card__label">Clientes</div>
          <div className="kpi-card__value">{consumption.customers}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card__label">Contratos (ativos / total)</div>
          <div className="kpi-card__value">
            {consumption.activeContracts} / {consumption.contracts}
          </div>
        </div>
      </div>

      {tempPassword && (
        <div className="card" style={{ borderColor: 'var(--rtv-amber-500)' }}>
          <strong>Senha redefinida para {tempPassword.email}</strong>
          <p style={{ fontSize: 13, color: 'var(--ink-muted)' }}>
            Copie e repasse pra pessoa por um canal seguro — essa senha só aparece aqui uma vez, o sistema não guarda
            o texto puro.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input readOnly value={tempPassword.password} style={{ flex: 1, padding: 8, fontFamily: 'var(--font-mono)', fontSize: 14 }} />
          </div>
          <button
            className="logout-btn"
            style={{ marginTop: 10, color: 'var(--ink-muted)', borderColor: 'var(--border)' }}
            onClick={() => setTempPassword(null)}
          >
            Fechar
          </button>
        </div>
      )}

      <div className="card">
        <strong style={{ display: 'block', marginBottom: 10 }}>Usuários</strong>
        {users.length === 0 ? (
          <EmptyState title="Nenhum usuário nesta empresa" />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Papel</th>
                <th>Status</th>
                <th>Último acesso</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.roles.map((r) => r.role.name).join(', ')}</td>
                  <td>
                    <StatusBadge label={u.active ? 'Ativo' : 'Inativo'} variant={u.active ? 'success' : 'neutral'} />
                  </td>
                  <td>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('pt-BR') : 'Nunca'}</td>
                  <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      className="logout-btn"
                      style={{ color: 'var(--rtv-navy-900)', borderColor: 'var(--rtv-line-strong)' }}
                      disabled={savingUserId === u.id}
                      onClick={() => handleToggleUser(u)}
                    >
                      {u.active ? 'Desativar' : 'Reativar'}
                    </button>
                    <button
                      className="logout-btn"
                      style={{ color: 'var(--rtv-navy-900)', borderColor: 'var(--rtv-line-strong)' }}
                      disabled={savingUserId === u.id}
                      onClick={() => handleResetPassword(u)}
                    >
                      Redefinir senha
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <strong style={{ display: 'block', marginBottom: 10 }}>Histórico de estado</strong>
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
                  <td>{h.fromStatus ? COMPANY_STATUS_LABELS[h.fromStatus] ?? h.fromStatus : '—'}</td>
                  <td>{COMPANY_STATUS_LABELS[h.toStatus] ?? h.toStatus}</td>
                  <td>{h.reason ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
