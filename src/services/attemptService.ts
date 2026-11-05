/** Attempt lifecycle and progress API boundary. */
import type { Answers, AttemptSummary, ExamAttempt } from '../types/attempt';
import { apiClient } from './api/apiClient';

export class AttemptService {
  public getSummary(): Promise<{ count: number; liveCount: number }> {
    return apiClient.get<{ count: number; liveCount: number }>('/attempts/summary');
  }

  public getAll(): Promise<AttemptSummary[]> {
    return apiClient.get<AttemptSummary[]>('/attempts');
  }

  public startAttempt(examId: string): Promise<ExamAttempt> {
    return apiClient.post<ExamAttempt>('/attempts/start', { examId });
  }

  public async saveProgress(attemptId: string, questionIndex: number, answers: Answers): Promise<void> {
    await apiClient.put<void>(`/attempts/${attemptId}/progress`, { questionIndex, answers });
  }

  public submitAttempt(attemptId: string, answers: Answers): Promise<{ attemptId: string }> {
    return apiClient.post<{ attemptId: string }>(`/attempts/${attemptId}/submit`, { answers });
  }
}

export const attemptService = new AttemptService();
