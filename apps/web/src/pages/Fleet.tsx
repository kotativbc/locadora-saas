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

  return (
    <div>
      <div className="page-header">
        <h1>Frota</h1>
        <div className="page-header__rule" />
      </div>

      {error && <div className="error-banner">{error}</div>}

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
                  <td>{STATUS_LABELS[v.status] ?? v.status}</td>
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
