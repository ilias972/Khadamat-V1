import { apiClientInstance } from '@/lib/api-client';
// On utilise 'any' pour l'instant pour éviter les erreurs de build TypeScript, on peaufinera après
import { AuthResponse } from '@/types/api';

export const authService = {
  async register(userData: any) {
    const response = await apiClientInstance.client.post('/auth/register', userData);
    return response.data;
  },

  async login(credentials: any) {
    const response = await apiClientInstance.client.post('/auth/login', credentials);
    return response.data;
  },

  async getProfile() {
    const response = await apiClientInstance.client.get('/user/profile');
    return response.data;
  }
};