import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function Layout() {
  const { user, logout, hasPermission } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-shell">
      <header className="mobile-topbar">
        <button
          className="mobile-topbar__toggle"
          aria-label="Abrir menu"
          onClick={() => setMobileOpen(true)}
        >
          ☰
        </button>
        <span className="mobile-topbar__brand">Locadora</span>
      </header>

      {mobileOpen && <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />}

      <aside className={`sidebar${mobileOpen ? ' sidebar--open' : ''}`}>
        <div className="sidebar__brand">
          Locadora · Plataforma
          <button className="sidebar__close" aria-label="Fechar menu" onClick={() => setMobileOpen(false)}>
            ✕
          </button>
        </div>
        <nav className="sidebar__nav" onClick={() => setMobileOpen(false)}>
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
          {hasPermission('contracts.manage') && (
            <NavLink to="/contratos" className={({ isActive }) => `sidebar__link${isActive ? ' active' : ''}`}>
              Contratos
            </NavLink>
          )}
          {hasPermission('fleet.manage') && (
            <NavLink to="/manutencao" className={({ isActive }) => `sidebar__link${isActive ? ' active' : ''}`}>
              Manutenção
            </NavLink>
          )}
          {hasPermission('fleet.manage') && (
            <NavLink to="/avarias" className={({ isActive }) => `sidebar__link${isActive ? ' active' : ''}`}>
              Avarias
            </NavLink>
          )}
          {hasPermission('contracts.manage') && (
            <NavLink to="/sinistros" className={({ isActive }) => `sidebar__link${isActive ? ' active' : ''}`}>
              Sinistros
            </NavLink>
          )}
          {hasPermission('contracts.manage') && (
            <NavLink to="/multas" className={({ isActive }) => `sidebar__link${isActive ? ' active' : ''}`}>
              Multas
            </NavLink>
          )}
          {hasPermission('fleet.manage') && (
            <NavLink to="/rastreamento" className={({ isActive }) => `sidebar__link${isActive ? ' active' : ''}`}>
              Rastreamento
            </NavLink>
          )}
          {hasPermission('rates.manage') && (
            <NavLink to="/tarifas" className={({ isActive }) => `sidebar__link${isActive ? ' active' : ''}`}>
              Tarifas
            </NavLink>
          )}
          {hasPermission('finance.manage') && (
            <NavLink to="/financeiro" className={({ isActive }) => `sidebar__link${isActive ? ' active' : ''}`}>
              Financeiro
            </NavLink>
          )}
          {hasPermission('finance.manage') && (
            <NavLink to="/despesas" className={({ isActive }) => `sidebar__link${isActive ? ' active' : ''}`}>
              Despesas
            </NavLink>
          )}
          {hasPermission('reports.view') && (
            <NavLink to="/relatorios" className={({ isActive }) => `sidebar__link${isActive ? ' active' : ''}`}>
              Relatórios
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
