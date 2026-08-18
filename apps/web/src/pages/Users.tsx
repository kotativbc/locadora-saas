import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '../api';

interface UserRow {
  id: string;
  name: string;
  email: string;
  active: boolean;
  lastLoginAt: string | null;
  roles: { role: { code: string; name: string } }[];
}

const ROLE_LABELS: Record<string, string> = {
  COMPANY_ADMIN: 'Admin da empresa',
  FLEET_MANAGER: 'Gestor de frota',
  AGENT: 'Atendente',
  FINANCE: 'Financeiro',
  CLIENT: 'Cliente',
};

export function Users() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setUsers(await api.get<UserRow[]>('/users'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar usuários.');
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
        <h1>Usuários da empresa</h1>
        <div className="page-header__rule" />
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <strong>{users.length} usuário(s)</strong>
          <button className="btn btn--accent" onClick={() => setFormOpen((v) => !v)}>
            {formOpen ? 'Cancelar' : '+ Novo usuário'}
          </button>
        </div>

        {loading ? (
          <p>Carregando...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Papel</th>
                <th>Status</th>
                <th>Último acesso</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.roles.map((r) => ROLE_LABELS[r.role.code] ?? r.role.code).join(', ')}</td>
                  <td>{u.active ? 'Ativo' : 'Inativo'}</td>
                  <td>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('pt-BR') : 'Nunca'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {formOpen && <NewUserForm onCreated={() => { setFormOpen(false); load(); }} />}
    </div>
  );
}

function NewUserForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleCode, setRoleCode] = useState('AGENT');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/users', { name, email, password, roleCode });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao criar usuário.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h3 style={{ marginTop: 0 }}>Novo usuário</h3>
      {error && <div className="error-banner">{error}</div>}
      <div className="field">
        <label>Nome</label>
        <input required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label>E-mail</label>
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="field">
        <label>Senha inicial</label>
        <input required type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div className="field">
        <label>Papel</label>
        <select value={roleCode} onChange={(e) => setRoleCode(e.target.value)}>
          {Object.entries(ROLE_LABELS).map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <button className="btn" type="submit" disabled={submitting}>
        {submitting ? 'Criando...' : 'Criar usuário'}
      </button>
    </form>
  );
}
