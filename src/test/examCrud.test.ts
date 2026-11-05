import { describe, it, expect, vi, beforeEach } from 'vitest';
import { examService } from '../services/examService';
import { userService } from '../services/userService';
import { proctoringService } from '../services/proctoringService';
import { resultService } from '../services/resultService';
import { attemptService } from '../services/attemptService';

describe('Entity services use API boundaries without local persistence', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify([]), { status: 200 }))));
    localStorage.clear();
    sessionStorage.clear();
  });

  it('loads exams and delegates create/update/delete operations to REST endpoints', async () => {
    await expect(examService.getAll()).resolves.toEqual([]);
    await examService.create({ title: 'Exam', subject: 'Math', date: '2026-11-15', durationMinutes: 45, status: 'Draft' });
    await examService.update('e1', { title: 'Updated' });
    await examService.delete('e1');
    expect(vi.mocked(fetch).mock.calls.map(([url]) => url)).toEqual(['/api/exams', '/api/exams', '/api/exams/e1', '/api/exams/e1']);
    expect(localStorage.length).toBe(0);
  });

  it('uses dedicated user, result, proctoring, and attempt endpoints', async () => {
    await userService.getAll();
    await resultService.getAll();
    await proctoringService.getAll();
    await attemptService.submitAttempt('a1', { 0: 'answer' });
    expect(vi.mocked(fetch).mock.calls.map(([url]) => url)).toEqual([
      '/api/users', '/api/results', '/api/proctoring-events', '/api/attempts/a1/submit',
    ]);
    expect(sessionStorage.length).toBe(0);
  });
});
