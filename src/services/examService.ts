/**
 * examService.ts
 * Exam and question management service decoupled from mock data.
 * All operations communicate with backend APIs via the centralized apiClient.
 */

import type { Exam, Question } from '../types/exam';
import type { CreateExamRequest, UpdateExamRequest } from '../types/api';
import { apiClient, ApiError } from './api/apiClient';

export class ExamService {
  /** Fetch all exams */
  public async getAll(): Promise<Exam[]> {
    return apiClient.get<Exam[]>('/exams');
  }

  /** Get a single exam by ID */
  public async getById(id: string): Promise<Exam | null> {
    try {
      return await apiClient.get<Exam>(`/exams/${id}`);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 404) return null;
      throw error;
    }
  }

  /** Create a new exam */
  public async create(data: CreateExamRequest): Promise<Exam> {
    return apiClient.post<Exam>('/exams', data);
  }

  /** Update an existing exam */
  public async update(id: string, patch: UpdateExamRequest): Promise<Exam> {
    return apiClient.put<Exam>(`/exams/${id}`, patch);
  }

  /** Delete an exam */
  public async delete(id: string): Promise<boolean> {
    await apiClient.delete(`/exams/${id}`);
    return true;
  }

  /** Add question to exam */
  public async addQuestion(examId: string, question: Question): Promise<Exam> {
    return apiClient.post<Exam>(`/exams/${examId}/questions`, { question });
  }

  /** Update question within an exam */
  public async updateQuestion(examId: string, questionId: string, question: Question): Promise<Exam> {
    return apiClient.put<Exam>(`/exams/${examId}/questions/${questionId}`, { question });
  }

  /** Remove question from exam */
  public async removeQuestion(examId: string, questionId: string): Promise<Exam> {
    return apiClient.delete<Exam>(`/exams/${examId}/questions/${questionId}`);
  }
}

export const examService = new ExamService();
