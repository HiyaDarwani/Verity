export type AttemptStatus = 'in-progress' | 'submitted' | 'timed-out';

/** Maps question index → chosen option index (MCQ) or answer text (subjective) */
export type Answers = Record<number, number | string>;

export interface ExamAttempt {
  id: string;
  studentId: string;
  examId: string;
  answers: Answers;
  /** Unix ms when the attempt was started */
  startTime: number;
  /** Unix ms – derived from startTime + exam duration */
  endTime: number;
  /** Unix ms when submitted (undefined while in progress) */
  submittedAt?: number;
  status: AttemptStatus;
}

export interface AttemptSummary {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  examId: string;
  examTitle: string;
  startedAt: string;
  deadlineAt: string;
  submittedAt: string | null;
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'TIMED_OUT';
  evaluationStatus: 'PENDING_REVIEW' | 'FINALIZED' | null;
  publicationStatus: 'UNPUBLISHED' | 'PUBLISHED' | null;
}
