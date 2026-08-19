import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  Building2,
  Car,
  Users,
  FileText,
  Wrench,
  ShieldAlert,
  Siren,
  Receipt,
  MapPin,
  Tag,
  Wallet,
  ReceiptText,
  BarChart3,
  UserCog,
  History,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { BrandMark } from './BrandMark';

export function Layout() {
  const { user, logout, hasPermission } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const linkClass = ({ isActive }: { isActive: boolean }) => `sidebar__link${isActive ? ' active' : ''}`;

  return (
    <div className="app-shell">
      <header className="mobile-topbar">
        <button className="mobile-topbar__toggle" aria-label="Abrir menu" onClick={() => setMobileOpen(true)}>
          ☰
        </button>
        <span className="mobile-topbar__brand">
          <BrandMark size={18} />
          Rentovix
        </span>
      </header>

      {mobileOpen && <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />}

      <aside className={`sidebar${mobileOpen ? ' sidebar--open' : ''}`}>
        <div className="sidebar__brand">
          <div className="brand-mark">
            <BrandMark />
            <span className="brand-mark__word">
              Rent<em>ovix</em>
            </span>
          </div>
          <button className="sidebar__close" aria-label="Fechar menu" onClick={() => setMobileOpen(false)}>
            ✕
          </button>
        </div>

        <nav className="sidebar__nav" onClick={() => setMobileOpen(false)}>
          {hasPermission('platform.manage') && (
            <>
              <div className="sidebar__section-label">Plataforma</div>
              <NavLink to="/empresas" className={linkClass}>
                <Building2 /> Empresas
              </NavLink>
              {hasPermission('audit.view') && (
                <NavLink to="/auditoria" className={linkClass}>
                  <History /> Auditoria
                </NavLink>
              )}
            </>
          )}

          {user?.companyId && (
            <>
              <div className="sidebar__section-label">Operação</div>
              <NavLink to="/minha-empresa" className={linkClass}>
                <Building2 /> Minha empresa
              </NavLink>
              {hasPermission('fleet.manage') && (
                <NavLink to="/frota" className={linkClass}>
                  <Car /> Frota
                </NavLink>
              )}
              {hasPermission('customers.manage') && (
                <NavLink to="/clientes" className={linkClass}>
                  <Users /> Clientes
                </NavLink>
              )}
              {hasPermission('contracts.manage') && (
                <NavLink to="/contratos" className={linkClass}>
                  <FileText /> Contratos
                </NavLink>
              )}
              {hasPermission('rates.manage') && (
                <NavLink to="/tarifas" className={linkClass}>
                  <Tag /> Tarifas
                </NavLink>
              )}
            </>
          )}

          {(hasPermission('fleet.manage') || hasPermission('contracts.manage')) && (
            <>
              <div className="sidebar__section-label">Pós-locação</div>
              {hasPermission('fleet.manage') && (
                <NavLink to="/manutencao" className={linkClass}>
                  <Wrench /> Manutenção
                </NavLink>
              )}
              {hasPermission('fleet.manage') && (
                <NavLink to="/avarias" className={linkClass}>
                  <ShieldAlert /> Avarias
                </NavLink>
              )}
              {hasPermission('contracts.manage') && (
                <NavLink to="/sinistros" className={linkClass}>
                  <Siren /> Sinistros
                </NavLink>
              )}
              {hasPermission('contracts.manage') && (
                <NavLink to="/multas" className={linkClass}>
                  <Receipt /> Multas
                </NavLink>
              )}
              {hasPermission('fleet.manage') && (
                <NavLink to="/rastreamento" className={linkClass}>
                  <MapPin /> Rastreamento
                </NavLink>
              )}
            </>
          )}

          {(hasPermission('finance.manage') || hasPermission('reports.view')) && (
            <>
              <div className="sidebar__section-label">Financeiro</div>
              {hasPermission('finance.manage') && (
                <NavLink to="/financeiro" className={linkClass}>
                  <Wallet /> Lançamentos
                </NavLink>
              )}
              {hasPermission('finance.manage') && (
                <NavLink to="/despesas" className={linkClass}>
                  <ReceiptText /> Despesas
                </NavLink>
              )}
              {hasPermission('reports.view') && (
                <NavLink to="/relatorios" className={linkClass}>
                  <BarChart3 /> Relatórios
                </NavLink>
              )}
            </>
          )}

          {(hasPermission('users.manage') || hasPermission('audit.view')) && user?.companyId && (
            <>
              <div className="sidebar__section-label">Administração</div>
              {hasPermission('users.manage') && (
                <NavLink to="/usuarios" className={linkClass}>
                  <UserCog /> Usuários
                </NavLink>
              )}
              {hasPermission('audit.view') && (
                <NavLink to="/auditoria" className={linkClass}>
                  <History /> Auditoria
                </NavLink>
              )}
            </>
          )}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__user">
            <strong>{user?.name}</strong>
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
