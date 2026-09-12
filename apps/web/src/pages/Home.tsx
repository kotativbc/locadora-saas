import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Car, Users, FileText, BarChart3, Building2, History, TrendingUp, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { api, ApiError } from '../api';
import { formatDateOnly } from '../dateUtils';

interface ChargeByType {
  type: string;
  count: number;
  total: string;
}

interface RecentCharge {
  id: string;
  type: string;
  description: string;
  amount: string;
  status: string;
  createdAt: string;
  customerName: string | null;
  vehiclePlate: string | null;
}

interface RecentExpense {
  id: string;
  category: string;
  description: string;
  amount: string;
  incurredAt: string;
  vehicle: string | null;
}

interface FinancialSummary {
  totalReceivable: string;
  totalReceived: string;
  totalPriorEarnings: string;
  totalExpenses: string;
  balance: string;
  chargesByType: ChargeByType[];
  recentCharges: RecentCharge[];
  recentExpenses: RecentExpense[];
  fleetSize: number;
  activeContracts: number;
}

interface Company {
  id: string;
  status: string;
}

interface OperationsDashboard {
  fleetByStatus: Record<string, number>;
  contractsByStatus: Record<string, number>;
  upcomingPayments: { id: string; description: string; amount: string; dueDate: string | null; customerName: string | null; vehiclePlate: string | null }[];
  overdue: { count: number; total: string };
  maintenanceReminders: { vehicleId: string; plate: string; brand: string; model: string; reason: string }[];
}

const FLEET_STATUS_LABELS: Record<string, string> = {
  available: 'Disponível',
  rented: 'Locado',
  maintenance: 'Manutenção',
  inactive: 'Inativo',
};
const FLEET_STATUS_COLORS: Record<string, string> = {
  available: 'var(--rtv-success)',
  rented: 'var(--rtv-teal-600)',
  maintenance: 'var(--rtv-warning)',
  inactive: 'var(--ink-muted)',
};

const CONTRACT_STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  awaiting_signature: 'Aguardando assinatura',
  active: 'Ativo',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};
const CONTRACT_STATUS_COLORS: Record<string, string> = {
  draft: 'var(--ink-muted)',
  awaiting_signature: 'var(--rtv-warning)',
  active: 'var(--rtv-success)',
  completed: 'var(--rtv-teal-600)',
  cancelled: 'var(--rtv-danger)',
};

function StatusBarChart({ data, labels, colors }: { data: Record<string, number>; labels: Record<string, string>; colors: Record<string, string> }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  if (total === 0) return <p style={{ fontSize: 12.5, color: 'var(--ink-muted)', margin: 0 }}>Nenhum dado ainda.</p>;
  return (
    <div>
      <div style={{ display: 'flex', height: 22, borderRadius: 6, overflow: 'hidden', marginBottom: 10 }}>
        {Object.entries(data).map(
          ([key, count]) =>
            count > 0 && (
              <div key={key} style={{ width: `${(count / total) * 100}%`, background: colors[key] ?? '#ccc' }} title={`${labels[key] ?? key}: ${count}`} />
            ),
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
        {Object.entries(data).map(
          ([key, count]) =>
            count > 0 && (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: colors[key] ?? '#ccc', display: 'inline-block' }} />
                {labels[key] ?? key}: <strong>{count}</strong>
              </div>
            ),
        )}
      </div>
    </div>
  );
}

function formatCurrency(value: string) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const TYPE_LABELS: Record<string, string> = {
  rental: 'Aluguel',
  damage: 'Avaria',
  fine: 'Multa',
  other: 'Outro',
};

const CATEGORY_LABELS: Record<string, string> = {
  maintenance: 'Manutenção',
  fuel: 'Combustível',
  insurance: 'Seguro',
  other: 'Outra',
};

const QUICK_ACTIONS: { to: string; label: string; icon: typeof Car; permission: string }[] = [
  { to: '/empresas', label: 'Ver empresas', icon: Building2, permission: 'platform.manage' },
  { to: '/crescimento', label: 'Ver crescimento', icon: TrendingUp, permission: 'platform.manage' },
  { to: '/frota', label: 'Ver frota', icon: Car, permission: 'fleet.manage' },
  { to: '/clientes', label: 'Ver clientes', icon: Users, permission: 'customers.manage' },
  { to: '/contratos', label: 'Ver contratos', icon: FileText, permission: 'contracts.manage' },
  { to: '/relatorios', label: 'Ver relatórios', icon: BarChart3, permission: 'reports.view' },
  { to: '/auditoria', label: 'Ver auditoria', icon: History, permission: 'audit.view' },
];

