import { useEffect, useState } from 'react';
import { api, ApiError } from '../api';

interface FinancialSummary {
  totalReceivable: string;
  totalReceived: string;
  totalExpenses: string;
  balance: string;
  chargesByType: { type: string; count: number; total: string }[];
  fleetSize: number;
  activeContracts: number;
}

const TYPE_LABELS: Record<string, string> = {
  rental: 'Aluguel',
  damage: 'Avaria',
  fine: 'Multa',
  other: 'Outro',
};

function formatCurrency(value: string) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function Reports() {
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<FinancialSummary>('/reports/financial-summary')
      .then(setSummary)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Erro ao carregar relatório.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>Relatórios</h1>
        <div className="page-header__rule" />
      </div>

      {error && <div className="error-banner">{error}</div>}
      {loading && <p>Carregando...</p>}

      {summary && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 12,
              marginBottom: 16,
            }}
          >
            <SummaryCard label="A receber" value={summary.totalReceivable} />
            <SummaryCard label="Recebido" value={summary.totalReceived} accent />
            <SummaryCard label="Despesas" value={summary.totalExpenses} negative />
            <SummaryCard label="Saldo (recebido − despesas)" value={summary.balance} />
          </div>

          <div className="card" style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>Veículos na frota</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{summary.fleetSize}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>Contratos ativos agora</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{summary.activeContracts}</div>
            </div>
          </div>

          <div className="card">
            <strong style={{ display: 'block', marginBottom: 10 }}>Lançamentos por tipo</strong>
            {summary.chargesByType.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-muted)' }}>Nenhum lançamento ainda.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Quantidade</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.chargesByType.map((c) => (
                    <tr key={c.type}>
                      <td>{TYPE_LABELS[c.type] ?? c.type}</td>
                      <td>{c.count}</td>
                      <td>{formatCurrency(c.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value, accent, negative }: { label: string; value: string; accent?: boolean; negative?: boolean }) {
  return (
    <div className="card">
      <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 6 }}>{label}</div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: negative ? 'var(--danger)' : accent ? 'var(--success)' : 'var(--ink)',
        }}
      >
        {formatCurrency(value)}
      </div>
    </div>
  );
}
