import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../services/authService';
import { ApiError } from '../services/api/apiClient';

describe('Authentication API boundary', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('sends credentials without a client-selected role and keeps session in memory only', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ token: 'session-token', user: { id: 3, name: 'A Student', email: 'a@example.test', role: 'Student' } }), { status: 200 }));
    const auth = new AuthService();

    const user = await auth.login({ email: 'a@example.test', password: 'secret' });

    expect(user.role).toBe('Student');
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ email: 'a@example.test', password: 'secret' });
    expect(localStorage.length).toBe(0);
    expect(auth.getCurrentUser()).toEqual(user);
    expect(new AuthService().getCurrentUser()).toBeNull();
  });

  it('surfaces authentication API failures without fabricating a user', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Invalid credentials' }), { status: 401 }));
    const auth = new AuthService();
    await expect(auth.login({ email: 'a@example.test', password: 'wrong' })).rejects.toBeInstanceOf(ApiError);
    expect(auth.getCurrentUser()).toBeNull();
  });
});
