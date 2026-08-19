import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '../api';
import { EmptyState } from '../components/EmptyState';

interface Company {
  id: string;
  name: string;
  tradeName: string | null;
  cnpj: string | null;
  active: boolean;
  createdAt: string;
}

export function Companies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setCompanies(await api.get<Company[]>('/companies'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar empresas.');
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
        <h1>Empresas cadastradas</h1>
        <div className="page-header__rule" />
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <strong>{companies.length} empresa(s)</strong>
          <button className="btn btn--accent" onClick={() => setFormOpen((v) => !v)}>
            {formOpen ? 'Cancelar' : '+ Nova empresa'}
          </button>
        </div>

        {loading ? (
          <p>Carregando...</p>
        ) : companies.length === 0 ? (
          <EmptyState title="Nenhuma empresa cadastrada" body="Cadastre a primeira empresa locadora pra começar a usar a plataforma." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>CNPJ</th>
                <th>Status</th>
                <th>Criada em</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.cnpj ? <span className="plate">{c.cnpj}</span> : '—'}</td>
                  <td>{c.active ? 'Ativa' : 'Inativa'}</td>
                  <td>{new Date(c.createdAt).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {formOpen && <NewCompanyForm onCreated={() => { setFormOpen(false); load(); }} />}
    </div>
  );
}

function NewCompanyForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/companies', {
        name,
        tradeName: tradeName || undefined,
        cnpj: cnpj || undefined,
        adminName,
        adminEmail,
        adminPassword,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao criar empresa.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h3 style={{ marginTop: 0 }}>Nova empresa</h3>
      {error && <div className="error-banner">{error}</div>}
      <div className="field">
        <label>Razão social</label>
        <input required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label>Nome fantasia (opcional)</label>
        <input value={tradeName} onChange={(e) => setTradeName(e.target.value)} />
      </div>
      <div className="field">
        <label>CNPJ (opcional)</label>
        <input value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
      </div>
      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '18px 0' }} />
      <p style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: 0 }}>
        Dados do administrador inicial desta empresa:
      </p>
      <div className="field">
        <label>Nome do admin</label>
        <input required value={adminName} onChange={(e) => setAdminName(e.target.value)} />
      </div>
      <div className="field">
        <label>E-mail do admin</label>
        <input required type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
      </div>
      <div className="field">
        <label>Senha inicial</label>
        <input
          required
          type="password"
          minLength={8}
          value={adminPassword}
          onChange={(e) => setAdminPassword(e.target.value)}
        />
      </div>
      <button className="btn" type="submit" disabled={submitting}>
        {submitting ? 'Criando...' : 'Criar empresa'}
      </button>
    </form>
  );
}
