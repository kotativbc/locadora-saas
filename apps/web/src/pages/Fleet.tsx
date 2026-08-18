import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '../api';

interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  category: string;
  status: string;
  odometerKm: number;
  createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  available: 'Disponível',
  rented: 'Locado',
  maintenance: 'Manutenção',
  inactive: 'Inativo',
};

export function Fleet() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setVehicles(await api.get<Vehicle[]>('/vehicles'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar a frota.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleStatusChange(vehicleId: string, status: string) {
    setSavingId(vehicleId);
    setError(null);
    try {
      await api.patch(`/vehicles/${vehicleId}`, { status });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao atualizar status.');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Frota</h1>
        <div className="page-header__rule" />
      </div>

      {error && <div className="error-banner">{error}</div>}
      <p style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: -8 }}>
        O status aqui só controla se o veículo está disponível pra locação em geral (manutenção/inativo tiram ele de
        circulação por completo). Se um veículo específico está livre numa data, isso é decidido pela agenda de
        contratos — não precisa marcar "Locado" manualmente.
      </p>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <strong>{vehicles.length} veículo(s)</strong>
          <button className="btn btn--accent" onClick={() => setFormOpen((v) => !v)}>
            {formOpen ? 'Cancelar' : '+ Novo veículo'}
          </button>
        </div>

        {loading ? (
          <p>Carregando...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Placa</th>
                <th>Veículo</th>
                <th>Categoria</th>
                <th>Status</th>
                <th>Odômetro</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id}>
                  <td>
                    <span className="plate">{v.plate}</span>
                  </td>
                  <td>
                    {v.brand} {v.model}
                  </td>
                  <td>{v.category}</td>
                  <td>
                    <select
                      value={v.status}
                      disabled={savingId === v.id}
                      onChange={(e) => handleStatusChange(v.id, e.target.value)}
                      style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border)' }}
                    >
                      {Object.entries(STATUS_LABELS).map(([code, label]) => (
                        <option key={code} value={code}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{v.odometerKm.toLocaleString('pt-BR')} km</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {formOpen && <NewVehicleForm onCreated={() => { setFormOpen(false); load(); }} />}
    </div>
  );
}

function NewVehicleForm({ onCreated }: { onCreated: () => void }) {
  const [plate, setPlate] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [category, setCategory] = useState('economico');
  const [color, setColor] = useState('');
  const [modelYear, setModelYear] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/vehicles', {
        plate,
        brand,
        model,
        category,
        color: color || undefined,
        modelYear: modelYear ? Number(modelYear) : undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao cadastrar veículo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h3 style={{ marginTop: 0 }}>Novo veículo</h3>
      {error && <div className="error-banner">{error}</div>}
      <div className="field">
        <label>Placa</label>
        <input required value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} />
      </div>
      <div className="field">
        <label>Marca</label>
        <input required value={brand} onChange={(e) => setBrand(e.target.value)} />
      </div>
      <div className="field">
        <label>Modelo</label>
        <input required value={model} onChange={(e) => setModel(e.target.value)} />
      </div>
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
      <div className="field">
        <label>Cor (opcional)</label>
        <input value={color} onChange={(e) => setColor(e.target.value)} />
      </div>
      <div className="field">
        <label>Ano do modelo (opcional)</label>
        <input type="number" value={modelYear} onChange={(e) => setModelYear(e.target.value)} />
      </div>
      <button className="btn" type="submit" disabled={submitting}>
        {submitting ? 'Cadastrando...' : 'Cadastrar veículo'}
      </button>
    </form>
  );
}
