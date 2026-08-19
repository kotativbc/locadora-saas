import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
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

export function Companies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<Company | null>(null);

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
                  <td>
                    <Link to={`/empresas/${c.id}`} style={{ color: 'var(--rtv-navy-900)', fontWeight: 600, textDecoration: 'none' }}>
                      {c.name}
                    </Link>
                  </td>
                  <td>{c.cnpj ? <span className="plate">{c.cnpj}</span> : '—'}</td>
                  <td>
                    <StatusBadge label={COMPANY_STATUS_LABELS[c.status] ?? c.status} variant={COMPANY_STATUS_VARIANT[c.status] ?? 'neutral'} />
                    {c.statusReason && (
                      <div style={{ fontSize: 11, color: 'var(--rtv-ink-400)', marginTop: 3 }}>{c.statusReason}</div>
                    )}
                  </td>
                  <td>{new Date(c.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <Link
                      to={`/empresas/${c.id}`}
                      className="logout-btn"
                      style={{ color: 'var(--rtv-navy-900)', borderColor: 'var(--rtv-line-strong)', textDecoration: 'none' }}
                    >
                      Ver detalhes
                    </Link>
                    <button
                      className="logout-btn"
                      style={{ color: 'var(--rtv-navy-900)', borderColor: 'var(--rtv-line-strong)' }}
                      onClick={() => setStatusTarget(c)}
                    >
                      Mudar estado
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {statusTarget && (
        <ChangeCompanyStatusForm
          companyId={statusTarget.id}
          companyName={statusTarget.name}
          currentStatus={statusTarget.status}
          onDone={() => {
            setStatusTarget(null);
            load();
          }}
          onCancel={() => setStatusTarget(null)}
        />
      )}

      {formOpen && <NewCompanyForm onCreated={() => { setFormOpen(false); load(); }} />}
    </div>
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
