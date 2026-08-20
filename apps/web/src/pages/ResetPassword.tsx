import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import { BrandMark } from '../components/BrandMark';

export function ResetPassword() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (!token) {
      setError('Link inválido — falta o token de redefinição.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível redefinir a senha. Tente novamente.');
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

        {done ? (
          <>
            <h1>Senha redefinida</h1>
            <p>Sua senha foi alterada com sucesso. Todas as sessões antigas foram encerradas por segurança.</p>
            <button className="btn" style={{ width: '100%' }} onClick={() => navigate('/login')}>
              Ir para o login
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <h1>Criar nova senha</h1>
            <p>Escolha uma nova senha pra sua conta.</p>
            {error && <div className="error-banner">{error}</div>}
            <div className="field">
              <label htmlFor="newPassword">Nova senha</label>
              <input
                id="newPassword"
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoFocus
              />
            </div>
            <div className="field">
              <label htmlFor="confirmPassword">Confirmar nova senha</label>
              <input
                id="confirmPassword"
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <button className="btn" type="submit" disabled={submitting} style={{ width: '100%' }}>
              {submitting ? 'Salvando...' : 'Redefinir senha'}
            </button>
          </form>
        )}

        {!done && (
          <Link
            to="/login"
            style={{ display: 'block', textAlign: 'center', marginTop: 14, fontSize: 12.5, color: 'var(--rtv-teal-600)' }}
          >
            Voltar pro login
          </Link>
        )}
      </div>
    </div>
  );
}
