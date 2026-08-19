import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '../api';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge } from '../components/StatusBadge';

interface Plan {
  id: string;
  code: string;
  name: string;
  maxVehicles: number | null;
  maxUsers: number | null;
  active: boolean;
  _count: { companies: number };
}

export function Plans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setPlans(await api.get<Plan[]>('/plans'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar planos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleToggleActive(plan: Plan) {
    setSavingId(plan.id);
    try {
      await api.patch(`/plans/${plan.id}`, { active: !plan.active });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao atualizar plano.');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Planos</h1>
        <div className="page-header__rule" />
      </div>
      <p style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: -8 }}>
        Limites de veículos e usuários por plano. Deixe em branco pra "sem limite". A regra é checada
        automaticamente sempre que uma empresa cadastra um veículo ou usuário novo.
      </p>

      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <strong>{plans.length} plano(s)</strong>
          <button className="btn btn--accent" onClick={() => setFormOpen((v) => !v)}>
            {formOpen ? 'Cancelar' : '+ Novo plano'}
          </button>
        </div>

        {loading ? (
          <p>Carregando...</p>
        ) : plans.length === 0 ? (
          <EmptyState title="Nenhum plano cadastrado" body="Sem plano, as empresas ficam sem limite de veículos/usuários." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Código</th>
                <th>Limite de veículos</th>
                <th>Limite de usuários</th>
                <th>Empresas usando</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>
                    <span className="plate">{p.code}</span>
                  </td>
                  <td>{p.maxVehicles ?? 'Sem limite'}</td>
                  <td>{p.maxUsers ?? 'Sem limite'}</td>
                  <td>{p._count.companies}</td>
                  <td>
                    <StatusBadge label={p.active ? 'Ativo' : 'Inativo'} variant={p.active ? 'success' : 'neutral'} />
                  </td>
                  <td>
                    <button
                      className="logout-btn"
                      style={{ color: 'var(--rtv-navy-900)', borderColor: 'var(--rtv-line-strong)' }}
                      disabled={savingId === p.id}
                      onClick={() => handleToggleActive(p)}
                    >
                      {p.active ? 'Desativar' : 'Ativar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {formOpen && <NewPlanForm onCreated={() => { setFormOpen(false); load(); }} />}
    </div>
  );
}

function NewPlanForm({ onCreated }: { onCreated: () => void }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [maxVehicles, setMaxVehicles] = useState('');
  const [maxUsers, setMaxUsers] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/plans', {
        code,
        name,
        maxVehicles: maxVehicles ? Number(maxVehicles) : undefined,
        maxUsers: maxUsers ? Number(maxUsers) : undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao criar plano.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h3 style={{ marginTop: 0 }}>Novo plano</h3>
      {error && <div className="error-banner">{error}</div>}
      <div className="field">
        <label>Nome</label>
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Profissional" />
      </div>
      <div className="field">
        <label>Código (identificador único, sem espaço)</label>
        <input required value={code} onChange={(e) => setCode(e.target.value)} placeholder="Ex: profissional" />
      </div>
      <div className="field">
        <label>Limite de veículos (vazio = sem limite)</label>
        <input type="number" min="0" value={maxVehicles} onChange={(e) => setMaxVehicles(e.target.value)} />
      </div>
      <div className="field">
        <label>Limite de usuários (vazio = sem limite)</label>
        <input type="number" min="0" value={maxUsers} onChange={(e) => setMaxUsers(e.target.value)} />
      </div>
      <button className="btn" type="submit" disabled={submitting}>
        {submitting ? 'Criando...' : 'Criar plano'}
      </button>
    </form>
  );
}
