import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Car, Users, FileText, BarChart3, Building2, History } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { api, ApiError } from '../api';

interface FinancialSummary {
  totalReceivable: string;
  totalReceived: string;
  fleetSize: number;
  activeContracts: number;
}

interface Company {
  id: string;
  status: string;
}

function formatCurrency(value: string) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const QUICK_ACTIONS: { to: string; label: string; icon: typeof Car; permission: string }[] = [
  { to: '/empresas', label: 'Ver empresas', icon: Building2, permission: 'platform.manage' },
  { to: '/frota', label: 'Ver frota', icon: Car, permission: 'fleet.manage' },
  { to: '/clientes', label: 'Ver clientes', icon: Users, permission: 'customers.manage' },
  { to: '/contratos', label: 'Ver contratos', icon: FileText, permission: 'contracts.manage' },
  { to: '/relatorios', label: 'Ver relatórios', icon: BarChart3, permission: 'reports.view' },
  { to: '/auditoria', label: 'Ver auditoria', icon: History, permission: 'audit.view' },
];

export function Home() {
  const { user, hasPermission } = useAuth();
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hasPermission('reports.view')) {
      api
        .get<FinancialSummary>('/reports/financial-summary')
        .then(setSummary)
        .catch((err) => setError(err instanceof ApiError ? err.message : null));
    }
    if (hasPermission('platform.manage')) {
      api
        .get<Company[]>('/companies')
        .then(setCompanies)
        .catch((err) => setError(err instanceof ApiError ? err.message : null));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const actions = QUICK_ACTIONS.filter((a) => hasPermission(a.permission));

  return (
    <div>
      <div className="page-header">
        <h1>Olá, {user?.name?.split(' ')[0]}</h1>
        <div className="page-header__rule" />
      </div>

      {error && <div className="error-banner">{error}</div>}

      {companies && (
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-card__label">Empresas na plataforma</div>
            <div className="kpi-card__value">{companies.length}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-card__label">Ativas</div>
            <div className="kpi-card__value kpi-card__value--success">
              {companies.filter((c) => c.status === 'active').length}
            </div>
          </div>
        </div>
      )}

      {summary && (
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-card__label">A receber</div>
            <div className="kpi-card__value">{formatCurrency(summary.totalReceivable)}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-card__label">Recebido</div>
            <div className="kpi-card__value kpi-card__value--success">{formatCurrency(summary.totalReceived)}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-card__label">Contratos ativos</div>
            <div className="kpi-card__value">{summary.activeContracts}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-card__label">Veículos na frota</div>
            <div className="kpi-card__value">{summary.fleetSize}</div>
          </div>
        </div>
      )}

      {actions.length > 0 && (
        <div className="card">
          <strong style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>Acesso rápido</strong>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {actions.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="logout-btn"
                style={{
                  color: 'var(--rtv-navy-900)',
                  borderColor: 'var(--rtv-line-strong)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  textDecoration: 'none',
                }}
              >
                <Icon size={15} />
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {!summary && !companies && actions.length === 0 && (
        <div className="card">
          <p style={{ margin: 0 }}>Bem-vindo à Rentovix. Use o menu ao lado para navegar.</p>
        </div>
      )}
    </div>
  );
}
