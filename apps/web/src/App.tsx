import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { RequireAuth } from './components/RequireAuth';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { Companies } from './pages/Companies';
import { MyCompany } from './pages/MyCompany';
import { Users } from './pages/Users';
import { Fleet } from './pages/Fleet';
import { Customers } from './pages/Customers';
import { Rates } from './pages/Rates';
import { Contracts } from './pages/Contracts';
import { PublicSign } from './pages/PublicSign';

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
              <Route path="/minha-empresa" element={<MyCompany />} />
              <Route path="/usuarios" element={<Users />} />
              <Route path="/frota" element={<Fleet />} />
              <Route path="/clientes" element={<Customers />} />
              <Route path="/tarifas" element={<Rates />} />
              <Route path="/contratos" element={<Contracts />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
