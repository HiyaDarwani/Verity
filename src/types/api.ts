/**
 * api.ts
 * Standard TypeScript interfaces for API requests, responses, and errors.
 */

import type { AuthUser, UserRole } from './user';
import type { ExamDraft, Question } from './exam';
import type { Result } from './result';
import type { EventReviewStatus } from './proctoring';

/** Standard wrapped API response */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp?: string;
}

/** Standard API Error response */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown> | string[];
  };
  statusCode: number;
}

/** Authentication API payloads */
export interface LoginRequest {
  email: string;
  password: string;
  role?: UserRole;
}

export interface AuthResponse {
  token: string;
  refreshToken?: string;
  user: AuthUser;
  expiresIn?: number;
}

/** User API payloads */
export interface CreateUserRequest {
  name: string;
  email: string;
  role: UserRole;
}

/** A one-time invitation; the account exists after its recipient accepts it. */
export interface UserInvitation {
  id: string;
  email: string;
  role: UserRole;
  token: string;
  expiresAt: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  role?: UserRole;
  active?: boolean;
}

/** Exam API payloads */
export type CreateExamRequest = ExamDraft;

export type UpdateExamRequest = Partial<ExamDraft>;

/** Question API payloads */
export interface CreateQuestionRequest {
  question: Question;
}

export interface UpdateQuestionRequest {
  question: Question;
}

/** Attempt API payloads */
export interface StartAttemptRequest {
  examId: string;
}

export interface SaveAttemptProgressRequest {
  attemptId: string;
  questionIndex: number;
  answers: Record<number, number | string>;
}

export interface SubmitAttemptRequest {
  attemptId: string;
  examId: string;
  answers: Record<number, number | string>;
}

/** Result API payloads */
export interface SubmitResultRequest {
  result: Omit<Result, 'id'>;
}

/** Proctoring API payloads */
export interface UpdateEventReviewStatusRequest {
  status: EventReviewStatus;
}

/** System Activity Audit Record */
export interface ActivityLog {
  id: string;
  description: string;
  timestamp: string;
  type?: 'exam' | 'user' | 'system';
}
