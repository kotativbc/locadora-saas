import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api';
import { BrandMark } from '../components/BrandMark';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível processar o pedido. Tente novamente.');
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

        {sent ? (
          <>
            <h1>Verifique seu e-mail</h1>
            <p>
              Se <strong>{email}</strong> estiver cadastrado, você vai receber um link pra criar uma nova senha em
              alguns instantes. O link vale por 1 hora.
            </p>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <h1>Esqueci minha senha</h1>
            <p>Informe o e-mail da sua conta — enviamos um link pra você criar uma senha nova.</p>
            {error && <div className="error-banner">{error}</div>}
            <div className="field">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
            </div>
            <button className="btn" type="submit" disabled={submitting} style={{ width: '100%' }}>
              {submitting ? 'Enviando...' : 'Enviar link de redefinição'}
            </button>
          </form>
        )}

        <Link
          to="/login"
          style={{ display: 'block', textAlign: 'center', marginTop: 14, fontSize: 12.5, color: 'var(--rtv-teal-600)' }}
        >
          Voltar pro login
        </Link>
      </div>
    </div>
  );
}
