import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNotification } from '../hooks/useNotification';

interface AuthContextType {
  currentUser: any | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithGoogle: (email: string, displayName: string) => Promise<boolean>;
  register: (email: string, password: string, code: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (data: any) => Promise<boolean>;
  getAuthHeaders: () => { Authorization: string };
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  login: async () => false,
  loginWithGoogle: async () => false,
  register: async () => false,
  logout: () => {},
  updateUser: async () => false,
  getAuthHeaders: () => ({ Authorization: '' }),
  refreshUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { notifySuccess, notifyError } = useNotification();
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('syncou_token');
    return token ? { Authorization: `Bearer ${token}` } : { Authorization: '' };
  };

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('syncou_token');
      if (!token) {
        setLoading(false);
        return;
      }
      
      try {
        const res = await fetch('/api/users/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const user = await res.json();
          setCurrentUser(user);
        } else {
          localStorage.removeItem('syncou_token');
        }
      } catch (err) {
        console.error('Failed to restore session', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      
      if (!res.ok) {
        notifyError(data.error || 'Erro no login');
        return false;
      }
      
      localStorage.setItem('syncou_token', data.token);
      // Fetch full profile info
      const profileRes = await fetch('/api/users/me', {
        headers: { Authorization: `Bearer ${data.token}` }
      });
      if (profileRes.ok) {
        setCurrentUser(await profileRes.json());
      } else {
        setCurrentUser(data.user);
      }
      return true;
    } catch (err) {
      notifyError('Erro de conexão.');
      return false;
    }
  };

  const register = async (email: string, password: string, code: string) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, code })
      });
      const data = await res.json();
      
      if (!res.ok) {
        notifyError(data.error || 'Erro no registro');
        return false;
      }
      
      localStorage.setItem('syncou_token', data.token);
      
      // Fetch full profile info
      const profileRes = await fetch('/api/users/me', {
        headers: { Authorization: `Bearer ${data.token}` }
      });
      if (profileRes.ok) {
        setCurrentUser(await profileRes.json());
      } else {
        setCurrentUser(data.user);
      }
      return true;
    } catch (err) {
      notifyError('Erro de conexão.');
      return false;
    }
  };

  const loginWithGoogle = async (email: string, displayName: string) => {
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, displayName })
      });
      const data = await res.json();
      
      if (!res.ok) {
        notifyError(data.error || 'Erro no login com Google');
        return false;
      }
      
      localStorage.setItem('syncou_token', data.token);
      
      const profileRes = await fetch('/api/users/me', {
        headers: { Authorization: `Bearer ${data.token}` }
      });
      if (profileRes.ok) {
        setCurrentUser(await profileRes.json());
      } else {
        setCurrentUser(data.user);
      }
      return true;
    } catch (err) {
      notifyError('Erro de conexão.');
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('syncou_token');
    setCurrentUser(null);
    notifySuccess('Desconectado com sucesso');
  };

  const updateUser = async (data: any) => {
    try {
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(data)
      });
      const resData = await res.json();
      
      if (!res.ok) {
        notifyError(resData.error || 'Erro ao atualizar dados');
        return false;
      }
      
      setCurrentUser((prev: any) => ({ ...prev, ...data }));
      return true;
    } catch (err) {
      notifyError('Erro de conexão.');
      return false;
    }
  };

  const refreshUser = async () => {
    const token = localStorage.getItem('syncou_token');
    if (!token) return;
    try {
      const res = await fetch('/api/users/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const user = await res.json();
        setCurrentUser(user);
      }
    } catch (err) {
      console.error('Failed to refresh user', err);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, loading, login, loginWithGoogle, register, logout, updateUser, getAuthHeaders, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
