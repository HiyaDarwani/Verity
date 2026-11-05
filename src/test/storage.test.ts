import { afterEach, describe, it, expect, vi } from 'vitest';
import { AuthService } from '../services/authService';

describe('Authentication session persistence', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('stores only the access token per tab and restores the user from the API', async () => {
    localStorage.clear();
    sessionStorage.clear();
    const token = 'session-token';
    new AuthService().setSession(null, token);

    expect(localStorage.length).toBe(0);
    expect(sessionStorage.getItem('verity.accessToken')).toBe(token);

    const user = { id: 'user-1', name: 'Example', email: 'example@test.invalid', role: 'Student' };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: user }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    const restored = new AuthService();
    expect(restored.getCurrentUser()).toBeNull();
    await expect(restored.restoreSession()).resolves.toEqual(user);
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/me', expect.objectContaining({
      headers: expect.objectContaining({ Authorization: `Bearer ${token}` }),
    }));
    expect(localStorage.length).toBe(0);
  });

  it('clears a token that the API no longer accepts', async () => {
    sessionStorage.setItem('verity.accessToken', 'revoked-token');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired authentication token' },
    }), { status: 401, headers: { 'Content-Type': 'application/json' } })));

    const restored = new AuthService();
    await expect(restored.restoreSession()).resolves.toBeNull();
    expect(sessionStorage.getItem('verity.accessToken')).toBeNull();
    expect(restored.getToken()).toBeNull();
  });
});
