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
  color: string | null;
  modelYear: number | null;
  manufactureYear: number | null;
  chassis: string | null;
  renavam: string | null;
  fipeValue: string | null;
  acquisitionCost: string | null;
  priorEarnings: string | null;
  maintenanceIntervalKm: number | null;
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
  const [editTarget, setEditTarget] = useState<Vehicle | null>(null);
  const [financialTarget, setFinancialTarget] = useState<Vehicle | null>(null);

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
                <th>Ações</th>
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
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button
                      className="logout-btn"
                      style={{ color: 'var(--primary)', borderColor: 'var(--border)', marginRight: 6 }}
                      onClick={() => setEditTarget(v)}
                    >
                      Editar
                    </button>
                    <button
                      className="logout-btn"
                      style={{ color: 'var(--primary)', borderColor: 'var(--border)' }}
                      onClick={() => setFinancialTarget(v)}
                    >
                      Desempenho
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {formOpen && <NewVehicleForm onCreated={() => { setFormOpen(false); load(); }} />}

      {editTarget && (
        <EditVehicleForm
          vehicle={editTarget}
          onSaved={() => { setEditTarget(null); load(); }}
          onCancel={() => setEditTarget(null)}
        />
      )}

      {financialTarget && (
        <VehicleFinancialPanel vehicle={financialTarget} onClose={() => setFinancialTarget(null)} />
      )}
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
  const [renavam, setRenavam] = useState('');
  const [fipeValue, setFipeValue] = useState('');
  const [acquisitionCost, setAcquisitionCost] = useState('');
  const [priorEarnings, setPriorEarnings] = useState('');
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
        renavam: renavam || undefined,
        fipeValue: fipeValue || undefined,
        acquisitionCost: acquisitionCost || undefined,
        priorEarnings: priorEarnings || undefined,
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
          <label>Renavam</label>
          <input value={renavam} onChange={(e) => setRenavam(e.target.value)} />
        </div>
        <div className="field">
          <label>Valor Tabela FIPE (R$)</label>
          <input type="number" step="0.01" inputMode="decimal" min="0" value={fipeValue} onChange={(e) => setFipeValue(e.target.value)} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Intervalo de manutenção (km)</label>
          <input type="text" inputMode="numeric" value={maintenanceIntervalKm} onChange={(e) => setMaintenanceIntervalKm(e.target.value.replace(/\D/g, ''))} />
        </div>
      </div>
      <div className="field-group">
        <div className="field-group__label">Financeiro (opcional)</div>
        <div className="field">
          <label>Quanto custou pra você (R$)</label>
          <input type="number" step="0.01" inputMode="decimal" min="0" value={acquisitionCost} onChange={(e) => setAcquisitionCost(e.target.value)} placeholder="Diferente da Tabela FIPE — é o que você pagou de verdade" />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Ganho retroativo (R$)</label>
          <input type="number" step="0.01" inputMode="decimal" min="0" value={priorEarnings} onChange={(e) => setPriorEarnings(e.target.value)} placeholder="Quanto esse veículo já rendeu antes de entrar no sistema" />
        </div>
      </div>
      <button className="btn" type="submit" disabled={submitting}>
        {submitting ? 'Cadastrando...' : 'Cadastrar veículo'}
      </button>
    </form>
  );
}

