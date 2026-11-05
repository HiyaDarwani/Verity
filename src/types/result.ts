export type ResultStatus = 'Graded' | 'Pending review';

export interface Result {
  id: string;
  attemptId?: string;
  studentName: string;
  examId: string;
  status: ResultStatus;
  /** Display string, e.g. "38/50", "3/5 MCQ (Pending review)", or "—" */
  score: string;
  mcqCorrect?: number;
  mcqTotal?: number;
  mcqMarksObtained?: number;
  mcqMarksTotal?: number;
  subjectiveMarksTotal?: number;
  totalExamMarks?: number;
  hasSubjective?: boolean;
}

export interface ResultQuestion {
  questionId: string;
  number: number;
  type: 'mcq' | 'sub';
  text: string;
  marks: number;
  options?: string[];
  answer: string | number | null;
  awardedMarks: number | null;
  feedback: string | null;
}

export interface ResultDetail extends Result {
  questions: ResultQuestion[];
}

export interface QuestionGrade {
  questionId: string;
  marks: number;
  feedback?: string;
}
