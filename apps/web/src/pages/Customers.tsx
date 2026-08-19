import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '../api';
import { EmptyState } from '../components/EmptyState';

interface Customer {
  id: string;
  name: string;
  document: string;
  documentType: string;
  email: string | null;
  phone: string | null;
  active: boolean;
  createdAt: string;
}

export function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setCustomers(await api.get<Customer[]>('/customers'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar clientes.');
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
        <h1>Clientes</h1>
        <div className="page-header__rule" />
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <strong>{customers.length} cliente(s)</strong>
          <button className="btn btn--accent" onClick={() => setFormOpen((v) => !v)}>
            {formOpen ? 'Cancelar' : '+ Novo cliente'}
          </button>
        </div>

        {loading ? (
          <p>Carregando...</p>
        ) : customers.length === 0 ? (
          <EmptyState title="Nenhum cliente cadastrado" body="Cadastre o primeiro cliente pra começar a criar contratos." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Documento</th>
                <th>Contato</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>
                    <span className="plate">{c.document}</span>
                  </td>
                  <td>{c.email || c.phone || '—'}</td>
                  <td>{c.active ? 'Ativo' : 'Inativo'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {formOpen && <NewCustomerForm onCreated={() => { setFormOpen(false); load(); }} />}
    </div>
  );
}

function NewCustomerForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [document, setDocument] = useState('');
  const [documentType, setDocumentType] = useState<'CPF' | 'CNPJ'>('CPF');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [driverLicenseNumber, setDriverLicenseNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/customers', {
        name,
        document,
        documentType,
        email: email || undefined,
        phone: phone || undefined,
        driverLicenseNumber: driverLicenseNumber || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao cadastrar cliente.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h3 style={{ marginTop: 0 }}>Novo cliente</h3>
      {error && <div className="error-banner">{error}</div>}
      <div className="field">
        <label>Nome completo</label>
        <input required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label>Tipo de documento</label>
        <select value={documentType} onChange={(e) => setDocumentType(e.target.value as 'CPF' | 'CNPJ')}>
          <option value="CPF">CPF</option>
          <option value="CNPJ">CNPJ</option>
        </select>
      </div>
      <div className="field">
        <label>{documentType}</label>
        <input required value={document} onChange={(e) => setDocument(e.target.value)} />
      </div>
      <div className="field">
        <label>E-mail (opcional)</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="field">
        <label>Telefone (opcional)</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div className="field">
        <label>Nº da CNH (opcional)</label>
        <input value={driverLicenseNumber} onChange={(e) => setDriverLicenseNumber(e.target.value)} />
      </div>
      <button className="btn" type="submit" disabled={submitting}>
        {submitting ? 'Cadastrando...' : 'Cadastrar cliente'}
      </button>
    </form>
  );
}
