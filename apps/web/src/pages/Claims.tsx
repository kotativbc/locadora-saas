import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '../api';
import { StatusSelect, type StatusOption } from '../components/StatusSelect';
import { formatDateOnly } from '../dateUtils';
import { EmptyState } from '../components/EmptyState';

interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
}

interface Claim {
  id: string;
  type: string;
  occurredAt: string;
  location: string | null;
  description: string;
  policeReportNumber: string | null;
  thirdPartyInvolved: boolean;
  thirdPartyDescription: string | null;
  insuranceClaimNumber: string | null;
  status: string;
  estimatedCost: string | null;
  vehicle: { plate: string; brand: string; model: string };
}

const TYPE_LABELS: Record<string, string> = {
  accident: 'Acidente',
  theft: 'Roubo/Furto',
  fire: 'Incêndio',
  other: 'Outro',
};

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'open', label: 'Aberto', variant: 'warning' },
  { value: 'in_progress', label: 'Em andamento', variant: 'info' },
  { value: 'resolved', label: 'Resolvido', variant: 'success' },
  { value: 'closed', label: 'Fechado', variant: 'neutral' },
];

function formatCurrency(value: string) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function Claims() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<Claim | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [c, v] = await Promise.all([api.get<Claim[]>('/claims'), api.get<Vehicle[]>('/vehicles')]);
      setClaims(c);
      setVehicles(v);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar sinistros.');
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
      await api.patch(`/claims/${id}`, { status });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao atualizar sinistro.');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Sinistros</h1>
        <div className="page-header__rule" />
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <strong>{claims.length} sinistro(s)</strong>
          <button className="btn btn--accent" onClick={() => setFormOpen((v) => !v)}>
            {formOpen ? 'Cancelar' : '+ Novo sinistro'}
          </button>
        </div>

        {loading ? (
          <p>Carregando...</p>
        ) : claims.length === 0 ? (
          <EmptyState title="Nenhum sinistro registrado" body="Quando um acidente, roubo ou outro sinistro acontecer, registre aqui." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Veículo</th>
                <th>Tipo</th>
                <th>Data</th>
                <th>Descrição</th>
                <th>Custo estimado</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {claims.map((c) => (
                <tr key={c.id}>
                  <td>
                    <span className="plate">{c.vehicle.plate}</span> {c.vehicle.brand} {c.vehicle.model}
                  </td>
                  <td>{TYPE_LABELS[c.type] ?? c.type}</td>
                  <td>{formatDateOnly(c.occurredAt)}</td>
                  <td>{c.description}</td>
                  <td>{c.estimatedCost ? formatCurrency(c.estimatedCost) : '—'}</td>
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
                      style={{ color: 'var(--primary)', borderColor: 'var(--border)' }}
                      onClick={() => setEditTarget(c)}
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

      {formOpen && <NewClaimForm vehicles={vehicles} onCreated={() => { setFormOpen(false); load(); }} />}

      {editTarget && (
        <EditClaimForm
          claim={editTarget}
          onSaved={() => { setEditTarget(null); load(); }}
          onCancel={() => setEditTarget(null)}
        />
      )}
    </div>
  );
}

function NewClaimForm({ vehicles, onCreated }: { vehicles: Vehicle[]; onCreated: () => void }) {
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ?? '');
  const [type, setType] = useState<'accident' | 'theft' | 'fire' | 'other'>('accident');
  const [occurredAt, setOccurredAt] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [policeReportNumber, setPoliceReportNumber] = useState('');
  const [thirdPartyInvolved, setThirdPartyInvolved] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/claims', {
        vehicleId,
        type,
        occurredAt: new Date(occurredAt).toISOString(),
        location: location || undefined,
        description,
        policeReportNumber: policeReportNumber || undefined,
        thirdPartyInvolved,
        estimatedCost: estimatedCost || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao registrar sinistro.');
    } finally {
      setSubmitting(false);
    }
  }

  if (vehicles.length === 0) {
    return (
      <div className="card">
        <p style={{ margin: 0 }}>Cadastre pelo menos um veículo antes de registrar um sinistro.</p>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h3 style={{ marginTop: 0 }}>Novo sinistro</h3>
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
        <select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
          <option value="accident">Acidente</option>
          <option value="theft">Roubo/Furto</option>
          <option value="fire">Incêndio</option>
          <option value="other">Outro</option>
        </select>
      </div>
      <div className="field">
        <label>Data e hora</label>
        <input required type="datetime-local" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} />
      </div>
      <div className="field">
        <label>Local (opcional)</label>
        <input value={location} onChange={(e) => setLocation(e.target.value)} />
      </div>
      <div className="field">
        <label>Descrição</label>
        <input required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="O que aconteceu" />
      </div>
      <div className="field">
        <label>Nº do B.O. (opcional)</label>
        <input value={policeReportNumber} onChange={(e) => setPoliceReportNumber(e.target.value)} />
      </div>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, marginBottom: 14 }}>
        <input type="checkbox" checked={thirdPartyInvolved} onChange={(e) => setThirdPartyInvolved(e.target.checked)} />
        Envolveu terceiros
      </label>
      <div className="field">
        <label>Custo estimado (R$, opcional)</label>
        <input type="number" step="0.01" inputMode="decimal" min="0" value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)} />
      </div>
      <button className="btn" type="submit" disabled={submitting}>
        {submitting ? 'Salvando...' : 'Registrar sinistro'}
      </button>
    </form>
  );
}

