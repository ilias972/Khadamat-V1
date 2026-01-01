'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import apiClientInstance, { disableRefresh, enableRefresh } from '@/lib/api-client';
import { User, SignupDto } from '../types/api';
import { authManager } from './auth';
import { broadcastAuthEvent, subscribeAuthEvents } from './auth-sync';
import { useQueryClient } from '@tanstack/react-query';

interface AuthContextType {
  user: User | null;
  status: AuthStatus;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (emailOrPhone: string, password: string) => Promise<User>;
  signup: (userData: SignupDto) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();
  const isHandlingRemote = useRef(false);
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const fetchProfile = useCallback(async (): Promise<User> => {
    const profileResponse = await apiClientInstance.client.get('/user/profile');
    const profileUser = profileResponse.data as User;
    authManager.setUser(profileUser);
    return profileUser;
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeAuthEvents(async (event) => {
      isHandlingRemote.current = true;
      if (event.type === 'LOGOUT' || event.type === 'REFRESH_FAILED') {
        disableRefresh();
        authManager.logout();
        setUser(null);
        setStatus('anonymous');
        queryClient.cancelQueries();
        queryClient.clear();
      }
      if (event.type === 'LOGIN') {
        enableRefresh();
        setStatus('loading');
        try {
          const profileUser = await fetchProfile();
          setUser(profileUser);
          setStatus('authenticated');
        } catch {
          setUser(null);
          setStatus('anonymous');
        }
      }
      isHandlingRemote.current = false;
    });

    const initializeAuth = async () => {
      try {
        const profileUser = await fetchProfile();
        setUser(profileUser);
        setStatus('authenticated');
        enableRefresh();
      } catch {
        authManager.clearTokens();
        setUser(null);
        setStatus('anonymous');
      }
    };

    initializeAuth();

    return () => {
      unsubscribe();
    };
  }, [fetchProfile]);

  // Login with cookie-based refresh; AuthContext remains source of truth
  const login = async (emailOrPhone: string, password: string): Promise<User> => {
    setStatus('loading');
    try {
      const response = await apiClientInstance.client.post(
        '/auth/login',
        {
          identifier: emailOrPhone,
          password,
        },
        { withCredentials: true }
      );

      const payload = response.data || {};
      const accessToken = payload.accessToken || payload.access_token;
      if (accessToken) {
        authManager.setAccessToken(accessToken);
        enableRefresh();
      }

      let profileUser: User | null = null;
      try {
        profileUser = await fetchProfile();
      } catch (profileErr) {
        console.log('AuthContext: Failed to fetch profile after login, falling back to login payload user', profileErr);
        profileUser = payload.user || null;
        if (profileUser) {
          authManager.setUser(profileUser);
        }
      }

      if (!profileUser) {
        throw new Error('Login succeeded but user profile is missing');
      }

      setUser(profileUser);
      setStatus('authenticated');
      if (!isHandlingRemote.current) {
        broadcastAuthEvent('LOGIN');
      }
      return profileUser;
    } catch (error) {
      authManager.clearTokens();
      setStatus('anonymous');
      console.error('Erreur Login:', error);
      throw error;
    }
  };

  const signup = async (userData: SignupDto): Promise<User> => {
    setStatus('loading');
    try {
      const response = await apiClientInstance.client.post('/auth/register', userData, {
        withCredentials: true,
      });

      const payload = response.data || {};
      const accessToken = payload.accessToken || payload.access_token;
      if (accessToken) {
        authManager.setAccessToken(accessToken);
        enableRefresh();
      }

      let profileUser: User | null = null;
      try {
        profileUser = await fetchProfile();
      } catch (profileErr) {
        console.log('AuthContext: Failed to fetch profile after signup, falling back to signup payload user', profileErr);
        profileUser = payload.user || null;
        if (profileUser) {
          authManager.setUser(profileUser);
        }
      }

      if (!profileUser) {
        throw new Error('Signup succeeded but user profile is missing');
      }

      setUser(profileUser);
      setStatus('authenticated');
      if (!isHandlingRemote.current) {
        broadcastAuthEvent('LOGIN');
      }
      return profileUser;
    } catch (error) {
      authManager.clearTokens();
      setStatus('anonymous');
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Invalide aussi le refresh cÃ´tÃ© backend (cookie httpOnly)
      await apiClientInstance.client.post('/auth/logout', {}, { withCredentials: true });
    } catch (err) {
      // On ignore les erreurs pour Ã©viter de bloquer la sortie
      console.warn('AuthContext: backend logout failed, forcing local logout', err);
    } finally {
      authManager.logout();
      setUser(null);
      setStatus('anonymous');
      // Couper toute tentative de refresh jusqu'au prochain login
      disableRefresh();
      window.location.href = '/';
    }
  };

  const refreshUser = () => {
    const currentUser = authManager.getUser();
    setUser(currentUser);
  };

  const value: AuthContextType = {
    user,
    status,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    login,
    signup,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helpers
export function useUserRole(): string[] {
  const { user } = useAuth();
  return user?.role ? [user.role.toLowerCase()] : [];
}

export function useIsClient(): boolean {
  const roles = useUserRole();
  return roles.includes('client');
}

export function useIsPro(): boolean {
  const roles = useUserRole();
  return roles.includes('pro');
}

export function useIsAdmin(): boolean {
  const roles = useUserRole();
  return roles.includes('admin');
}

