import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { api } from './api-client';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: 'member' | 'union_admin' | 'platform_admin';
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string) => Promise<void>;
  verify: (token: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get<{ data: User }>('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => {
        // Don't setUser(null) here — user starts as null already,
        // and doing so would overwrite a user set by verify() in a race.
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string) => {
    await api.post('/auth/magic-link', { email });
  }, []);

  const verify = useCallback(async (token: string) => {
    const res = await api.post<{ data: User }>('/auth/verify', { token });
    api.clearLegacyToken(); // clean up any old localStorage tokens
    setUser(res.data);
    setIsLoading(false);
    return res.data;
  }, []);

  const logout = useCallback(async () => {
    await api.post('/auth/logout');
    api.clearLegacyToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        verify,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
