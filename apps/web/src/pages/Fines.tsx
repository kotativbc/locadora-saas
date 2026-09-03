import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '../api';
import { StatusSelect, type StatusOption } from '../components/StatusSelect';
import { EmptyState } from '../components/EmptyState';

interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
}

interface Customer {
  id: string;
  name: string;
  document: string;
}

interface ContractOption {
  id: string;
  status: string;
  vehicleId: string;
  customer: { name: string };
  vehicle: { plate: string };
}

interface Fine {
  id: string;
  infractionDate: string;
  amount: string;
  description: string;
  status: string;
  chargeToCustomer: boolean;
  vehicle: { plate: string; brand: string; model: string };
}

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'pending', label: 'Pendente', variant: 'warning' },
  { value: 'paid', label: 'Paga', variant: 'success' },
  { value: 'contested', label: 'Contestada', variant: 'danger' },
];

function formatCurrency(value: string) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function Fines() {
  const [fines, setFines] = useState<Fine[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [contracts, setContracts] = useState<ContractOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [f, v, c, ct] = await Promise.all([
        api.get<Fine[]>('/fines'),
        api.get<Vehicle[]>('/vehicles'),
        api.get<Customer[]>('/customers'),
        api.get<ContractOption[]>('/contracts'),
      ]);
      setFines(f);
      setVehicles(v);
      setCustomers(c);
      setContracts(ct);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar multas.');
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
      await api.patch(`/fines/${id}`, { status });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao atualizar multa.');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Multas</h1>
        <div className="page-header__rule" />
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <strong>{fines.length} multa(s)</strong>
          <button className="btn btn--accent" onClick={() => setFormOpen((v) => !v)}>
            {formOpen ? 'Cancelar' : '+ Nova multa'}
          </button>
        </div>

        {loading ? (
          <p>Carregando...</p>
        ) : fines.length === 0 ? (
          <EmptyState title="Nenhuma multa registrada" body="Multas de trânsito recebidas pelos veículos aparecem aqui." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Veículo</th>
                <th>Data da infração</th>
                <th>Descrição</th>
                <th>Valor</th>
                <th>Cobrar do cliente</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {fines.map((f) => (
                <tr key={f.id}>
                  <td>
                    <span className="plate">{f.vehicle.plate}</span> {f.vehicle.brand} {f.vehicle.model}
                  </td>
                  <td>{new Date(f.infractionDate).toLocaleDateString('pt-BR')}</td>
                  <td>{f.description}</td>
                  <td>{formatCurrency(f.amount)}</td>
                  <td>{f.chargeToCustomer ? 'Sim' : 'Não'}</td>
                  <td>
                    <StatusSelect
                      value={f.status}
                      options={STATUS_OPTIONS}
                      disabled={savingId === f.id}
                      onChange={(status) => handleStatusChange(f.id, status)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {formOpen && (
        <NewFineForm vehicles={vehicles} customers={customers} contracts={contracts} onCreated={() => { setFormOpen(false); load(); }} />
      )}
    </div>
  );
}

function NewFineForm({
  vehicles,
  customers,
  contracts,
  onCreated,
}: {
  vehicles: Vehicle[];
  customers: Customer[];
  contracts: ContractOption[];
  onCreated: () => void;
}) {
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ?? '');
  const [infractionDate, setInfractionDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [chargeToCustomer, setChargeToCustomer] = useState(true);
  const [linkMode, setLinkMode] = useState<'none' | 'contract' | 'customer'>('none');
  const [contractId, setContractId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const relevantContracts = contracts.filter((c) => c.vehicleId === vehicleId && c.status === 'active');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/fines', {
        vehicleId,
        contractId: linkMode === 'contract' ? contractId || undefined : undefined,
        customerId: linkMode === 'customer' ? customerId || undefined : undefined,
        infractionDate: new Date(infractionDate).toISOString(),
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        amount,
        description,
        documentNumber: documentNumber || undefined,
        chargeToCustomer,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao registrar multa.');
    } finally {
      setSubmitting(false);
    }
  }

  if (vehicles.length === 0) {
    return (
      <div className="card">
        <p style={{ margin: 0 }}>Cadastre pelo menos um veículo antes de registrar uma multa.</p>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h3 style={{ marginTop: 0 }}>Nova multa</h3>
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
        <label>Data da infração</label>
        <input required type="date" value={infractionDate} onChange={(e) => setInfractionDate(e.target.value)} />
      </div>
      <div className="field">
        <label>Vencimento (opcional)</label>
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>
      <div className="field">
        <label>Valor (R$)</label>
        <input required type="number" step="0.01" inputMode="decimal" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      <div className="field">
        <label>Descrição da infração</label>
        <input required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: excesso de velocidade" />
      </div>
      <div className="field">
        <label>Nº do AIT/notificação (opcional)</label>
        <input value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} />
      </div>

      <div className="field-group">
        <div className="field-group__label">Vínculo (opcional)</div>
        <div className="field" style={{ marginBottom: linkMode === 'none' ? 0 : undefined }}>
          <label>Atrelar a</label>
          <select value={linkMode} onChange={(e) => setLinkMode(e.target.value as typeof linkMode)}>
            <option value="none">Nada — só o veículo</option>
            <option value="contract">Um contrato vigente</option>
            <option value="customer">Um cliente direto (sem contrato)</option>
          </select>
        </div>
        {linkMode === 'contract' && (
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Contrato</label>
            {relevantContracts.length === 0 ? (
              <p style={{ fontSize: 12.5, color: 'var(--ink-muted)', margin: 0 }}>
                Nenhum contrato ativo para este veículo.
              </p>
            ) : (
              <select value={contractId} onChange={(e) => setContractId(e.target.value)}>
                <option value="">Selecione...</option>
                {relevantContracts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.customer.name} — {c.vehicle.plate}
                  </option>
                ))}
              </select>
            )}
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

      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, marginBottom: 4 }}>
        <input type="checkbox" checked={chargeToCustomer} onChange={(e) => setChargeToCustomer(e.target.checked)} />
        Cobrar do cliente
      </label>
      <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 0, marginBottom: 14 }}>
        Se marcado, já cria um lançamento em Financeiro → Lançamentos
        {linkMode === 'none' ? ' — mas precisa de um contrato ou cliente vinculado acima pra saber quem cobrar' : ''}.
      </p>
      <button className="btn" type="submit" disabled={submitting}>
        {submitting ? 'Salvando...' : 'Registrar multa'}
      </button>
    </form>
  );
}
