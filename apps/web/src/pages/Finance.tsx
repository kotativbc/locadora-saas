import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '../api';

interface Charge {
  id: string;
  type: string;
  description: string;
  amount: string;
  status: string;
  dueDate: string | null;
  paidAt: string | null;
  customer: { name: string } | null;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  rental: 'Aluguel',
  damage: 'Avaria',
  fine: 'Multa',
  other: 'Outro',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  cancelled: 'Cancelado',
};

function formatCurrency(value: string) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function Finance() {
  const [charges, setCharges] = useState<Charge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setCharges(await api.get<Charge[]>('/charges'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar lançamentos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleStatusChange(id: string, status: string) {
    setSavingId(id);
    try {
      await api.patch(`/charges/${id}`, { status });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao atualizar lançamento.');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Lançamentos</h1>
        <div className="page-header__rule" />
      </div>
      <p style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: -8 }}>
        Lançamentos de aluguel, avaria e multa nascem automaticamente quando o contrato é assinado ou
        quando a avaria/multa é marcada "cobrar do cliente".
      </p>

      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <strong>{charges.length} lançamento(s)</strong>
          <button className="btn btn--accent" onClick={() => setFormOpen((v) => !v)}>
            {formOpen ? 'Cancelar' : '+ Lançamento manual'}
          </button>
        </div>

        {loading ? (
          <p>Carregando...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Descrição</th>
                <th>Cliente</th>
                <th>Valor</th>
                <th>Vencimento</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {charges.map((c) => (
                <tr key={c.id}>
                  <td>{TYPE_LABELS[c.type] ?? c.type}</td>
                  <td>{c.description}</td>
                  <td>{c.customer?.name ?? '—'}</td>
                  <td>{formatCurrency(c.amount)}</td>
                  <td>{c.dueDate ? new Date(c.dueDate).toLocaleDateString('pt-BR') : '—'}</td>
                  <td>
                    <select
                      value={c.status}
                      disabled={savingId === c.id}
                      onChange={(e) => handleStatusChange(c.id, e.target.value)}
                      style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border)' }}
                    >
                      {Object.entries(STATUS_LABELS).map(([code, label]) => (
                        <option key={code} value={code}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {formOpen && <NewChargeForm onCreated={() => { setFormOpen(false); load(); }} />}
    </div>
  );
}

function NewChargeForm({ onCreated }: { onCreated: () => void }) {
  const [type, setType] = useState<'rental' | 'damage' | 'fine' | 'other'>('other');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/charges', {
        type,
        description,
        amount,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao criar lançamento.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h3 style={{ marginTop: 0 }}>Novo lançamento manual</h3>
      {error && <div className="error-banner">{error}</div>}
      <div className="field">
        <label>Tipo</label>
        <select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
          <option value="other">Outro</option>
          <option value="rental">Aluguel</option>
          <option value="damage">Avaria</option>
          <option value="fine">Multa</option>
        </select>
      </div>
      <div className="field">
        <label>Descrição</label>
        <input required value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="field">
        <label>Valor (R$)</label>
        <input required type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      <div className="field">
        <label>Vencimento (opcional)</label>
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>
      <button className="btn" type="submit" disabled={submitting}>
        {submitting ? 'Salvando...' : 'Criar lançamento'}
      </button>
    </form>
  );
}
