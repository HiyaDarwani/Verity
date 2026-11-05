import { afterEach, describe, expect, it, vi } from 'vitest';
import { attemptService } from '../services/attemptService';
import { apiClient } from '../services/api/apiClient';

afterEach(() => {
  apiClient.setToken(null);
  vi.unstubAllGlobals();
});

describe('attempt API service boundary', () => {
  it('loads an exact summary and starts an attempt through the API', async () => {
    const attempt = { id: 'attempt-1', examId: 'exam-1', answers: {}, startTime: 100, endTime: 200, status: 'in-progress' };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: { count: 3, liveCount: 1 } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: attempt }), { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(attemptService.getSummary()).resolves.toEqual({ count: 3, liveCount: 1 });
    await expect(attemptService.startAttempt('exam-1')).resolves.toEqual(attempt);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(['/api/attempts/summary', '/api/attempts/start']);
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({ examId: 'exam-1' });
  });

  it('persists progress and submits answers to the owned attempt endpoints', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: { attemptId: 'attempt-1' } }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const answers = { 0: 2, 1: 'Written response' };

    await expect(attemptService.saveProgress('attempt-1', 1, answers)).resolves.toBeUndefined();
    await expect(attemptService.submitAttempt('attempt-1', answers)).resolves.toEqual({ attemptId: 'attempt-1' });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(['/api/attempts/attempt-1/progress', '/api/attempts/attempt-1/submit']);
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('PUT');
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ questionIndex: 1, answers });
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe('POST');
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({ answers });
  });

  it('submits to the correct attempt with the authenticated session token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: { attemptId: 'attempt-1' } }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    apiClient.setToken('student-session-token');
    const answers = { 0: 1, 1: 'Written response' };

    await expect(attemptService.submitAttempt('attempt-1', answers)).resolves.toEqual({ attemptId: 'attempt-1' });

    expect(fetchMock).toHaveBeenCalledWith('/api/attempts/attempt-1/submit', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer student-session-token' }),
      body: JSON.stringify({ answers }),
    }));
  });
});
