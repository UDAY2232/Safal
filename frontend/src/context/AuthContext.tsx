import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isMaintenance: boolean;
  maintenanceMessage: string;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  checkMaintenance: () => Promise<void>;
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
  const [isMaintenance, setIsMaintenance] = useState<boolean>(() => {
    try {
      const cached = localStorage.getItem('safal_user');
      if (cached) {
        const u = JSON.parse(cached);
        return Boolean(u?.role === 'VENDOR' && (u?.vendorProfile?.status === 'SUSPENDED' || u?.isActive === false));
      }
      return false;
    } catch {
      return false;
    }
  });
  const [maintenanceMessage, setMaintenanceMessage] = useState<string>('');

  const checkMaintenance = async () => {
    if (!token) {
      setIsMaintenance(false);
      return;
    }
    try {
      const res = await api.getMe();
      setUser(res.user);
      localStorage.setItem('safal_user', JSON.stringify(res.user));
      if (
        res.user?.role === 'VENDOR' &&
        (res.user?.vendorProfile?.status === 'SUSPENDED' || res.user?.isActive === false)
      ) {
        setIsMaintenance(true);
      } else {
        setIsMaintenance(false);
      }
    } catch (err: any) {
      if (
        err?.status === 403 &&
        (err?.data?.underMaintenance ||
          err?.message?.toLowerCase().includes('maintenance') ||
          err?.message?.toLowerCase().includes('suspended'))
      ) {
        setIsMaintenance(true);
      }
    }
  };

  useEffect(() => {
    async function loadUser() {
      if (token) {
        try {
          const res = await api.getMe();
          setUser(res.user);
          localStorage.setItem('safal_user', JSON.stringify(res.user));
          if (
            res.user?.role === 'VENDOR' &&
            (res.user?.vendorProfile?.status === 'SUSPENDED' || res.user?.isActive === false)
          ) {
            setIsMaintenance(true);
          } else {
            setIsMaintenance(false);
          }
        } catch (err: any) {
          if (
            err?.status === 403 &&
            (err?.data?.underMaintenance ||
              err?.message?.toLowerCase().includes('maintenance') ||
              err?.message?.toLowerCase().includes('suspended'))
          ) {
            setIsMaintenance(true);
            setMaintenanceMessage(err.message || 'Server Under Maintenance');
          } else if (
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
    const handleMaintenance = (e: any) => {
      setIsMaintenance(true);
      if (e?.detail?.message) {
        setMaintenanceMessage(e.detail.message);
      }
    };
    window.addEventListener('safal_auth_expired', handleAuthExpired);
    window.addEventListener('safal_server_maintenance', handleMaintenance);
    return () => {
      window.removeEventListener('safal_auth_expired', handleAuthExpired);
      window.removeEventListener('safal_server_maintenance', handleMaintenance);
    };
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await api.login({ email, password: pass });
    localStorage.setItem('safal_token', res.token);
    localStorage.setItem('safal_user', JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
    if (
      res.user?.role === 'VENDOR' &&
      (res.user?.vendorProfile?.status === 'SUSPENDED' || res.user?.isActive === false)
    ) {
      setIsMaintenance(true);
    } else {
      setIsMaintenance(false);
    }
  };

  const logout = () => {
    api.logout().catch(() => {});
    localStorage.removeItem('safal_token');
    localStorage.removeItem('safal_user');
    setToken(null);
    setUser(null);
    setIsMaintenance(false);
    setMaintenanceMessage('');
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, isMaintenance, maintenanceMessage, login, logout, checkMaintenance }}>
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
