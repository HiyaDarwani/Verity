/**
 * resultService.ts
 * Exam evaluation and scorecard service decoupled from mock data.
 * All operations communicate with backend APIs via the centralized apiClient.
 */

import type { QuestionGrade, Result, ResultDetail } from '../types/result';
import { apiClient } from './api/apiClient';

export class ResultService {
  /** Fetch all results (examiner/admin view) */
  public async getAll(): Promise<Result[]> {
    return apiClient.get<Result[]>('/results');
  }

  /** Fetch results filtered by exam */
  public async getByExam(examId: string): Promise<Result[]> {
    return apiClient.get<Result[]>('/results', { params: { examId } });
  }

  public async getById(id: string): Promise<ResultDetail> {
    return apiClient.get<ResultDetail>(`/results/${id}`);
  }

  public async evaluate(id: string, grades: QuestionGrade[]): Promise<Result> {
    return apiClient.patch<Result>(`/results/${id}/evaluation`, { grades });
  }

  /** Fetch results for the authenticated student; identity is derived by the API. */
  public async getMine(): Promise<Result[]> {
    return apiClient.get<Result[]>('/results');
  }

}

export const resultService = new ResultService();
