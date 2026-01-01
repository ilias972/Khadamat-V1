import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { User } from '../types/api';
import apiClientInstance from '../lib/api-client';
import { useAuth as useAuthContext } from '../lib/auth-context';
import { authManager } from '../lib/auth';

// Query keys
export const AUTH_QUERY_KEYS = {
  user: ['auth', 'user'] as const,
};

// Login mutation (delegates to AuthContext)
export const useLogin = () => {
  const queryClient = useQueryClient();
  const { login } = useAuthContext();

  return useMutation({
    mutationFn: async (credentials: { identifier: string; password: string }) => {
      const user = await login(credentials.identifier, credentials.password);
      return user;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(AUTH_QUERY_KEYS.user, user);
    },
    onError: (error) => {
      console.error('Login failed:', error);
    },
  });
};

// Register mutation (delegates to AuthContext)
export const useRegister = () => {
  const queryClient = useQueryClient();
  const { signup } = useAuthContext();

  return useMutation({
    mutationFn: async (userData: any) => {
      const user = await signup(userData);
      return user;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(AUTH_QUERY_KEYS.user, user);
    },
    onError: (error) => {
      console.error('Registration failed:', error);
    },
  });
};

// Get current user query (uses AuthContext as source of truth, refreshes profile when needed)
export const useMe = () => {
  const { user, isAuthenticated, isLoading } = useAuthContext();

  return useQuery({
    queryKey: AUTH_QUERY_KEYS.user,
    queryFn: async (): Promise<User> => {
      const response = await apiClientInstance.client.get('/user/profile');
      const profileUser = response.data as User;
      authManager.setUser(profileUser);
      return profileUser;
    },
    enabled: isAuthenticated && !isLoading,
    initialData: user ?? undefined,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      if (error instanceof AxiosError && error.response?.status === 401) {
        return false;
      }
      return failureCount < 3;
    },
  });
};

// Logout function (delegates to AuthContext)
export const useLogout = () => {
  const queryClient = useQueryClient();
  const { logout } = useAuthContext();

  return async () => {
    await logout();
    queryClient.removeQueries({ queryKey: AUTH_QUERY_KEYS.user });
    queryClient.clear();
  };
};

// Check authentication status
export const useAuthStatus = () => {
  const { user, isLoading, isAuthenticated } = useAuthContext();

  return {
    isAuthenticated,
    user,
    isLoading,
    error: undefined as AxiosError | undefined,
  };
};
