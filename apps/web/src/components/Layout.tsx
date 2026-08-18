import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function Layout() {
  const { user, logout, hasPermission } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__brand">Locadora · Plataforma</div>
        <nav className="sidebar__nav">
          {hasPermission('platform.manage') && (
            <NavLink to="/empresas" className={({ isActive }) => `sidebar__link${isActive ? ' active' : ''}`}>
              Empresas
            </NavLink>
          )}
          {user?.companyId && (
            <NavLink to="/minha-empresa" className={({ isActive }) => `sidebar__link${isActive ? ' active' : ''}`}>
              Minha empresa
            </NavLink>
          )}
          {hasPermission('fleet.manage') && (
            <NavLink to="/frota" className={({ isActive }) => `sidebar__link${isActive ? ' active' : ''}`}>
              Frota
            </NavLink>
          )}
          {hasPermission('customers.manage') && (
            <NavLink to="/clientes" className={({ isActive }) => `sidebar__link${isActive ? ' active' : ''}`}>
              Clientes
            </NavLink>
          )}
          {hasPermission('rates.manage') && (
            <NavLink to="/tarifas" className={({ isActive }) => `sidebar__link${isActive ? ' active' : ''}`}>
              Tarifas
            </NavLink>
          )}
          {hasPermission('users.manage') && (
            <NavLink to="/usuarios" className={({ isActive }) => `sidebar__link${isActive ? ' active' : ''}`}>
              Usuários
            </NavLink>
          )}
        </nav>
        <div className="sidebar__footer">
          <div className="sidebar__user">
            {user?.name}
            <br />
            {user?.roles.join(', ')}
          </div>
          <button className="logout-btn" onClick={() => logout()}>
            Sair
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