function EditClaimForm({
  claim,
  onSaved,
  onCancel,
}: {
  claim: Claim;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<'accident' | 'theft' | 'fire' | 'other'>(claim.type as 'accident' | 'theft' | 'fire' | 'other');
  const [occurredAt, setOccurredAt] = useState(claim.occurredAt.slice(0, 10));
  const [location, setLocation] = useState(claim.location ?? '');
  const [description, setDescription] = useState(claim.description);
  const [policeReportNumber, setPoliceReportNumber] = useState(claim.policeReportNumber ?? '');
  const [thirdPartyInvolved, setThirdPartyInvolved] = useState(claim.thirdPartyInvolved);
  const [thirdPartyDescription, setThirdPartyDescription] = useState(claim.thirdPartyDescription ?? '');
  const [insuranceClaimNumber, setInsuranceClaimNumber] = useState(claim.insuranceClaimNumber ?? '');
  const [estimatedCost, setEstimatedCost] = useState(claim.estimatedCost ?? '');
  const [status, setStatus] = useState<'open' | 'in_progress' | 'resolved' | 'closed'>(
    claim.status as 'open' | 'in_progress' | 'resolved' | 'closed',
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.patch(`/claims/${claim.id}`, {
        type,
        occurredAt: new Date(occurredAt).toISOString(),
        location: location || undefined,
        description,
        policeReportNumber: policeReportNumber || undefined,
        thirdPartyInvolved,
        thirdPartyDescription: thirdPartyDescription || undefined,
        insuranceClaimNumber: insuranceClaimNumber || undefined,
        estimatedCost: estimatedCost || undefined,
        status,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao salvar o sinistro.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h3 style={{ marginTop: 0 }}>Editar sinistro — {claim.vehicle.plate}</h3>
      {error && <div className="error-banner">{error}</div>}
      <div className="field">
        <label>Tipo</label>
        <select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
          <option value="accident">Acidente</option>
          <option value="theft">Roubo/Furto</option>
          <option value="fire">Incêndio</option>
          <option value="other">Outro</option>
        </select>
      </div>
      <div className="field">
        <label>Data</label>
        <input required type="date" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} />
      </div>
      <div className="field">
        <label>Local (opcional)</label>
        <input value={location} onChange={(e) => setLocation(e.target.value)} />
      </div>
      <div className="field">
        <label>Descrição</label>
        <input required value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="field">
        <label>Boletim de Ocorrência (opcional)</label>
        <input value={policeReportNumber} onChange={(e) => setPoliceReportNumber(e.target.value)} />
      </div>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, marginBottom: 12 }}>
        <input type="checkbox" checked={thirdPartyInvolved} onChange={(e) => setThirdPartyInvolved(e.target.checked)} />
        Envolveu terceiros
      </label>
      {thirdPartyInvolved && (
        <div className="field">
          <label>Descrição do terceiro envolvido</label>
          <input value={thirdPartyDescription} onChange={(e) => setThirdPartyDescription(e.target.value)} />
        </div>
      )}
      <div className="field">
        <label>Nº do sinistro no seguro (opcional)</label>
        <input value={insuranceClaimNumber} onChange={(e) => setInsuranceClaimNumber(e.target.value)} />
      </div>
      <div className="field">
        <label>Custo estimado (R$, opcional)</label>
        <input type="number" step="0.01" inputMode="decimal" min="0" value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)} />
      </div>
      <div className="field" style={{ marginBottom: 14 }}>
        <label>Status</label>
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="open">Aberto</option>
          <option value="in_progress">Em andamento</option>
          <option value="resolved">Resolvido</option>
          <option value="closed">Fechado</option>
        </select>
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
