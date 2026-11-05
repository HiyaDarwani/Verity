export type QuestionType = 'mcq' | 'sub';

export interface McqQuestion {
  id: string;
  type: 'mcq';
  text: string;
  options: [string, string, string, string];
  /** 0-indexed correct option */
  /** Available only in examiner/admin exam-management responses. */
  correctOption?: number;
  marks: number;
}

export interface SubjectiveQuestion {
  id: string;
  type: 'sub';
  text: string;
  marks: number;
}

export type Question = McqQuestion | SubjectiveQuestion;

export type ExamStatus = 'Draft' | 'Scheduled' | 'Active' | 'Completed';
export type StudentAttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'TIMED_OUT';

export interface Exam {
  id: string;
  title: string;
  subject: string;
  description?: string;
  date: string; // ISO datetime-local string
  availableUntil?: string | null;
  durationMinutes: number;
  totalMarks: number;
  status: ExamStatus;
  attemptStatus?: StudentAttemptStatus;
  questions: Question[];
}

/** Exam metadata entered before its questions define the calculated total marks. */
export type ExamDraft = Omit<Exam, 'id' | 'questions' | 'totalMarks'>;
