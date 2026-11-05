import type { Question } from '../types/exam';
import type { Answers } from '../types/attempt';
import type { Result } from '../types/result';

export interface ScoreCalculation {
  mcqCorrect: number;
  mcqTotal: number;
  mcqMarksObtained: number;
  mcqMarksTotal: number;
  subjectiveCount: number;
  subjectiveMarksTotal: number;
  totalExamMarks: number;
  hasSubjective: boolean;
  status: 'Graded' | 'Pending review';
  /** Clean display representation adhering to Section 8 specs */
  scoreDisplay: string;
}

export function calculateExamScore(
  questions: Question[],
  answers: Answers,
  studentName: string,
  examId: string,
): { calculation: ScoreCalculation; result: Omit<Result, 'id'> } {
  let mcqCorrect = 0;
  let mcqTotal = 0;
  let mcqMarksObtained = 0;
  let mcqMarksTotal = 0;
  let subjectiveCount = 0;
  let subjectiveMarksTotal = 0;

  questions.forEach((q, idx) => {
    const qMarks = q.marks ?? (q.type === 'mcq' ? 10 : 10);
    if (q.type === 'mcq') {
      mcqTotal++;
      mcqMarksTotal += qMarks;
      if (answers[idx] === q.correctOption) {
        mcqCorrect++;
        mcqMarksObtained += qMarks;
      }
    } else {
      subjectiveCount++;
      subjectiveMarksTotal += qMarks;
    }
  });

  const totalExamMarks = mcqMarksTotal + subjectiveMarksTotal;
  const hasSubjective = subjectiveCount > 0;
  const status: 'Graded' | 'Pending review' = hasSubjective
    ? 'Pending review'
    : 'Graded';

  // Format scoreDisplay:
  // If exam has subjective questions, do not present as final overall score.
  // Clearly distinguish MCQ marks from pending subjective evaluation.
  let scoreDisplay: string;
  if (mcqTotal === 0 && hasSubjective) {
    scoreDisplay = 'Pending evaluation';
  } else if (hasSubjective) {
    scoreDisplay = `${mcqMarksObtained}/${mcqMarksTotal} MCQ (Pending review)`;
  } else {
    scoreDisplay = `${mcqMarksObtained}/${mcqMarksTotal}`;
  }

  const calculation: ScoreCalculation = {
    mcqCorrect,
    mcqTotal,
    mcqMarksObtained,
    mcqMarksTotal,
    subjectiveCount,
    subjectiveMarksTotal,
    totalExamMarks,
    hasSubjective,
    status,
    scoreDisplay,
  };

  const result: Omit<Result, 'id'> = {
    studentName,
    examId,
    status,
    score: scoreDisplay,
    mcqCorrect,
    mcqTotal,
    mcqMarksObtained,
    mcqMarksTotal,
    subjectiveMarksTotal,
    totalExamMarks,
    hasSubjective,
  };

  return { calculation, result };
}
