/**
 * apiClient.ts
 * Centralized HTTP client structure for all Verity backend communications.
 * Provides unified request handling, authentication header injection,
 * and structured error responses.
 */

import type { ApiResponse } from '../../types/api';

export class ApiError extends Error {
  public statusCode: number;
  public details?: unknown;

  constructor(message: string, statusCode: number = 500, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = import.meta.env.VITE_API_BASE_URL || '/api') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  public setToken(token: string | null): void {
    this.token = token;
  }

  public getToken(): string | null {
    return this.token;
  }

  private buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = new URL(`${this.baseUrl}${cleanEndpoint}`, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');

    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          url.searchParams.append(key, String(val));
        }
      });
    }

    return url.pathname + url.search;
  }

  public async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { body, params, headers: customHeaders, ...fetchOptions } = options;
    const url = this.buildUrl(endpoint, params);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...((customHeaders as Record<string, string>) || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        let errorDetails: unknown = undefined;

        try {
          const errorJson = await response.json();
          if (errorJson && typeof errorJson === 'object') {
            errorMessage = errorJson.message || errorJson.error?.message || errorMessage;
            errorDetails = errorJson.error?.details || errorJson.details;
          }
        } catch {
          // Response was not JSON
        }

        if (response.status === 401 && this.token && typeof window !== 'undefined') {
          window.dispatchEvent(new Event('verity:auth-expired'));
        }
        throw new ApiError(errorMessage, response.status, errorDetails);
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return undefined as unknown as T;
      }

      const data = await response.json();
      // If the backend wraps data in ApiResponse<T>, unwrap it; otherwise return raw data
      if (data && typeof data === 'object' && 'data' in data && 'success' in data) {
        return (data as ApiResponse<T>).data;
      }
      return data as T;
    } catch (err) {
      if (err instanceof ApiError) {
        throw err;
      }
      const message = err instanceof Error ? err.message : 'Network connection failed';
      throw new ApiError(message, 0);
    }
  }

  public get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  public put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  public patch<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body });
  }

  public delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