function EditVehicleForm({
  vehicle,
  onSaved,
  onCancel,
}: {
  vehicle: Vehicle;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [brand, setBrand] = useState(vehicle.brand);
  const [model, setModel] = useState(vehicle.model);
  const [category, setCategory] = useState(vehicle.category);
  const [color, setColor] = useState(vehicle.color ?? '');
  const [modelYear, setModelYear] = useState(vehicle.modelYear?.toString() ?? '');
  const [manufactureYear, setManufactureYear] = useState(vehicle.manufactureYear?.toString() ?? '');
  const [odometerKm, setOdometerKm] = useState(vehicle.odometerKm.toString());
  const [chassis, setChassis] = useState(vehicle.chassis ?? '');
  const [renavam, setRenavam] = useState(vehicle.renavam ?? '');
  const [fipeValue, setFipeValue] = useState(vehicle.fipeValue ?? '');
  const [acquisitionCost, setAcquisitionCost] = useState(vehicle.acquisitionCost ?? '');
  const [priorEarnings, setPriorEarnings] = useState(vehicle.priorEarnings ?? '');
  const [maintenanceIntervalKm, setMaintenanceIntervalKm] = useState(vehicle.maintenanceIntervalKm?.toString() ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.patch(`/vehicles/${vehicle.id}`, {
        brand,
        model,
        category,
        color: color || undefined,
        modelYear: modelYear ? Number(modelYear) : undefined,
        manufactureYear: manufactureYear ? Number(manufactureYear) : undefined,
        odometerKm: odometerKm ? Number(odometerKm) : undefined,
        chassis: chassis || undefined,
        renavam: renavam || undefined,
        fipeValue: fipeValue || undefined,
        acquisitionCost: acquisitionCost || undefined,
        priorEarnings: priorEarnings || undefined,
        maintenanceIntervalKm: maintenanceIntervalKm ? Number(maintenanceIntervalKm) : undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h3 style={{ marginTop: 0 }}>Editar veículo — {vehicle.plate}</h3>
      {error && <div className="error-banner">{error}</div>}
      <div className="field-group">
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
          <label>Cor</label>
          <input value={color} onChange={(e) => setColor(e.target.value)} />
        </div>
        <div className="field">
          <label>Ano do modelo</label>
          <input type="number" value={modelYear} onChange={(e) => setModelYear(e.target.value)} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Ano de fabricação</label>
          <input type="number" value={manufactureYear} onChange={(e) => setManufactureYear(e.target.value)} />
        </div>
      </div>
      <div className="field-group">
        <div className="field-group__label">Odômetro</div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Quilometragem atual (km)</label>
          <input
            required
            type="text"
            inputMode="numeric"
            placeholder="Ex: 44468"
            value={odometerKm}
            onChange={(e) => setOdometerKm(e.target.value.replace(/\D/g, ''))}
          />
        </div>
      </div>
      <div className="field-group">
        <div className="field-group__label">Pra contratos</div>
        <div className="field">
          <label>Chassi</label>
          <input value={chassis} onChange={(e) => setChassis(e.target.value)} />
        </div>
        <div className="field">
          <label>Renavam</label>
          <input value={renavam} onChange={(e) => setRenavam(e.target.value)} />
        </div>
        <div className="field">
          <label>Valor Tabela FIPE (R$)</label>
          <input type="number" step="0.01" inputMode="decimal" min="0" value={fipeValue} onChange={(e) => setFipeValue(e.target.value)} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Intervalo de manutenção (km)</label>
          <input type="text" inputMode="numeric" value={maintenanceIntervalKm} onChange={(e) => setMaintenanceIntervalKm(e.target.value.replace(/\D/g, ''))} />
        </div>
      </div>
      <div className="field-group">
        <div className="field-group__label">Financeiro</div>
        <div className="field">
          <label>Quanto custou pra você (R$)</label>
          <input type="number" step="0.01" inputMode="decimal" min="0" value={acquisitionCost} onChange={(e) => setAcquisitionCost(e.target.value)} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Ganho retroativo (R$)</label>
          <input type="number" step="0.01" inputMode="decimal" min="0" value={priorEarnings} onChange={(e) => setPriorEarnings(e.target.value)} placeholder="Quanto esse veículo já rendeu antes de entrar no sistema" />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn" type="submit" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
        <button type="button" className="logout-btn" style={{ color: 'var(--ink-muted)', borderColor: 'var(--border)' }} onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

interface VehicleFinancialSummary {
  acquisitionCost: string | null;
  priorEarnings: string | null;
  totalReceived: string;
  totalPending: string;
  totalExpenses: string;
  netResult: string;
  paybackProgress: string | null;
}

function formatCurrency(value: string) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function VehicleFinancialPanel({ vehicle, onClose }: { vehicle: Vehicle; onClose: () => void }) {
  const [summary, setSummary] = useState<VehicleFinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .get<VehicleFinancialSummary>(`/vehicles/${vehicle.id}/financial-summary`)
      .then(setSummary)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Erro ao carregar desempenho financeiro.'))
      .finally(() => setLoading(false));
  }, [vehicle.id]);

  const net = summary ? Number(summary.netResult) : 0;

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <h3 style={{ margin: 0 }}>Desempenho financeiro — {vehicle.plate}</h3>
        <button type="button" className="logout-btn" style={{ color: 'var(--ink-muted)', borderColor: 'var(--border)' }} onClick={onClose}>
          Fechar
        </button>
      </div>
      <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 0, marginBottom: 14 }}>
        Quanto esse veículo já rendeu de verdade, comparado com o que ele custou. Diferente da Tabela FIPE (que é
        valor de mercado) — aqui é o retorno financeiro real. O "ganho retroativo" (edite pelo botão Editar) entra
        somado ao "Já recebido" — é pra cobrir o período antes desse veículo entrar no sistema, e não aparece em
        Financeiro → Lançamentos, já que não é uma cobrança de cliente de verdade, é só uma referência histórica.
      </p>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <p>Carregando...</p>
      ) : summary ? (
        <>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 16 }}>
            <div className="kpi-card" style={{ flex: 1, minWidth: 160 }}>
              <div className="kpi-card__label">Custo de aquisição</div>
              <div className="kpi-card__value">
                {summary.acquisitionCost ? formatCurrency(summary.acquisitionCost) : 'não informado'}
              </div>
            </div>
            <div className="kpi-card" style={{ flex: 1, minWidth: 160 }}>
              <div className="kpi-card__label">Já recebido</div>
              <div className="kpi-card__value kpi-card__value--success">{formatCurrency(summary.totalReceived)}</div>
            </div>
            <div className="kpi-card" style={{ flex: 1, minWidth: 160 }}>
              <div className="kpi-card__label">Pendente</div>
              <div className="kpi-card__value">{formatCurrency(summary.totalPending)}</div>
            </div>
            <div className="kpi-card" style={{ flex: 1, minWidth: 160 }}>
              <div className="kpi-card__label">Despesas</div>
              <div className="kpi-card__value" style={{ color: 'var(--rtv-danger)' }}>{formatCurrency(summary.totalExpenses)}</div>
            </div>
            <div className="kpi-card" style={{ flex: 1, minWidth: 160 }}>
              <div className="kpi-card__label">Resultado líquido</div>
              <div className="kpi-card__value" style={{ color: net >= 0 ? 'var(--rtv-success)' : 'var(--rtv-danger)' }}>
                {formatCurrency(summary.netResult)}
              </div>
            </div>
          </div>
          {summary.priorEarnings && (
            <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: -8, marginBottom: 14 }}>
              Do total recebido, {formatCurrency(summary.priorEarnings)} é ganho retroativo (informado manualmente,
              anterior a este veículo entrar no sistema) — por isso pode não bater exatamente com a soma dos
              lançamentos em Financeiro.
            </p>
          )}
          {summary.paybackProgress !== null ? (
            <p style={{ fontSize: 13 }}>
              Esse veículo já se pagou em <strong>{summary.paybackProgress}%</strong> do que custou pra você (recebido
              menos despesas, comparado com o custo de aquisição).
            </p>
          ) : (
            <p style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>
              Cadastre o "custo de aquisição" (botão Editar) pra ver o percentual de retorno sobre o que você pagou
              por esse veículo.
            </p>
          )}
        </>
      ) : null}
    </div>
  );
}
