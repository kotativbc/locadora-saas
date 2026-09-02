import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '../api';
import { StatusBadge } from '../components/StatusBadge';
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

interface DamageRecord {
  id: string;
  description: string;
  severity: string;
  estimatedCost: string | null;
  chargeToCustomer: boolean;
  status: string;
  createdAt: string;
  vehicle: { plate: string; brand: string; model: string };
}

const SEVERITY_LABELS: Record<string, string> = {
  minor: 'Leve',
  moderate: 'Moderada',
  severe: 'Grave',
};

function formatCurrency(value: string) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function Damages() {
  const [damages, setDamages] = useState<DamageRecord[]>([]);
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
      const [d, v, c, ct] = await Promise.all([
        api.get<DamageRecord[]>('/damages'),
        api.get<Vehicle[]>('/vehicles'),
        api.get<Customer[]>('/customers'),
        api.get<ContractOption[]>('/contracts'),
      ]);
      setDamages(d);
      setVehicles(v);
      setCustomers(c);
      setContracts(ct);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar avarias.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleResolve(id: string) {
    setSavingId(id);
    try {
      await api.patch(`/damages/${id}`, { status: 'resolved' });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao atualizar avaria.');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Avarias</h1>
        <div className="page-header__rule" />
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <strong>{damages.length} avaria(s)</strong>
          <button className="btn btn--accent" onClick={() => setFormOpen((v) => !v)}>
            {formOpen ? 'Cancelar' : '+ Nova avaria'}
          </button>
        </div>

        {loading ? (
          <p>Carregando...</p>
        ) : damages.length === 0 ? (
          <EmptyState title="Nenhuma avaria registrada" body="Avarias encontradas em vistorias ou registradas avulsas aparecem aqui." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Veículo</th>
                <th>Descrição</th>
                <th>Gravidade</th>
                <th>Custo estimado</th>
                <th>Cobrar do cliente</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {damages.map((d) => (
                <tr key={d.id}>
                  <td>
                    <span className="plate">{d.vehicle.plate}</span> {d.vehicle.brand} {d.vehicle.model}
                  </td>
                  <td>{d.description}</td>
                  <td>{SEVERITY_LABELS[d.severity] ?? d.severity}</td>
                  <td>{d.estimatedCost ? formatCurrency(d.estimatedCost) : '—'}</td>
                  <td>{d.chargeToCustomer ? 'Sim' : 'Não'}</td>
                  <td>
                    <StatusBadge
                      label={d.status === 'resolved' ? 'Resolvida' : 'Em aberto'}
                      variant={d.status === 'resolved' ? 'success' : 'warning'}
                    />
                  </td>
                  <td>
                    {d.status === 'open' && (
                      <button
                        className="logout-btn"
                        style={{ color: 'var(--primary)', borderColor: 'var(--border)' }}
                        disabled={savingId === d.id}
                        onClick={() => handleResolve(d.id)}
                      >
                        Marcar resolvida
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {formOpen && (
        <NewDamageForm vehicles={vehicles} customers={customers} contracts={contracts} onCreated={() => { setFormOpen(false); load(); }} />
      )}
    </div>
  );
}

function NewDamageForm({
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
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'minor' | 'moderate' | 'severe'>('minor');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [chargeToCustomer, setChargeToCustomer] = useState(false);
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
      await api.post('/damages', {
        vehicleId,
        contractId: linkMode === 'contract' ? contractId || undefined : undefined,
        customerId: linkMode === 'customer' ? customerId || undefined : undefined,
        description,
        severity,
        estimatedCost: estimatedCost || undefined,
        chargeToCustomer,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao registrar avaria.');
    } finally {
      setSubmitting(false);
    }
  }

  if (vehicles.length === 0) {
    return (
      <div className="card">
        <p style={{ margin: 0 }}>Cadastre pelo menos um veículo antes de registrar uma avaria.</p>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h3 style={{ marginTop: 0 }}>Nova avaria</h3>
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
        <label>Descrição</label>
        <input required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: risco na porta traseira direita" />
      </div>
      <div className="field">
        <label>Gravidade</label>
        <select value={severity} onChange={(e) => setSeverity(e.target.value as 'minor' | 'moderate' | 'severe')}>
          <option value="minor">Leve</option>
          <option value="moderate">Moderada</option>
          <option value="severe">Grave</option>
        </select>
      </div>
      <div className="field">
        <label>Custo estimado (R$, opcional)</label>
        <input type="number" step="0.01" min="0" value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)} />
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
        Se marcado e houver custo estimado, já cria um lançamento em Financeiro → Lançamentos
        {linkMode === 'none' ? ' — mas precisa de um contrato ou cliente vinculado acima pra saber quem cobrar' : ''}.
      </p>
      <button className="btn" type="submit" disabled={submitting}>
        {submitting ? 'Salvando...' : 'Registrar avaria'}
      </button>
    </form>
  );
}
