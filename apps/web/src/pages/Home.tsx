import { useAuth } from '../auth/AuthContext';

export function Home() {
  const { user } = useAuth();

  return (
    <div>
      <div className="page-header">
        <h1>Olá, {user?.name?.split(' ')[0]}</h1>
        <div className="page-header__rule" />
      </div>
      <div className="card">
        <p style={{ margin: 0 }}>
          Fase 1 concluída: autenticação, multiempresa e usuários com papéis já estão funcionando.
          Os próximos módulos (frota, contratos, reservas etc.) vão aparecer aqui conforme forem
          implementados nas próximas fases.
        </p>
      </div>
    </div>
  );
}
