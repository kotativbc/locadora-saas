import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { RequireAuth } from './components/RequireAuth';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { Companies } from './pages/Companies';
import { CompanyDetail } from './pages/CompanyDetail';
import { Plans } from './pages/Plans';
import { Backups } from './pages/Backups';
import { MyCompany } from './pages/MyCompany';
import { Users } from './pages/Users';
import { Fleet } from './pages/Fleet';
import { Customers } from './pages/Customers';
import { Rates } from './pages/Rates';
import { Contracts } from './pages/Contracts';
import { PublicSign } from './pages/PublicSign';
import { Maintenance } from './pages/Maintenance';
import { Damages } from './pages/Damages';
import { Claims } from './pages/Claims';
import { Fines } from './pages/Fines';
import { Tracking } from './pages/Tracking';
import { Finance } from './pages/Finance';
import { Expenses } from './pages/Expenses';
import { Reports } from './pages/Reports';
import { AuditLog } from './pages/AuditLog';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/assinar/:token" element={<PublicSign />} />
          <Route element={<RequireAuth />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/empresas" element={<Companies />} />
              <Route path="/empresas/:id" element={<CompanyDetail />} />
              <Route path="/planos" element={<Plans />} />
              <Route path="/backups" element={<Backups />} />
              <Route path="/minha-empresa" element={<MyCompany />} />
              <Route path="/usuarios" element={<Users />} />
              <Route path="/frota" element={<Fleet />} />
              <Route path="/clientes" element={<Customers />} />
              <Route path="/tarifas" element={<Rates />} />
              <Route path="/contratos" element={<Contracts />} />
              <Route path="/manutencao" element={<Maintenance />} />
              <Route path="/avarias" element={<Damages />} />
              <Route path="/sinistros" element={<Claims />} />
              <Route path="/multas" element={<Fines />} />
              <Route path="/rastreamento" element={<Tracking />} />
              <Route path="/financeiro" element={<Finance />} />
              <Route path="/despesas" element={<Expenses />} />
              <Route path="/relatorios" element={<Reports />} />
              <Route path="/auditoria" element={<AuditLog />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
