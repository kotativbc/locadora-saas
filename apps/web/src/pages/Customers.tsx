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

  async function handleDelete(customer: Customer) {
    if (!window.confirm(`Excluir o cliente "${customer.name}"? Só é possível se ele não tiver nenhum contrato (nem rascunho). Documentos anexados dele também são apagados.`)) {
      return;
    }
    setError(null);
    try {
      await api.delete(`/customers/${customer.id}`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao excluir o cliente.');
    }
  }

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
                <th></th>
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

      {formOpen && <NewCustomerForm onCreated={() => { setFormOpen(false); load(); }} />}
    </div>
  );
}

function NewCustomerForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [document, setDocument] = useState('');
  const [identityNumber, setIdentityNumber] = useState('');
  const [documentType, setDocumentType] = useState<'CPF' | 'CNPJ'>('CPF');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [addressStreet, setAddressStreet] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [addressComplement, setAddressComplement] = useState('');
  const [addressNeighborhood, setAddressNeighborhood] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressState, setAddressState] = useState('');
  const [addressZipCode, setAddressZipCode] = useState('');
  const [driverLicenseNumber, setDriverLicenseNumber] = useState('');
  const [driverLicenseCategory, setDriverLicenseCategory] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAgency, setBankAgency] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [pixKey, setPixKey] = useState('');
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
        identityNumber: identityNumber || undefined,
        email: email || undefined,
        phone: phone || undefined,
        addressStreet,
        addressNumber,
        addressComplement: addressComplement || undefined,
        addressNeighborhood: addressNeighborhood || undefined,
        addressCity,
        addressState,
        addressZipCode: addressZipCode || undefined,
        driverLicenseNumber: driverLicenseNumber || undefined,
        driverLicenseCategory: driverLicenseCategory || undefined,
        bankName: bankName || undefined,
        bankAgency: bankAgency || undefined,
        bankAccount: bankAccount || undefined,
        pixKey: pixKey || undefined,
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

      <div className="field-group">
        <div className="field-group__label">Dados pessoais</div>
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
          <label>RG/Identidade (opcional)</label>
          <input value={identityNumber} onChange={(e) => setIdentityNumber(e.target.value)} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>E-mail (opcional)</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Telefone (opcional)</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>

      <div className="field-group">
        <div className="field-group__label">Endereço</div>
        <div style={{ display: 'flex', gap: 14 }}>
          <div className="field" style={{ flex: 3 }}>
            <label>Rua/Avenida</label>
            <input required value={addressStreet} onChange={(e) => setAddressStreet(e.target.value)} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Número</label>
            <input required value={addressNumber} onChange={(e) => setAddressNumber(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>Complemento (opcional)</label>
          <input value={addressComplement} onChange={(e) => setAddressComplement(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Bairro (opcional)</label>
            <input value={addressNeighborhood} onChange={(e) => setAddressNeighborhood(e.target.value)} />
          </div>
          <div className="field" style={{ flex: 2 }}>
            <label>Cidade</label>
            <input required value={addressCity} onChange={(e) => setAddressCity(e.target.value)} />
          </div>
          <div className="field" style={{ flex: 0.6 }}>
            <label>Estado</label>
            <input required maxLength={2} value={addressState} onChange={(e) => setAddressState(e.target.value.toUpperCase())} />
          </div>
        </div>
        <div className="field" style={{ marginBottom: 0, maxWidth: 200 }}>
          <label>CEP (opcional)</label>
          <input value={addressZipCode} onChange={(e) => setAddressZipCode(e.target.value)} />
        </div>
      </div>

      <div className="field-group">
        <div className="field-group__label">CNH (opcional — só necessário pra locação com condução, ex: motorista de app)</div>
        <div className="field">
          <label>Número da CNH</label>
          <input value={driverLicenseNumber} onChange={(e) => setDriverLicenseNumber(e.target.value)} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Categoria</label>
          <input value={driverLicenseCategory} onChange={(e) => setDriverLicenseCategory(e.target.value)} placeholder="Ex: B, AB" />
        </div>
      </div>

      <div className="field-group">
        <div className="field-group__label">Dados bancários (opcional — só usado pra devolver saldo de caução)</div>
        <div className="field">
          <label>Banco</label>
          <input value={bankName} onChange={(e) => setBankName(e.target.value)} />
        </div>
        <div className="field">
          <label>Agência</label>
          <input value={bankAgency} onChange={(e) => setBankAgency(e.target.value)} />
        </div>
        <div className="field">
          <label>Conta</label>
          <input value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Chave PIX</label>
          <input value={pixKey} onChange={(e) => setPixKey(e.target.value)} />
        </div>
      </div>

      <button className="btn" type="submit" disabled={submitting}>
        {submitting ? 'Cadastrando...' : 'Cadastrar cliente'}
      </button>
    </form>
  );
}
