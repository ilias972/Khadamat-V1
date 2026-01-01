// Auth utilities for Khadamat frontend
// Handles token storage, user state, and automatic token refresh

import { User, SignupDto, AuthTokens } from '../types/api';

type JwtPayload = {
  exp?: number;
  [key: string]: unknown;
};

function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;

  const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '==='.slice(0, (4 - (base64.length % 4)) % 4);

  if (typeof globalThis.atob !== 'function') {
    return null;
  }

  try {
    return JSON.parse(globalThis.atob(padded));
  } catch {
    return null;
  }
}

// In-memory storage for access token and user (no localStorage)
let accessToken: string | null = null;
let currentUser: User | null = null;

class AuthManager {

  // Token storage - access token in memory only
  setTokens(tokens: AuthTokens): void {
    accessToken = tokens?.access_token ?? null;
    // Refresh token is in httpOnly cookie, no localStorage
  }

  getAccessToken(): string | null {
    return accessToken;
  }

  // Set access token in memory (used after refresh)
  setAccessToken(token: string): void {
    accessToken = token;
  }

  clearTokens(): void {
    accessToken = null;
    currentUser = null;
  }

  // User storage in memory
  setUser(userData: User): void {
    currentUser = userData;
  }

  getUser(): User | null {
    return currentUser;
  }

  // Token validation
  isTokenExpired(token: string): boolean {
    const payload = decodeJwtPayload(token);
    if (!payload || typeof payload.exp !== 'number') return true;
    return payload.exp < Date.now() / 1000;
  }


  // Check if user is authenticated
  isAuthenticated(): boolean {
    return currentUser !== null;
  }

  // Login helper
  async login(identifier: string, password: string): Promise<User> {
    const { authService } = await import('../services/auth.service');
    const response = await authService.login({ identifier, password });

    accessToken = response.access_token; // Store access token in memory
    this.setUser(response.user);

    return response.user;
  }

  // Signup helper
  async signup(userData: SignupDto): Promise<User> {
    const { authService } = await import('../services/auth.service');
    const response = await authService.register(userData);

    accessToken = response.access_token; // Store access token in memory
    this.setUser(response.user);

    return response.user;
  }

  // Logout
  logout(): void {
    this.clearTokens();
  }
}

export const authManager = new AuthManager();

// Helper functions
export const isAuthenticated = () => authManager.isAuthenticated();
export const getCurrentUser = (): User | null => authManager.getUser();
export const logout = () => authManager.logout();
