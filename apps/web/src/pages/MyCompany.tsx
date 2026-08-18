import { useEffect, useState, type ChangeEvent } from 'react';
import { api, ApiError } from '../api';
import { useAuth } from '../auth/AuthContext';

interface Company {
  id: string;
  name: string;
  tradeName: string | null;
  cnpj: string | null;
  logoPath: string | null;
  active: boolean;
}

export function MyCompany() {
  const { hasPermission } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function load() {
    try {
      setCompany(await api.get<Company>('/companies/me'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar dados da empresa.');
    }
  }

  useEffect(() => {
    load();
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
          {company.logoPath ? (
            <img
              src={`/api/companies/${company.id}/logo`}
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
    </div>
  );
}
