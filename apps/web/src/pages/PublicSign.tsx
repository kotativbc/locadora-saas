import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, ApiError, fetchFileUrl } from '../api';

interface Preview {
  companyName: string;
  customerName: string;
  vehicle: string;
  startDate: string;
  endDate: string;
  days: number;
  dailyRate: string;
  totalValue: string;
  expiresAt: string;
}

function formatCurrency(value: string) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function PublicSign() {
  const { token } = useParams<{ token: string }>();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    if (!token) return;
    api
      .get<Preview>(`/public/contracts/${token}`)
      .then(setPreview)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Não foi possível carregar o contrato.'))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleViewPdf() {
    if (!token) return;
    try {
      const url = await fetchFileUrl(`/public/contracts/${token}/pdf`);
      window.open(url, '_blank');
    } catch {
      setError('Não foi possível abrir o PDF.');
    }
  }

  async function handleAccept() {
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/public/contracts/${token}/accept`);
      setSigned(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível confirmar a assinatura.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card" style={{ maxWidth: 420, width: '100%' }}>
        {loading && <p>Carregando contrato...</p>}

        {!loading && error && !signed && <div className="error-banner">{error}</div>}

        {!loading && signed && (
          <>
            <h1>Contrato assinado ✓</h1>
            <p>Sua assinatura foi registrada com sucesso. Você já pode devolver este dispositivo à locadora.</p>
          </>
        )}

        {!loading && !error && !signed && preview && (
          <>
            <h1>{preview.companyName}</h1>
            <p>Confira os dados do contrato antes de assinar:</p>

            <div className="card" style={{ padding: 14, marginBottom: 16 }}>
              <div style={{ marginBottom: 6 }}>
                <strong>Locatário:</strong> {preview.customerName}
              </div>
              <div style={{ marginBottom: 6 }}>
                <strong>Veículo:</strong> {preview.vehicle}
              </div>
              <div style={{ marginBottom: 6 }}>
                <strong>Período:</strong> {new Date(preview.startDate).toLocaleDateString('pt-BR')} a{' '}
                {new Date(preview.endDate).toLocaleDateString('pt-BR')} ({preview.days}{' '}
                {preview.days === 1 ? 'dia' : 'dias'})
              </div>
              <div style={{ marginBottom: 6 }}>
                <strong>Diária:</strong> {formatCurrency(preview.dailyRate)}
              </div>
              <div>
                <strong>Total:</strong> {formatCurrency(preview.totalValue)}
              </div>
            </div>

            <button
              className="logout-btn"
              style={{ color: 'var(--primary)', borderColor: 'var(--border)', width: '100%', marginBottom: 14 }}
              onClick={handleViewPdf}
              type="button"
            >
              Ler o contrato completo (PDF)
            </button>

            {error && <div className="error-banner">{error}</div>}

            <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, marginBottom: 14 }}>
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ marginTop: 2 }} />
              Li e concordo com os termos deste contrato de locação.
            </label>

            <button className="btn btn--accent" style={{ width: '100%' }} disabled={!agreed || submitting} onClick={handleAccept}>
              {submitting ? 'Confirmando...' : 'Assinar contrato'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
