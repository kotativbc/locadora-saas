import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { api, ApiError, fetchFileUrl } from '../api';
import { useAuth } from '../auth/AuthContext';

interface Company {
  id: string;
  name: string;
  tradeName: string | null;
  cnpj: string | null;
  logoPath: string | null;
  status: string;
  addressStreet: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  addressNeighborhood: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZipCode: string | null;
  contactEmail: string | null;
  privacyOfficerName: string | null;
}

export function MyCompany() {
  const { hasPermission } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function load() {
    try {
      const data = await api.get<Company>('/companies/me');
      setCompany(data);
      if (data.logoPath) {
        setLogoUrl(await fetchFileUrl(`/companies/${data.id}/logo`));
      } else {
        setLogoUrl(null);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar dados da empresa.');
    }
  }

  useEffect(() => {
    load();
    // A object URL do logo é revogada quando o componente desmonta, pra não vazar memória.
    return () => {
      if (logoUrl) URL.revokeObjectURL(logoUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogoChange(e: ChangeEvent<HTMLInputElement>) {
    if (!company || !e.target.files?.[0]) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', e.target.files[0]);
      await api.upload(`/companies/${company.id}/logo`, formData);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao enviar logo.');
    } finally {
      setUploading(false);
    }
  }

  if (!company) {
    return (
      <div>
        <div className="page-header">
          <h1>Minha empresa</h1>
          <div className="page-header__rule" />
        </div>
        {error && <div className="error-banner">{error}</div>}
        {!error && <p>Carregando...</p>}
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Minha empresa</h1>
        <div className="page-header__rule" />
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card" style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 8,
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo da empresa"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          ) : (
            <span style={{ fontSize: 11, color: 'var(--ink-muted)' }}>sem logo</span>
          )}
        </div>
        <div>
          <strong>{company.name}</strong>
          {company.tradeName && <div style={{ color: 'var(--ink-muted)', fontSize: 13 }}>{company.tradeName}</div>}
          {company.cnpj && <span className="plate">{company.cnpj}</span>}
        </div>
      </div>

      {hasPermission('companies.manage') && (
        <div className="card">
          <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 8 }}>
            Trocar logo (PNG/JPG, até 2MB)
          </label>
          <input type="file" accept="image/*" onChange={handleLogoChange} disabled={uploading} />
        </div>
      )}

      {hasPermission('companies.manage') && <AddressForm company={company} onSaved={load} />}

      {hasPermission('companies.manage') && <PrivacySection company={company} onSaved={load} />}
    </div>
  );
}

function AddressForm({ company, onSaved }: { company: Company; onSaved: () => void }) {
  const [street, setStreet] = useState(company.addressStreet ?? '');
  const [number, setNumber] = useState(company.addressNumber ?? '');
  const [complement, setComplement] = useState(company.addressComplement ?? '');
  const [neighborhood, setNeighborhood] = useState(company.addressNeighborhood ?? '');
  const [city, setCity] = useState(company.addressCity ?? '');
  const [state, setState] = useState(company.addressState ?? '');
  const [zipCode, setZipCode] = useState(company.addressZipCode ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      await api.patch(`/companies/${company.id}`, {
        addressStreet: street || undefined,
        addressNumber: number || undefined,
        addressComplement: complement || undefined,
        addressNeighborhood: neighborhood || undefined,
        addressCity: city || undefined,
        addressState: state || undefined,
        addressZipCode: zipCode || undefined,
      });
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao salvar endereço.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <strong style={{ display: 'block', marginBottom: 4 }}>Endereço</strong>
      <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 0, marginBottom: 14 }}>
        Usado no cabeçalho dos contratos gerados e na cláusula de foro (cidade/estado).
      </p>
      {error && <div className="error-banner">{error}</div>}
      {saved && (
        <div style={{ fontSize: 12.5, color: 'var(--rtv-success)', marginBottom: 12 }}>Endereço salvo.</div>
      )}
      <div className="field-group">
        <div className="field">
          <label>Rua/Avenida</label>
          <input value={street} onChange={(e) => setStreet(e.target.value)} />
        </div>
        <div className="field">
          <label>Número</label>
          <input value={number} onChange={(e) => setNumber(e.target.value)} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Complemento (opcional)</label>
          <input value={complement} onChange={(e) => setComplement(e.target.value)} />
        </div>
      </div>
      <div className="field-group">
        <div className="field">
          <label>Bairro</label>
          <input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />
        </div>
        <div className="field">
          <label>Cidade</label>
          <input value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div className="field">
          <label>Estado (sigla)</label>
          <input value={state} maxLength={2} onChange={(e) => setState(e.target.value.toUpperCase())} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>CEP</label>
          <input value={zipCode} onChange={(e) => setZipCode(e.target.value)} />
        </div>
      </div>
      <button className="btn" type="submit" disabled={saving}>
        {saving ? 'Salvando...' : 'Salvar endereço'}
      </button>
    </form>
  );
}

function PrivacySection({ company, onSaved }: { company: Company; onSaved: () => void }) {
  const [contactEmail, setContactEmail] = useState(company.contactEmail ?? '');
  const [privacyOfficerName, setPrivacyOfficerName] = useState(company.privacyOfficerName ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [downloading, setDownloading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      await api.patch(`/companies/${company.id}`, {
        contactEmail: contactEmail || undefined,
        privacyOfficerName: privacyOfficerName || undefined,
      });
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDownload() {
    setDownloading(true);
    setError(null);
    try {
      const url = await fetchFileUrl(`/companies/${company.id}/privacy-notice-pdf`);
      window.open(url, '_blank');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao gerar o aviso de privacidade.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <strong style={{ display: 'block', marginBottom: 4 }}>Privacidade (LGPD)</strong>
      <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 0, marginBottom: 14 }}>
        Canal de contato e encarregado usados no Aviso de Privacidade que sua empresa apresenta aos clientes finais.
      </p>
      {error && <div className="error-banner">{error}</div>}
      {saved && <div style={{ fontSize: 12.5, color: 'var(--rtv-success)', marginBottom: 12 }}>Salvo.</div>}
      <div className="field">
        <label>E-mail de contato / canal de privacidade</label>
        <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="privacidade@suaempresa.com.br" />
      </div>
      <div className="field" style={{ marginBottom: 0 }}>
        <label>Encarregado ou responsável (opcional)</label>
        <input value={privacyOfficerName} onChange={(e) => setPrivacyOfficerName(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button className="btn" type="submit" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
        <button
          type="button"
          className="logout-btn"
          style={{ color: 'var(--rtv-navy-900)', borderColor: 'var(--rtv-line-strong)' }}
          disabled={downloading}
          onClick={handleDownload}
        >
          {downloading ? 'Gerando...' : 'Baixar Aviso de Privacidade (rascunho)'}
        </button>
      </div>
      <p style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 10, marginBottom: 0 }}>
        O PDF gerado é um rascunho a partir do seu cadastro — revise com um advogado antes de publicar pros seus
        clientes, principalmente os prazos de retenção, que o documento não preenche sozinho.
      </p>
    </form>
  );
}
