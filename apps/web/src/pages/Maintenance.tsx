import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '../api';
import { EmptyState } from '../components/EmptyState';

interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
}

interface MaintenanceRecord {
  id: string;
  type: string;
  description: string;
  performedAt: string;
  odometerKm: number | null;
  cost: string | null;
  vendor: string | null;
  vehicle: { plate: string; brand: string; model: string };
}

const TYPE_LABELS: Record<string, string> = {
  preventive: 'Preventiva',
  corrective: 'Corretiva',
};

function formatCurrency(value: string) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function Maintenance() {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [m, v] = await Promise.all([
        api.get<MaintenanceRecord[]>('/maintenance'),
        api.get<Vehicle[]>('/vehicles'),
      ]);
      setRecords(m);
      setVehicles(v);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar manutenções.');
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
        <h1>Manutenção</h1>
        <div className="page-header__rule" />
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <strong>{records.length} registro(s)</strong>
          <button className="btn btn--accent" onClick={() => setFormOpen((v) => !v)}>
            {formOpen ? 'Cancelar' : '+ Nova manutenção'}
          </button>
        </div>

        {loading ? (
          <p>Carregando...</p>
        ) : records.length === 0 ? (
          <EmptyState title="Nenhuma manutenção registrada" body="Registre trocas de óleo, revisões e reparos aqui pra manter o histórico da frota." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Veículo</th>
                <th>Tipo</th>
                <th>Descrição</th>
                <th>Data</th>
                <th>Odômetro</th>
                <th>Custo</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td>
                    <span className="plate">{r.vehicle.plate}</span> {r.vehicle.brand} {r.vehicle.model}
                  </td>
                  <td>{TYPE_LABELS[r.type] ?? r.type}</td>
                  <td>{r.description}</td>
                  <td>{new Date(r.performedAt).toLocaleDateString('pt-BR')}</td>
                  <td>{r.odometerKm ? `${r.odometerKm.toLocaleString('pt-BR')} km` : '—'}</td>
                  <td>{r.cost ? formatCurrency(r.cost) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {formOpen && (
        <NewMaintenanceForm vehicles={vehicles} onCreated={() => { setFormOpen(false); load(); }} />
      )}
    </div>
  );
}

function NewMaintenanceForm({ vehicles, onCreated }: { vehicles: Vehicle[]; onCreated: () => void }) {
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ?? '');
  const [type, setType] = useState<'preventive' | 'corrective'>('preventive');
  const [description, setDescription] = useState('');
  const [odometerKm, setOdometerKm] = useState('');
  const [cost, setCost] = useState('');
  const [vendor, setVendor] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/maintenance', {
        vehicleId,
        type,
        description,
        odometerKm: odometerKm ? Number(odometerKm) : undefined,
        cost: cost || undefined,
        vendor: vendor || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao registrar manutenção.');
    } finally {
      setSubmitting(false);
    }
  }

  if (vehicles.length === 0) {
    return (
      <div className="card">
        <p style={{ margin: 0 }}>Cadastre pelo menos um veículo antes de registrar uma manutenção.</p>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h3 style={{ marginTop: 0 }}>Nova manutenção</h3>
      {error && <div className="error-banner">{error}</div>}
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
        <label>Tipo</label>
        <select value={type} onChange={(e) => setType(e.target.value as 'preventive' | 'corrective')}>
          <option value="preventive">Preventiva</option>
          <option value="corrective">Corretiva</option>
        </select>
      </div>
      <div className="field">
        <label>Descrição</label>
        <input required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: troca de óleo e filtros" />
      </div>
      <div className="field">
        <label>Odômetro no momento (opcional)</label>
        <input
          type="text"
          inputMode="numeric"
          placeholder="Ex: 44468"
          value={odometerKm}
          onChange={(e) => setOdometerKm(e.target.value.replace(/\D/g, ''))}
        />
      </div>
      <div className="field">
        <label>Custo (R$, opcional)</label>
        <input type="number" step="0.01" inputMode="decimal" min="0" value={cost} onChange={(e) => setCost(e.target.value)} />
      </div>
      <div className="field">
        <label>Oficina/fornecedor (opcional)</label>
        <input value={vendor} onChange={(e) => setVendor(e.target.value)} />
      </div>
      <button className="btn" type="submit" disabled={submitting}>
        {submitting ? 'Salvando...' : 'Registrar manutenção'}
      </button>
    </form>
  );
}
