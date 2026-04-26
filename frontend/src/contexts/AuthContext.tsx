import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/api';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, billingDocument: string, area?: string, whatsapp?: string) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function normalizeStoredToken(rawToken: string | null): string | null {
  if (!rawToken) return null;

  let normalized = String(rawToken).trim();
  if (!normalized) return null;

  if (/^bearer\s+/i.test(normalized)) {
    normalized = normalized.replace(/^bearer\s+/i, '').trim();
  }

  if (
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && normalized.endsWith("'"))
  ) {
    normalized = normalized.slice(1, -1).trim();
  }

  return normalized || null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const rawToken = localStorage.getItem('mentoria_token');
    const savedToken = normalizeStoredToken(rawToken);
    const savedUser = localStorage.getItem('mentoria_user');

    if (rawToken && savedToken && rawToken !== savedToken) {
      localStorage.setItem('mentoria_token', savedToken);
    }

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        // Verify token is still valid
        authApi.me().then(({ data }) => {
          setUser(data.user);
          localStorage.setItem('mentoria_user', JSON.stringify(data.user));
        }).catch(() => {
          localStorage.removeItem('mentoria_token');
          localStorage.removeItem('mentoria_user');
          setToken(null);
          setUser(null);
        }).finally(() => setIsLoading(false));
      } catch {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await authApi.login({ email, password });
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('mentoria_token', data.token);
    localStorage.setItem('mentoria_user', JSON.stringify(data.user));
    sessionStorage.setItem('mentoria_login_event', `${Date.now()}_${data.user.id}`);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, billingDocument: string, area?: string, whatsapp?: string) => {
    const { data } = await authApi.register({ name, email, password, billingDocument, area, whatsapp });
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('mentoria_token', data.token);
    localStorage.setItem('mentoria_user', JSON.stringify(data.user));
    sessionStorage.setItem('mentoria_login_event', `${Date.now()}_${data.user.id}`);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('mentoria_token');
    localStorage.removeItem('mentoria_user');
  }, []);

  const updateUser = useCallback((data: Partial<User>) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...data };
      localStorage.setItem('mentoria_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isLoading,
      isAuthenticated: !!token && !!user,
      login,
      register,
      logout,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
