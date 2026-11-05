/**
 * authService.ts
 * Authentication service decoupled from mock data.
 * Manages user authentication, token storage, and session state.
 */

import type { AuthUser } from '../types/user';
import type { LoginRequest, AuthResponse } from '../types/api';
import { apiClient, ApiError } from './api/apiClient';

export class AuthService {
  private readonly storageKey = 'verity.accessToken';
  private currentUser: AuthUser | null = null;
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = window.sessionStorage.getItem(this.storageKey);
      apiClient.setToken(this.token);
    }
  }

  /** Get the currently authenticated user from active session */
  public getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  /** Get the active auth token */
  public getToken(): string | null {
    return this.token;
  }

  /** Restore this-tab session only after the API confirms the token is still valid. */
  public async restoreSession(): Promise<AuthUser | null> {
    if (!this.token) return null;
    try {
      this.currentUser = await apiClient.get<AuthUser>('/auth/me');
      return this.currentUser;
    } catch (error) {
      if (error instanceof ApiError && error.statusCode !== 401) throw error;
      this.setSession(null);
      return null;
    }
  }

  /** Authenticate user with credentials */
  public async login(credentials: LoginRequest): Promise<AuthUser> {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
      this.token = response.token;
      this.currentUser = response.user;

      apiClient.setToken(this.token);
      if (typeof window !== 'undefined') window.sessionStorage.setItem(this.storageKey, this.token);

      return this.currentUser;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        'Authentication service currently unavailable. Please ensure backend is running.',
        0,
      );
    }
  }

  public async register(data: { name: string; email: string; password: string }): Promise<AuthUser> {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    return this.setAuthenticatedResponse(response);
  }

  public async acceptInvitation(data: { token: string; password: string }): Promise<AuthUser> {
    const response = await apiClient.post<AuthResponse>('/auth/accept-invitation', data);
    return this.setAuthenticatedResponse(response);
  }

  private setAuthenticatedResponse(response: AuthResponse): AuthUser {
    this.token = response.token;
    this.currentUser = response.user;
    apiClient.setToken(response.token);
    if (typeof window !== 'undefined') window.sessionStorage.setItem(this.storageKey, response.token);
    return response.user;
  }

  /** Terminate session and clear tokens */
  public async logout(): Promise<void> {
    try {
      if (this.token) {
        await apiClient.post('/auth/logout').catch(() => {
          // Ignore server logout errors on client-side cleanup
        });
      }
    } finally {
      this.token = null;
      this.currentUser = null;
      apiClient.setToken(null);
      if (typeof window !== 'undefined') window.sessionStorage.removeItem(this.storageKey);
    }
  }

  /** Manually set session user (useful for test fixtures and state hydration) */
  public setSession(user: AuthUser | null, token: string | null = null): void {
    this.currentUser = user;
    this.token = token;
    apiClient.setToken(token);
    if (typeof window !== 'undefined') {
      if (token) window.sessionStorage.setItem(this.storageKey, token);
      else window.sessionStorage.removeItem(this.storageKey);
    }
  }
}

export const authService = new AuthService();
