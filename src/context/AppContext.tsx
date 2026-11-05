/**
 * AppContext.tsx
 * Global application provider for authenticated user and decoupled entity state.
 * Directly communicates with the service layer; no mock data or localStorage persistence
 * for application entities.
 */

import {
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import type { AuthUser, User } from '../types/user';
import type { Exam, ExamDraft, ExamStatus, Question } from '../types/exam';
import type { Result } from '../types/result';
import type { UserInvitation } from '../types/api';
import type { EventReviewStatus, ProctoringEvent } from '../types/proctoring';
import { authService } from '../services/authService';
import { examService } from '../services/examService';
import { userService } from '../services/userService';
import { resultService } from '../services/resultService';
import { proctoringService } from '../services/proctoringService';
import { AppContext } from './AppContextBase';

// oxlint-disable-next-line react/only-export-components
export { useApp, AppContext, type AppContextValue } from './AppContextBase';

export function AppProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(() =>
    authService.getCurrentUser(),
  );
  const [exams, setExams] = useState<Exam[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [proctoringEvents, setProctoringEvents] = useState<ProctoringEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    let active = true;
    authService.restoreSession().then((user) => {
      if (active) setAuthUser(user);
    }).catch((err: unknown) => {
      if (active) setError(err instanceof Error ? err.message : 'Unable to restore your session.');
    }).finally(() => {
      if (active) setIsAuthReady(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const expireSession = () => {
      authService.setSession(null);
      setAuthUser(null);
      setExams([]);
      setUsers([]);
      setResults([]);
      setProctoringEvents([]);
      setError('Your session expired. Sign in again to continue.');
    };
    window.addEventListener('verity:auth-expired', expireSession);
    return () => window.removeEventListener('verity:auth-expired', expireSession);
  }, []);

  // Exams
  const refreshExams = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await examService.getAll();
      setExams(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch exams';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createExam = useCallback(
    async (data: ExamDraft, status?: ExamStatus) => {
      try {
        setIsLoading(true);
        const created = await examService.create({
          ...data,
          status: status || data.status || 'Draft',
        });
        setExams((prev) => [created, ...prev]);
        return created;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create exam';
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const updateExam = useCallback(
    async (id: string, patch: Partial<ExamDraft>) => {
      try {
        setIsLoading(true);
        const updated = await examService.update(id, patch);
        setExams((prev) => prev.map((e) => (e.id === id ? updated : e)));
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to update exam';
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const deleteExam = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      await examService.delete(id);
      setExams((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete exam';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addQuestion = useCallback(async (examId: string, q: Question) => {
    try {
      setIsLoading(true);
      const updated = await examService.addQuestion(examId, q);
      setExams((prev) => prev.map((e) => (e.id === examId ? updated : e)));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add question';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateQuestion = useCallback(
    async (examId: string, _index: number, q: Question) => {
      try {
        setIsLoading(true);
        const updated = await examService.updateQuestion(examId, q.id, q);
        setExams((prev) => prev.map((e) => (e.id === examId ? updated : e)));
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to update question';
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const removeQuestion = useCallback(
    async (examId: string, index: number) => {
      try {
        setIsLoading(true);
        const questionId = exams.find((exam) => exam.id === examId)?.questions[index]?.id;
        if (!questionId) throw new Error('Question not found');
        const updated = await examService.removeQuestion(examId, questionId);
        setExams((prev) => prev.map((e) => (e.id === examId ? updated : e)));
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to remove question';
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [exams],
  );

  // Users
  const refreshUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await userService.getAll();
      setUsers(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch users';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createUser = useCallback(async (data: Omit<User, 'id' | 'active'>): Promise<UserInvitation> => {
    try {
      setIsLoading(true);
      const created = await userService.create(data);
      return created;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create user';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateUser = useCallback(
    async (id: string, patch: Partial<Omit<User, 'id'>>) => {
      try {
        setIsLoading(true);
        const updated = await userService.update(id, patch);
        setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to update user';
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const setUserActive = useCallback(async (id: string, active: boolean) => {
    try {
      setIsLoading(true);
      await userService.setActive(id, active);
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, active } : u)),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update user status';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Results
  const refreshResults = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await resultService.getAll();
      setResults(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch results';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Proctoring
  const refreshProctoring = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await proctoringService.getAll();
      setProctoringEvents(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch proctoring events';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setEventReviewStatus = useCallback(
    async (id: string, status: EventReviewStatus) => {
      try {
        setIsLoading(true);
        await proctoringService.setReviewStatus(id, status);
        setProctoringEvents((prev) =>
          prev.map((e) => (e.id === id ? { ...e, reviewStatus: status } : e)),
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to update proctoring status';
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Authentication
  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const user = await authService.login({ email, password });
        setAuthUser(user);
        return user;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Login failed';
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const register = useCallback(async (name: string, email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const user = await authService.register({ name, email, password });
      setAuthUser(user);
      return user;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setError(msg);
      throw err;
    } finally { setIsLoading(false); }
  }, []);

  const acceptInvitation = useCallback(async (token: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const user = await authService.acceptInvitation({ token, password });
      setAuthUser(user);
      return user;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invitation could not be accepted';
      setError(msg);
      throw err;
    } finally { setIsLoading(false); }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setAuthUser(null);
      setExams([]);
      setUsers([]);
      setResults([]);
      setProctoringEvents([]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Logout failed';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load for authenticated user
  // Synchronize remote entity state when the authenticated principal changes.
  // oxlint-disable react/set-state-in-effect -- these callbacks update state after remote fetches complete.
  useEffect(() => {
    if (!authUser) return;

    if (authUser.role === 'Student') {
      refreshExams();
      refreshResults();
    } else if (authUser.role === 'Examiner') {
      refreshExams();
      refreshResults();
      refreshProctoring();
    } else if (authUser.role === 'Administrator') {
      refreshUsers();
      refreshExams();
        refreshResults();
        refreshProctoring();
    }
  }, [authUser, refreshExams, refreshResults, refreshProctoring, refreshUsers]);
  // oxlint-enable react/set-state-in-effect

  return (
    <AppContext.Provider
      value={{
        isLoading,
        isAuthReady,
        error,
        clearError,
        authUser,
        login,
        register,
        acceptInvitation,
        logout,
        exams,
        refreshExams,
        createExam,
        updateExam,
        deleteExam,
        addQuestion,
        updateQuestion,
        removeQuestion,
        users,
        refreshUsers,
        createUser,
        updateUser,
        setUserActive,
        results,
        refreshResults,
        proctoringEvents,
        refreshProctoring,
        setEventReviewStatus,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
