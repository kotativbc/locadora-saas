import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '../api';
import { EmptyState } from '../components/EmptyState';

interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
}

interface Expense {
  id: string;
  vehicleId: string | null;
  category: string;
  description: string;
  amount: string;
  incurredAt: string;
  vehicle: { plate: string; brand: string; model: string } | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  maintenance: 'Manutenção',
  fuel: 'Combustível',
  insurance: 'Seguro',
  other: 'Outro',
};

function formatCurrency(value: string) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Expense | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [e, v] = await Promise.all([api.get<Expense[]>('/expenses'), api.get<Vehicle[]>('/vehicles')]);
      setExpenses(e);
      setVehicles(v);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar despesas.');
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
        <h1>Despesas</h1>
        <div className="page-header__rule" />
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <strong>{expenses.length} despesa(s)</strong>
          <button className="btn btn--accent" onClick={() => setFormOpen((v) => !v)}>
            {formOpen ? 'Cancelar' : '+ Nova despesa'}
          </button>
        </div>

        {loading ? (
          <p>Carregando...</p>
        ) : expenses.length === 0 ? (
          <EmptyState title="Nenhuma despesa registrada" body="Registre manutenção, combustível, seguro e outros custos aqui." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Categoria</th>
                <th>Descrição</th>
                <th>Veículo</th>
                <th>Data</th>
                <th>Valor</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td>{CATEGORY_LABELS[e.category] ?? e.category}</td>
                  <td>{e.description}</td>
                  <td>
                    {e.vehicle ? (
                      <>
                        <span className="plate">{e.vehicle.plate}</span> {e.vehicle.brand} {e.vehicle.model}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{new Date(e.incurredAt).toLocaleDateString('pt-BR')}</td>
                  <td>{formatCurrency(e.amount)}</td>
                  <td>
                    <button
                      className="logout-btn"
                      style={{ color: 'var(--primary)', borderColor: 'var(--border)' }}
                      onClick={() => setEditTarget(e)}
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {formOpen && <NewExpenseForm vehicles={vehicles} onCreated={() => { setFormOpen(false); load(); }} />}

      {editTarget && (
        <EditExpenseForm
          expense={editTarget}
          vehicles={vehicles}
          onSaved={() => { setEditTarget(null); load(); }}
          onCancel={() => setEditTarget(null)}
        />
      )}
    </div>
  );
}

function NewExpenseForm({ vehicles, onCreated }: { vehicles: Vehicle[]; onCreated: () => void }) {
  const [category, setCategory] = useState<'maintenance' | 'fuel' | 'insurance' | 'other'>('other');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [incurredAt, setIncurredAt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/expenses', {
        category,
        description,
        amount,
        vehicleId: vehicleId || undefined,
        incurredAt: incurredAt ? new Date(incurredAt).toISOString() : undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao registrar despesa.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h3 style={{ marginTop: 0 }}>Nova despesa</h3>
      {error && <div className="error-banner">{error}</div>}
      <div className="field">
        <label>Categoria</label>
        <select value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
          <option value="maintenance">Manutenção</option>
          <option value="fuel">Combustível</option>
          <option value="insurance">Seguro</option>
          <option value="other">Outro</option>
        </select>
      </div>
      <div className="field">
        <label>Descrição</label>
        <input required value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="field">
        <label>Valor (R$)</label>
        <input required type="number" step="0.01" inputMode="decimal" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      {vehicles.length > 0 && (
        <div className="field">
          <label>Veículo (opcional)</label>
          <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
            <option value="">Nenhum</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.plate} — {v.brand} {v.model}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="field">
        <label>Data (opcional)</label>
        <input type="date" value={incurredAt} onChange={(e) => setIncurredAt(e.target.value)} />
      </div>
      <button className="btn" type="submit" disabled={submitting}>
        {submitting ? 'Salvando...' : 'Registrar despesa'}
      </button>
    </form>
  );
}

function EditExpenseForm({
  expense,
  vehicles,
  onSaved,
  onCancel,
}: {
  expense: Expense;
  vehicles: Vehicle[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [vehicleId, setVehicleId] = useState(expense.vehicleId ?? '');
  const [category, setCategory] = useState<'maintenance' | 'fuel' | 'insurance' | 'other'>(
    expense.category as 'maintenance' | 'fuel' | 'insurance' | 'other',
  );
  const [description, setDescription] = useState(expense.description);
  const [amount, setAmount] = useState(expense.amount);
  const [incurredAt, setIncurredAt] = useState(expense.incurredAt.slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.patch(`/expenses/${expense.id}`, {
        vehicleId: vehicleId || undefined,
        category,
        description,
        amount,
        incurredAt: new Date(incurredAt).toISOString(),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao salvar a despesa.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h3 style={{ marginTop: 0 }}>Editar despesa</h3>
      {error && <div className="error-banner">{error}</div>}
      <div className="field">
        <label>Veículo (opcional)</label>
        <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
          <option value="">Nenhum</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.plate} — {v.brand} {v.model}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Categoria</label>
        <select value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
          <option value="maintenance">Manutenção</option>
          <option value="fuel">Combustível</option>
          <option value="insurance">Seguro</option>
          <option value="other">Outro</option>
        </select>
      </div>
      <div className="field">
        <label>Descrição</label>
        <input required value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="field">
        <label>Valor (R$)</label>
        <input required type="number" step="0.01" inputMode="decimal" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      <div className="field" style={{ marginBottom: 14 }}>
        <label>Data</label>
        <input required type="date" value={incurredAt} onChange={(e) => setIncurredAt(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? 'Salvando...' : 'Salvar alterações'}
        </button>
        <button type="button" className="logout-btn" style={{ color: 'var(--ink-muted)', borderColor: 'var(--border)' }} onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
