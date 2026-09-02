import { useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import { BrandMark } from '../components/BrandMark';

interface Preview {
  companyName: string;
  vehicle: string;
}

export function PublicMaintenanceReport() {
  const { token } = useParams<{ token: string }>();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!token) return;
    api
      .get<Preview>(`/public/maintenance-report/${token}`)
      .then(setPreview)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Link inválido ou expirado.'))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setSubmitting(true);
    try {
      await api.post(`/public/maintenance-report/${token}`, { description });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível enviar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand">
          <BrandMark size={30} />
          <span className="login-brand__word">
            Rent<em>ovix</em>
          </span>
        </div>

        {loading ? (
          <p>Carregando...</p>
        ) : error && !preview ? (
          <div className="error-banner">{error}</div>
        ) : sent ? (
          <>
            <h1>Recebemos sua mensagem</h1>
            <p>A locadora foi avisada e vai entrar em contato se precisar de mais informações.</p>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <h1>Avisar sobre o veículo</h1>
            <p>
              {preview?.companyName} — {preview?.vehicle}
            </p>
            {error && <div className="error-banner">{error}</div>}
            <div className="field">
              <label htmlFor="description">O que está acontecendo?</label>
              <textarea
                id="description"
                required
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: o carro fez um barulho estranho no motor hoje de manhã"
              />
            </div>
            <button className="btn" type="submit" disabled={submitting} style={{ width: '100%' }}>
              {submitting ? 'Enviando...' : 'Enviar'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
