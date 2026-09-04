import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '../api';
import { StatusSelect, type StatusOption } from '../components/StatusSelect';
import { EmptyState } from '../components/EmptyState';

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

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'pending', label: 'Pendente', variant: 'warning' },
  { value: 'paid', label: 'Pago', variant: 'success' },
  { value: 'cancelled', label: 'Cancelado', variant: 'danger' },
];

function formatCurrency(value: string) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

interface Customer {
  id: string;
  name: string;
  document: string;
}

interface ContractOption {
  id: string;
  status: string;
  customer: { name: string };
  vehicle: { plate: string };
}

export function Finance() {
  const [charges, setCharges] = useState<Charge[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [contracts, setContracts] = useState<ContractOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [ch, c, ct] = await Promise.all([
        api.get<Charge[]>('/charges'),
        api.get<Customer[]>('/customers'),
        api.get<ContractOption[]>('/contracts'),
      ]);
      setCharges(ch);
      setCustomers(c);
      setContracts(ct);
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

  async function handleDelete(charge: Charge) {
    const statusWarning =
      charge.status === 'paid'
        ? ' ATENÇÃO: este já está marcado como PAGO — excluir remove o registro de um valor que realmente entrou.'
        : '';
    if (!window.confirm(`Excluir o lançamento "${charge.description}" (${formatCurrency(charge.amount)})?${statusWarning}`)) {
      return;
    }
    setError(null);
    try {
      await api.delete(`/charges/${charge.id}`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao excluir o lançamento.');
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
        ) : charges.length === 0 ? (
          <EmptyState title="Nenhum lançamento ainda" body="Lançamentos de aluguel, avaria e multa aparecem aqui automaticamente." />
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
                <th></th>
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
                    <StatusSelect
                      value={c.status}
                      options={STATUS_OPTIONS}
                      disabled={savingId === c.id}
                      onChange={(status) => handleStatusChange(c.id, status)}
                    />
                  </td>
                  <td>
                    <button
                      className="logout-btn"
                      style={{ color: 'var(--rtv-danger)', borderColor: 'var(--border)' }}
                      onClick={() => handleDelete(c)}
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {formOpen && (
        <NewChargeForm customers={customers} contracts={contracts} onCreated={() => { setFormOpen(false); load(); }} />
      )}
    </div>
  );
}

function NewChargeForm({
  customers,
  contracts,
  onCreated,
}: {
  customers: Customer[];
  contracts: ContractOption[];
  onCreated: () => void;
}) {
  const [type, setType] = useState<'rental' | 'damage' | 'fine' | 'other'>('other');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [linkMode, setLinkMode] = useState<'none' | 'contract' | 'customer'>('none');
  const [contractId, setContractId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const activeContracts = contracts.filter((c) => c.status === 'active');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/charges', {
        type,
        contractId: linkMode === 'contract' ? contractId || undefined : undefined,
        customerId: linkMode === 'customer' ? customerId || undefined : undefined,
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
        <input required type="number" step="0.01" inputMode="decimal" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      <div className="field">
        <label>Vencimento (opcional)</label>
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>

      <div className="field-group">
        <div className="field-group__label">Vínculo (opcional)</div>
        <div className="field" style={{ marginBottom: linkMode === 'none' ? 0 : undefined }}>
          <label>Atrelar a</label>
          <select value={linkMode} onChange={(e) => setLinkMode(e.target.value as typeof linkMode)}>
            <option value="none">Nada</option>
            <option value="contract">Um contrato vigente</option>
            <option value="customer">Um cliente direto (sem contrato)</option>
          </select>
        </div>
        {linkMode === 'contract' && (
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Contrato</label>
            <select value={contractId} onChange={(e) => setContractId(e.target.value)}>
              <option value="">Selecione...</option>
              {activeContracts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.customer.name} — {c.vehicle.plate}
                </option>
              ))}
            </select>
          </div>
        )}
        {linkMode === 'customer' && (
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Cliente</label>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Selecione...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.document}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <button className="btn" type="submit" disabled={submitting}>
        {submitting ? 'Salvando...' : 'Criar lançamento'}
      </button>
    </form>
  );
}
