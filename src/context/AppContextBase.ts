/**
 * AppContextBase.ts
 * Context definition and type signatures for the decoupled application state.
 */

import { createContext, useContext } from 'react';
import type { AuthUser, User } from '../types/user';
import type { Exam, ExamDraft, ExamStatus, Question } from '../types/exam';
import type { Result } from '../types/result';
import type { ProctoringEvent, EventReviewStatus } from '../types/proctoring';
import type { UserInvitation } from '../types/api';

export interface AppContextValue {
  // Global status
  isLoading: boolean;
  isAuthReady: boolean;
  error: string | null;
  clearError: () => void;

  // Auth
  authUser: AuthUser | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (name: string, email: string, password: string) => Promise<AuthUser>;
  acceptInvitation: (token: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;

  // Exams
  exams: Exam[];
  refreshExams: () => Promise<void>;
  createExam: (data: ExamDraft, status?: ExamStatus) => Promise<Exam>;
  updateExam: (id: string, patch: Partial<ExamDraft>) => Promise<void>;
  deleteExam: (id: string) => Promise<void>;
  addQuestion: (examId: string, q: Question) => Promise<void>;
  updateQuestion: (examId: string, index: number, q: Question) => Promise<void>;
  removeQuestion: (examId: string, index: number) => Promise<void>;

  // Users
  users: User[];
  refreshUsers: () => Promise<void>;
  createUser: (data: Omit<User, 'id' | 'active'>) => Promise<UserInvitation>;
  updateUser: (id: string, patch: Partial<Omit<User, 'id'>>) => Promise<void>;
  setUserActive: (id: string, active: boolean) => Promise<void>;

  // Results
  results: Result[];
  refreshResults: () => Promise<void>;

  // Proctoring
  proctoringEvents: ProctoringEvent[];
  refreshProctoring: () => Promise<void>;
  setEventReviewStatus: (id: string, status: EventReviewStatus) => Promise<void>;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
