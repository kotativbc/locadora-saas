import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError, fetchFileUrl } from '../api';

interface Customer {
  id: string;
  name: string;
  document: string;
}

interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  status: string;
}

interface RatePlan {
  id: string;
  name: string;
  dailyRate: string;
}

interface Contract {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  totalValue: string;
  customer: { name: string; document: string };
  vehicle: { plate: string; brand: string; model: string };
  signature: { signedAt: string | null; expiresAt: string; token: string } | null;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  awaiting_signature: 'Aguardando assinatura',
  active: 'Ativo',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

function formatCurrency(value: string) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function Contracts() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [ratePlans, setRatePlans] = useState<RatePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [linkInfo, setLinkInfo] = useState<{ contractId: string; url: string } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [c, cu, v, r] = await Promise.all([
        api.get<Contract[]>('/contracts'),
        api.get<Customer[]>('/customers'),
        api.get<Vehicle[]>('/vehicles'),
        api.get<RatePlan[]>('/rate-plans'),
      ]);
      setContracts(c);
      setCustomers(cu);
      setVehicles(v.filter((veh) => veh.status !== 'maintenance' && veh.status !== 'inactive'));
      setRatePlans(r);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar contratos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleGenerateLink(contractId: string) {
    setError(null);
    try {
      const { token } = await api.post<{ token: string; expiresAt: string }>(
        `/contracts/${contractId}/signature-link`,
      );
      const publicUrl = `${window.location.origin}/assinar/${token}`;
      setLinkInfo({ contractId, url: publicUrl });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao gerar link de assinatura.');
    }
  }

  async function handleViewPdf(contractId: string) {
    setError(null);
    try {
      const url = await fetchFileUrl(`/contracts/${contractId}/pdf`);
      window.open(url, '_blank');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao abrir o PDF.');
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Contratos</h1>
        <div className="page-header__rule" />
      </div>

      {error && <div className="error-banner">{error}</div>}

      {linkInfo && (
        <div className="card" style={{ borderColor: 'var(--accent)' }}>
          <strong>Link de assinatura gerado</strong>
          <p style={{ fontSize: 13, color: 'var(--ink-muted)' }}>
            Mostre este link pro cliente assinar (válido por 48h, uso único):
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input readOnly value={linkInfo.url} style={{ flex: 1, padding: 8, fontFamily: 'var(--font-mono)', fontSize: 12 }} />
            <button className="btn" onClick={() => navigator.clipboard.writeText(linkInfo.url)}>
              Copiar
            </button>
          </div>
          <button
            className="logout-btn"
            style={{ marginTop: 10, color: 'var(--ink-muted)', borderColor: 'var(--border)' }}
            onClick={() => setLinkInfo(null)}
          >
            Fechar
          </button>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <strong>{contracts.length} contrato(s)</strong>
          <button className="btn btn--accent" onClick={() => setFormOpen((v) => !v)}>
            {formOpen ? 'Cancelar' : '+ Novo contrato'}
          </button>
        </div>

        {loading ? (
          <p>Carregando...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Veículo</th>
                <th>Período</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => (
                <tr key={c.id}>
                  <td>{c.customer.name}</td>
                  <td>
                    <span className="plate">{c.vehicle.plate}</span> {c.vehicle.brand} {c.vehicle.model}
                  </td>
                  <td>
                    {new Date(c.startDate).toLocaleDateString('pt-BR')} a{' '}
                    {new Date(c.endDate).toLocaleDateString('pt-BR')}
                  </td>
                  <td>{formatCurrency(c.totalValue)}</td>
                  <td>{STATUS_LABELS[c.status] ?? c.status}</td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <button className="logout-btn" style={{ color: 'var(--primary)', borderColor: 'var(--border)' }} onClick={() => handleViewPdf(c.id)}>
                      PDF
                    </button>
                    {c.status === 'draft' && (
                      <button className="logout-btn" style={{ color: 'var(--primary)', borderColor: 'var(--border)' }} onClick={() => handleGenerateLink(c.id)}>
                        Gerar link
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {formOpen && (
        <NewContractForm
          customers={customers}
          vehicles={vehicles}
          ratePlans={ratePlans}
          onCreated={() => {
            setFormOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function NewContractForm({
  customers,
  vehicles,
  ratePlans,
  onCreated,
}: {
  customers: Customer[];
  vehicles: Vehicle[];
  ratePlans: RatePlan[];
  onCreated: () => void;
}) {
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? '');
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ?? '');
  const [rateMode, setRateMode] = useState<'plan' | 'manual'>(ratePlans.length ? 'plan' : 'manual');
  const [ratePlanId, setRatePlanId] = useState(ratePlans[0]?.id ?? '');
  const [dailyRate, setDailyRate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/contracts', {
        customerId,
        vehicleId,
        ratePlanId: rateMode === 'plan' ? ratePlanId : undefined,
        dailyRate: rateMode === 'manual' ? dailyRate : undefined,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao criar contrato.');
    } finally {
      setSubmitting(false);
    }
  }

  if (customers.length === 0 || vehicles.length === 0) {
    return (
      <div className="card">
        <p style={{ margin: 0 }}>
          Cadastre pelo menos um cliente e um veículo disponível antes de criar um contrato.
        </p>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h3 style={{ marginTop: 0 }}>Novo contrato</h3>
      {error && <div className="error-banner">{error}</div>}
      <div className="field">
        <label>Cliente</label>
        <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} — {c.document}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Veículo</label>
        <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.plate} — {v.brand} {v.model}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Tarifa</label>
        <select value={rateMode} onChange={(e) => setRateMode(e.target.value as 'plan' | 'manual')}>
          {ratePlans.length > 0 && <option value="plan">Usar tarifa cadastrada</option>}
          <option value="manual">Diária avulsa</option>
        </select>
      </div>
      {rateMode === 'plan' ? (
        <div className="field">
          <label>Plano de tarifa</label>
          <select value={ratePlanId} onChange={(e) => setRatePlanId(e.target.value)}>
            {ratePlans.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} — {formatCurrency(r.dailyRate)}/dia
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="field">
          <label>Diária (R$)</label>
          <input required type="number" step="0.01" min="0" value={dailyRate} onChange={(e) => setDailyRate(e.target.value)} />
        </div>
      )}
      <div className="field">
        <label>Data de retirada</label>
        <input required type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </div>
      <div className="field">
        <label>Data de devolução prevista</label>
        <input required type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </div>
      <button className="btn" type="submit" disabled={submitting}>
        {submitting ? 'Criando...' : 'Criar contrato (rascunho)'}
      </button>
    </form>
  );
}
