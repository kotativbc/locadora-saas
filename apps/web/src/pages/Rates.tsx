import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '../api';
import { EmptyState } from '../components/EmptyState';

interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
}

interface RatePlan {
  id: string;
  name: string;
  category: string | null;
  vehicleId: string | null;
  vehicle: { plate: string; brand: string; model: string } | null;
  dailyRate: string;
  weeklyRate: string | null;
  monthlyRate: string | null;
  active: boolean;
}

function formatCurrency(value: string) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function Rates() {
  const [ratePlans, setRatePlans] = useState<RatePlan[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [rates, fleet] = await Promise.all([
        api.get<RatePlan[]>('/rate-plans'),
        api.get<Vehicle[]>('/vehicles'),
      ]);
      setRatePlans(rates);
      setVehicles(fleet);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar tarifas.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>Tarifas</h1>
        <div className="page-header__rule" />
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <strong>{ratePlans.length} tarifa(s)</strong>
          <button className="btn btn--accent" onClick={() => setFormOpen((v) => !v)}>
            {formOpen ? 'Cancelar' : '+ Nova tarifa'}
          </button>
        </div>

        {loading ? (
          <p>Carregando...</p>
        ) : ratePlans.length === 0 ? (
          <EmptyState title="Nenhuma tarifa cadastrada" body="Cadastre uma tarifa por categoria ou por veículo pra usar na criação de contratos." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Aplica a</th>
                <th>Diária</th>
                <th>Semanal</th>
                <th>Mensal</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {ratePlans.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>
                    {r.vehicle ? (
                      <span className="plate">{r.vehicle.plate}</span>
                    ) : (
                      r.category ?? '—'
                    )}
                  </td>
                  <td>{formatCurrency(r.dailyRate)}</td>
                  <td>{r.weeklyRate ? formatCurrency(r.weeklyRate) : '—'}</td>
                  <td>{r.monthlyRate ? formatCurrency(r.monthlyRate) : '—'}</td>
                  <td>{r.active ? 'Ativa' : 'Inativa'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {formOpen && (
        <NewRatePlanForm vehicles={vehicles} onCreated={() => { setFormOpen(false); load(); }} />
      )}
    </div>
  );
}

function NewRatePlanForm({ vehicles, onCreated }: { vehicles: Vehicle[]; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [scope, setScope] = useState<'category' | 'vehicle'>('category');
  const [category, setCategory] = useState('economico');
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ?? '');
  const [dailyRate, setDailyRate] = useState('');
  const [weeklyRate, setWeeklyRate] = useState('');
  const [monthlyRate, setMonthlyRate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/rate-plans', {
        name,
        category: scope === 'category' ? category : undefined,
        vehicleId: scope === 'vehicle' ? vehicleId : undefined,
        dailyRate,
        weeklyRate: weeklyRate || undefined,
        monthlyRate: monthlyRate || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao cadastrar tarifa.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h3 style={{ marginTop: 0 }}>Nova tarifa</h3>
      {error && <div className="error-banner">{error}</div>}
      <div className="field">
        <label>Nome</label>
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Tarifa padrão SUV" />
      </div>
      <div className="field">
        <label>Aplica a</label>
        <select value={scope} onChange={(e) => setScope(e.target.value as 'category' | 'vehicle')}>
          <option value="category">Uma categoria de veículo</option>
          <option value="vehicle">Um veículo específico</option>
        </select>
      </div>
      {scope === 'category' ? (
        <div className="field">
          <label>Categoria</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="economico">Econômico</option>
            <option value="sedan">Sedan</option>
            <option value="suv">SUV</option>
            <option value="van">Van</option>
            <option value="luxo">Luxo</option>
          </select>
        </div>
      ) : (
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
      )}
      <div className="field">
        <label>Diária (R$)</label>
        <input required type="number" step="0.01" min="0" value={dailyRate} onChange={(e) => setDailyRate(e.target.value)} />
      </div>
      <div className="field">
        <label>Semanal (R$, opcional)</label>
        <input type="number" step="0.01" min="0" value={weeklyRate} onChange={(e) => setWeeklyRate(e.target.value)} />
      </div>
      <div className="field">
        <label>Mensal (R$, opcional)</label>
        <input type="number" step="0.01" min="0" value={monthlyRate} onChange={(e) => setMonthlyRate(e.target.value)} />
      </div>
      <button className="btn" type="submit" disabled={submitting}>
        {submitting ? 'Cadastrando...' : 'Cadastrar tarifa'}
      </button>
    </form>
  );
}
