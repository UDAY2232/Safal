import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem('safal_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(localStorage.getItem('safal_token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      if (token) {
        try {
          const res = await api.getMe();
          setUser(res.user);
          localStorage.setItem('safal_user', JSON.stringify(res.user));
        } catch (err: any) {
          // Only clear token if server explicitly responded with 401 Unauthorized / Invalid Token
          // NEVER clear on network glitches or Render cold start delays!
          if (
            err?.status === 401 ||
            err?.message?.includes('token') ||
            err?.message?.includes('expired') ||
            err?.message?.includes('Unauthorized')
          ) {
            localStorage.removeItem('safal_token');
            localStorage.removeItem('safal_user');
            setToken(null);
            setUser(null);
          }
        }
      }
      setIsLoading(false);
    }
    loadUser();
  }, [token]);

  // Handle global 401 auth expiration
  useEffect(() => {
    const handleAuthExpired = () => {
      localStorage.removeItem('safal_token');
      localStorage.removeItem('safal_user');
      setToken(null);
      setUser(null);
    };
    window.addEventListener('safal_auth_expired', handleAuthExpired);
    return () => window.removeEventListener('safal_auth_expired', handleAuthExpired);
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await api.login({ email, password: pass });
    localStorage.setItem('safal_token', res.token);
    localStorage.setItem('safal_user', JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
  };

  const logout = () => {
    api.logout().catch(() => {});
    localStorage.removeItem('safal_token');
    localStorage.removeItem('safal_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
