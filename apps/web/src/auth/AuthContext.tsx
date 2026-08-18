import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, setAccessToken, ApiError } from '../api';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  companyId: string | null;
  roles: string[];
  permissions: string[];
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (perm: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Ao carregar a página, tenta restaurar a sessão usando o cookie de refresh.
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
  }

  function hasPermission(perm: string) {
    return user?.permissions.includes(perm) ?? false;
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>.');
  return ctx;
}