export function Home() {
  const { user, hasPermission } = useAuth();
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [ops, setOps] = useState<OperationsDashboard | null>(null);
  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hasPermission('reports.view')) {
      api
        .get<FinancialSummary>('/reports/financial-summary')
        .then(setSummary)
        .catch((err) => setError(err instanceof ApiError ? err.message : null));
      api
        .get<OperationsDashboard>('/reports/operations-dashboard')
        .then(setOps)
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

  // Junta lançamentos e despesas recentes numa única linha do tempo, mais recente primeiro.
  type TimelineItem =
    | { kind: 'charge'; id: string; date: string; description: string; label: string; origin: string | null; amount: string; status: string }
    | { kind: 'expense'; id: string; date: string; description: string; label: string; origin: string | null; amount: string };

  const timeline: TimelineItem[] = summary
    ? [
        ...summary.recentCharges.map((c): TimelineItem => ({
          kind: 'charge',
          id: c.id,
          date: c.createdAt,
          description: c.description,
          label: TYPE_LABELS[c.type] ?? c.type,
          origin: c.customerName ?? c.vehiclePlate,
          amount: c.amount,
          status: c.status,
        })),
        ...summary.recentExpenses.map((e): TimelineItem => ({
          kind: 'expense',
          id: e.id,
          date: e.incurredAt,
          description: e.description,
          label: CATEGORY_LABELS[e.category] ?? e.category,
          origin: e.vehicle,
          amount: e.amount,
        })),
      ]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10)
    : [];

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
        <>
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
              <div className="kpi-card__label">Despesas</div>
              <div className="kpi-card__value" style={{ color: 'var(--rtv-danger)' }}>
                {formatCurrency(summary.totalExpenses)}
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-card__label">Saldo (recebido − despesas)</div>
              <div
                className="kpi-card__value"
                style={{ color: Number(summary.balance) >= 0 ? 'var(--rtv-success)' : 'var(--rtv-danger)' }}
              >
                {formatCurrency(summary.balance)}
              </div>
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

          {Number(summary.totalPriorEarnings) > 0 && (
            <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: -10, marginBottom: 16 }}>
              Do total recebido, {formatCurrency(summary.totalPriorEarnings)} é ganho retroativo informado nos
              veículos.
            </p>
          )}

          {summary.chargesByType.length > 0 && (
            <div className="card">
              <strong style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>Lançamentos por tipo</strong>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
                {summary.chargesByType.map((c) => (
                  <div key={c.type}>
                    <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                      {TYPE_LABELS[c.type] ?? c.type} ({c.count})
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{formatCurrency(c.total)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ops && (
            <>
              {(ops.overdue.count > 0 || ops.maintenanceReminders.length > 0) && (
                <div className="card" style={{ borderColor: 'var(--rtv-warning)' }}>
                  <strong style={{ display: 'block', marginBottom: 10, fontSize: 13 }}>Pendências que merecem atenção</strong>
                  {ops.overdue.count > 0 && (
                    <p style={{ fontSize: 13, margin: '0 0 8px' }}>
                      <strong style={{ color: 'var(--rtv-danger)' }}>{ops.overdue.count} pagamento(s) atrasado(s)</strong>, totalizando{' '}
                      {formatCurrency(ops.overdue.total)}.
                    </p>
                  )}
                  {ops.maintenanceReminders.map((m) => (
                    <p key={m.vehicleId} style={{ fontSize: 13, margin: '0 0 4px' }}>
                      <strong>{m.plate}</strong> {m.brand} {m.model} — {m.reason}
                    </p>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
                <div className="card" style={{ flex: '1 1 280px' }}>
                  <strong style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>Frota por status</strong>
                  <StatusBarChart data={ops.fleetByStatus} labels={FLEET_STATUS_LABELS} colors={FLEET_STATUS_COLORS} />
                </div>
                <div className="card" style={{ flex: '1 1 280px' }}>
                  <strong style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>Contratos por status</strong>
                  <StatusBarChart data={ops.contractsByStatus} labels={CONTRACT_STATUS_LABELS} colors={CONTRACT_STATUS_COLORS} />
                </div>
              </div>

              {ops.upcomingPayments.length > 0 && (
                <div className="card">
                  <strong style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>Próximos pagamentos (14 dias)</strong>
                  <table>
                    <thead>
                      <tr>
                        <th>Vencimento</th>
                        <th>Descrição</th>
                        <th>Cliente/Veículo</th>
                        <th>Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ops.upcomingPayments.map((p) => (
                        <tr key={p.id}>
                          <td>{p.dueDate ? formatDateOnly(p.dueDate) : '—'}</td>
                          <td>{p.description}</td>
                          <td>{p.customerName ?? p.vehiclePlate ?? '—'}</td>
                          <td>{formatCurrency(p.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {timeline.length > 0 && (
            <div className="card">
              <strong style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>Atividade financeira recente</strong>
              <table>
                <thead>
                  <tr>
                    <th></th>
                    <th>Quando</th>
                    <th>Descrição</th>
                    <th>Categoria</th>
                    <th>Origem</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {timeline.map((item) => (
                    <tr key={`${item.kind}-${item.id}`}>
                      <td>
                        {item.kind === 'charge' ? (
                          <ArrowUpCircle size={15} color="var(--rtv-success)" />
                        ) : (
                          <ArrowDownCircle size={15} color="var(--rtv-danger)" />
                        )}
                      </td>
                      <td>{item.kind === 'expense' ? formatDateOnly(item.date) : new Date(item.date).toLocaleDateString('pt-BR')}</td>
                      <td>{item.description}</td>
                      <td>{item.label}</td>
                      <td>{item.origin ?? '—'}</td>
                      <td style={{ color: item.kind === 'charge' ? 'var(--rtv-success)' : 'var(--rtv-danger)' }}>
                        {item.kind === 'charge' ? '+' : '−'} {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
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
