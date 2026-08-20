import { useEffect, useState } from 'react';
import { api, ApiError } from '../api';
import { StatusBadge } from '../components/StatusBadge';
import { COMPANY_STATUS_LABELS, COMPANY_STATUS_VARIANT } from '../components/CompanyStatusControls';

interface PlatformGrowth {
  totalCompanies: number;
  totalUsers: number;
  totalVehicles: number;
  totalContracts: number;
  activeContracts: number;
  companiesByStatus: { status: string; count: number }[];
  monthlyCompanyGrowth: { label: string; count: number }[];
  planDistribution: { planName: string; count: number }[];
}

export function PlatformGrowthReport() {
  const [data, setData] = useState<PlatformGrowth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<PlatformGrowth>('/reports/platform-growth')
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Erro ao carregar relatório.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>Crescimento da plataforma</h1>
        <div className="page-header__rule" />
      </div>

      {error && <div className="error-banner">{error}</div>}
      {loading && <p>Carregando...</p>}

      {data && (
        <>
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-card__label">Empresas na plataforma</div>
              <div className="kpi-card__value">{data.totalCompanies}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-card__label">Usuários (todas as empresas)</div>
              <div className="kpi-card__value">{data.totalUsers}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-card__label">Veículos (todas as empresas)</div>
              <div className="kpi-card__value">{data.totalVehicles}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-card__label">Contratos (ativos / total)</div>
              <div className="kpi-card__value">
                {data.activeContracts} / {data.totalContracts}
              </div>
            </div>
          </div>

          <div className="card">
            <strong style={{ display: 'block', marginBottom: 14 }}>Empresas cadastradas por mês (últimos 12 meses)</strong>
            <MonthlyBarChart data={data.monthlyCompanyGrowth} />
          </div>

          <div className="card">
            <strong style={{ display: 'block', marginBottom: 10 }}>Empresas por estado</strong>
            <table>
              <thead>
                <tr>
                  <th>Estado</th>
                  <th>Quantidade</th>
                </tr>
              </thead>
              <tbody>
                {data.companiesByStatus.map((s) => (
                  <tr key={s.status}>
                    <td>
                      <StatusBadge label={COMPANY_STATUS_LABELS[s.status] ?? s.status} variant={COMPANY_STATUS_VARIANT[s.status] ?? 'neutral'} />
                    </td>
                    <td>{s.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <strong style={{ display: 'block', marginBottom: 10 }}>Empresas por plano</strong>
            <table>
              <thead>
                <tr>
                  <th>Plano</th>
                  <th>Quantidade</th>
                </tr>
              </thead>
              <tbody>
                {data.planDistribution.map((p) => (
                  <tr key={p.planName}>
                    <td>{p.planName}</td>
                    <td>{p.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function MonthlyBarChart({ data }: { data: { label: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {data.map((d) => (
        <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 52, fontSize: 12, color: 'var(--ink-muted)', textTransform: 'capitalize' }}>{d.label}</span>
          <div style={{ flex: 1, background: 'var(--rtv-canvas)', borderRadius: 4, overflow: 'hidden', height: 16 }}>
            <div
              style={{
                width: `${(d.count / max) * 100}%`,
                background: 'var(--rtv-teal-500)',
                height: '100%',
                borderRadius: 4,
                minWidth: d.count > 0 ? 4 : 0,
                transition: 'width 0.2s ease',
              }}
            />
          </div>
          <span style={{ width: 20, textAlign: 'right', fontSize: 12, fontWeight: 600 }}>{d.count}</span>
        </div>
      ))}
    </div>
  );
}
