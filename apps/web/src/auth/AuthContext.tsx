import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, setAccessToken, ApiError } from '../api';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  companyId: string | null;
  roles: string[];
  permissions: string[];
  impersonation?: boolean;
}

export interface ImpersonationInfo {
  companyId: string;
  companyName: string;
  expiresAt: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  impersonating: ImpersonationInfo | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (perm: string) => boolean;
  startImpersonation: (companyId: string) => Promise<void>;
  exitImpersonation: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [impersonating, setImpersonating] = useState<ImpersonationInfo | null>(null);

  useEffect(() => {
    // Ao carregar a página, tenta restaurar a sessão usando o cookie de refresh.
    // Isso sempre volta pra identidade REAL (a sessão de suporte nunca tem
    // refresh token próprio), então uma sessão de suporte nunca sobrevive a
    // um F5 — comportamento de propósito, não uma limitação.
    (async () => {
      try {
        const res = await api.post<{ accessToken: string }>('/auth/refresh');
        setAccessToken(res.accessToken);
        const me = await api.get<AuthUser>('/auth/me');
        setUser(me);
      } catch (err) {
        if (!(err instanceof ApiError)) {
          console.error('Falha ao restaurar sessão', err);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function login(email: string, password: string) {
    const res = await api.post<{ accessToken: string; user: AuthUser }>('/auth/login', { email, password });
    setAccessToken(res.accessToken);
    setUser(res.user);
  }

  async function logout() {
    await api.post('/auth/logout').catch(() => {});
    setAccessToken(null);
    setUser(null);
    setImpersonating(null);
  }

  function hasPermission(perm: string) {
    return user?.permissions.includes(perm) ?? false;
  }

  /** Super Admin "entra como" uma empresa — sessão somente leitura, sem senha de ninguém. */
  async function startImpersonation(companyId: string) {
    const res = await api.post<{ accessToken: string; companyName: string; expiresAt: string }>(
      `/companies/${companyId}/impersonate`,
    );
    setAccessToken(res.accessToken);
    const me = await api.get<AuthUser>('/auth/me');
    setUser(me);
    setImpersonating({ companyId, companyName: res.companyName, expiresAt: res.expiresAt });
  }

  /** Volta pra identidade real do Super Admin usando o cookie de refresh, que nunca mudou. */
  async function exitImpersonation() {
    const res = await api.post<{ accessToken: string }>('/auth/refresh');
    setAccessToken(res.accessToken);
    const me = await api.get<AuthUser>('/auth/me');
    setUser(me);
    setImpersonating(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, impersonating, login, logout, hasPermission, startImpersonation, exitImpersonation }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>.');
  return ctx;
}
