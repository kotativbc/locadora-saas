import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '../api';
import { StatusSelect, type StatusOption } from '../components/StatusSelect';
import { EmptyState } from '../components/EmptyState';

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

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'available', label: 'Disponível', variant: 'success' },
  { value: 'rented', label: 'Locado', variant: 'info' },
  { value: 'maintenance', label: 'Manutenção', variant: 'warning' },
  { value: 'inactive', label: 'Inativo', variant: 'neutral' },
];

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
        ) : vehicles.length === 0 ? (
          <EmptyState title="Nenhum veículo cadastrado" body="Cadastre o primeiro veículo pra começar a montar sua frota." />
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
                    <StatusSelect
                      value={v.status}
                      options={STATUS_OPTIONS}
                      disabled={savingId === v.id}
                      onChange={(status) => handleStatusChange(v.id, status)}
                    />
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
  const [chassis, setChassis] = useState('');
  const [fipeValue, setFipeValue] = useState('');
  const [maintenanceIntervalKm, setMaintenanceIntervalKm] = useState('10000');
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
        chassis: chassis || undefined,
        fipeValue: fipeValue || undefined,
        maintenanceIntervalKm: maintenanceIntervalKm ? Number(maintenanceIntervalKm) : undefined,
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
      <div className="field-group">
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
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Ano do modelo (opcional)</label>
          <input type="number" value={modelYear} onChange={(e) => setModelYear(e.target.value)} />
        </div>
      </div>
      <div className="field-group">
        <div className="field-group__label">Pra contratos (opcional, preencha se for usar modelos de contrato mais completos)</div>
        <div className="field">
          <label>Chassi</label>
          <input value={chassis} onChange={(e) => setChassis(e.target.value)} />
        </div>
        <div className="field">
          <label>Valor Tabela FIPE (R$)</label>
          <input type="number" step="0.01" min="0" value={fipeValue} onChange={(e) => setFipeValue(e.target.value)} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Intervalo de manutenção (km)</label>
          <input type="number" min="1000" value={maintenanceIntervalKm} onChange={(e) => setMaintenanceIntervalKm(e.target.value)} />
        </div>
      </div>
      <button className="btn" type="submit" disabled={submitting}>
        {submitting ? 'Cadastrando...' : 'Cadastrar veículo'}
      </button>
    </form>
  );
}
