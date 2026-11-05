import { afterEach, describe, expect, it, vi } from 'vitest';
import { resultService } from '../services/resultService';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('result API service boundary', () => {
  it('loads a result detail using its stable result id', async () => {
    const result = { id: 'result-1', questions: [] };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(resultService.getById('result-1')).resolves.toEqual(result);
    expect(fetchMock).toHaveBeenCalledWith('/api/results/result-1', expect.objectContaining({ method: 'GET' }));
  });

  it('sends subjective grades and feedback to the evaluation endpoint', async () => {
    const responseData = { id: 'result-1', status: 'Pending review', score: '5/10 MCQ (Pending review)' };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: responseData }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);
    const grades = [{ questionId: 'question-1', marks: 4, feedback: 'Good reasoning.' }];

    await expect(resultService.evaluate('result-1', grades)).resolves.toEqual(responseData);
    expect(fetchMock).toHaveBeenCalledWith('/api/results/result-1/evaluation', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ grades }),
    }));
  });
});
