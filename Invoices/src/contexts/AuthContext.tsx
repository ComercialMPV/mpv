// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi, User } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  register: (data: any) => Promise<any>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Função centralizada para carregar o perfil completo (com company + subscription)
  const loadFullProfile = useCallback(async (): Promise<User | null> => {
    try {
      const userData = await authApi.getProfile(); // Este endpoint deve retornar company populado
      setUser(userData);
      return userData;
    } catch (error) {
      console.error('Failed to load full profile:', error);
      return null;
    }
  }, []);

  // Verificar autenticação ao iniciar
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      checkAuth();
    } else {
      setLoading(false);
    }
  }, []);

  const checkAuth = async () => {
    setLoading(true);
    await loadFullProfile();
    setLoading(false);
  };

  // ================== LOGIN ==================
  const login = async (email: string, password: string, rememberMe: boolean) => {
    try {
      // Limpar tokens antigos
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');

      const response = await authApi.login(email, password, rememberMe);

      // Guardar tokens
      localStorage.setItem('accessToken', response.accessToken);
      if (response.refreshToken) {
        localStorage.setItem('refreshToken', response.refreshToken);
      }

      // ← IMPORTANTE: Depois do login, carregar o perfil COMPLETO
      await loadFullProfile();

      // Redirecionamento inteligente
      const currentUser = user; // já atualizado pelo loadFullProfile
      if (currentUser?.role === 'referralPartner' || currentUser?.role?.roleName === 'referralPartner') {
        window.location.href = '/referral/dashboard';
      }

    } catch (error) {
      throw error;
    }
  };

  // ================== REGISTER ==================
  const register = async (data: any) => {
    try {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');

      const response = await authApi.register(data);
      return response;
    } catch (error) {
      throw error;
    }
  };

  // ================== LOGOUT ==================
  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  // ================== REFRESH USER (para upgrades, downgrades, etc) ==================
  const refreshUser = useCallback(async () => {
    try {
      await loadFullProfile();

      // Disparar eventos para componentes que escutam mudanças (UsageLimits, Settings, Layout, etc)
      window.dispatchEvent(new Event('userPermissionsUpdated'));
      window.dispatchEvent(new Event('userSubscriptionUpdated'));
      
      console.log('✅ User profile refreshed with latest subscription data');
    } catch (err) {
      console.error('refreshUser failed:', err);
    }
  }, [loadFullProfile]);

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};