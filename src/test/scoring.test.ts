import { describe, it, expect } from 'vitest';
import { calculateExamScore } from '../utils/scoring';
import type { Question } from '../types/exam';
import type { Answers } from '../types/attempt';

describe('Scoring Logic and Specification Verification (Section 8)', () => {
  it('correctly scores the Section 8 mandated test dataset', () => {
    // Mandated test dataset:
    // Q1: MCQ, 2 marks, Correct
    // Q2: MCQ, 2 marks, Incorrect
    // Q3: MCQ, 1 mark, Correct
    // Q4: Subjective, 5 marks, Submitted (awaiting evaluation)
    const questions: Question[] = [
      {
        id: 'q1',
        type: 'mcq',
        text: 'Question 1',
        options: ['A', 'B', 'C', 'D'],
        correctOption: 0,
        marks: 2,
      },
      {
        id: 'q2',
        type: 'mcq',
        text: 'Question 2',
        options: ['A', 'B', 'C', 'D'],
        correctOption: 1,
        marks: 2,
      },
      {
        id: 'q3',
        type: 'mcq',
        text: 'Question 3',
        options: ['A', 'B', 'C', 'D'],
        correctOption: 2,
        marks: 1,
      },
      {
        id: 'q4',
        type: 'sub',
        text: 'Question 4 (Subjective essay)',
        marks: 5,
      },
    ];

    // Student answers:
    // Q1 (idx 0): chosen 0 -> correct (+2 marks)
    // Q2 (idx 1): chosen 0 -> incorrect (correct was 1)
    // Q3 (idx 2): chosen 2 -> correct (+1 mark)
    // Q4 (idx 3): written response submitted
    const answers: Answers = {
      0: 0,
      1: 0,
      2: 2,
      3: 'My detailed written answer...',
    };

    const { calculation, result } = calculateExamScore(
      questions,
      answers,
      'Asha Rao',
      'exam-test-1',
    );

    // Expected results as per Section 8:
    // - MCQ score: 3/5 marks
    // - Subjective evaluation: Pending
    // - Total exam marks: 10
    // - Not presented as fully evaluated while subjective remains ungraded
    // - Pending subjective answer must NOT be treated as evaluated zero
    expect(calculation.mcqMarksObtained).toBe(3);
    expect(calculation.mcqMarksTotal).toBe(5);
    expect(calculation.subjectiveMarksTotal).toBe(5);
    expect(calculation.totalExamMarks).toBe(10);
    expect(calculation.hasSubjective).toBe(true);
    expect(calculation.status).toBe('Pending review');

    // Score display clearly identifies MCQ marks and pending review
    expect(result.score).toContain('3/5 MCQ');
    expect(result.score).toContain('Pending review');
    expect(result.status).toBe('Pending review');
    expect(result.studentName).toBe('Asha Rao');
    expect(result.examId).toBe('exam-test-1');
  });

  it('correctly scores a 100% pure MCQ exam as fully Graded', () => {
    const questions: Question[] = [
      {
        id: 'q1',
        type: 'mcq',
        text: 'Which is LIFO?',
        options: ['Queue', 'Stack', 'Tree', 'Graph'],
        correctOption: 1,
        marks: 10,
      },
      {
        id: 'q2',
        type: 'mcq',
        text: 'Binary search complexity?',
        options: ['O(n)', 'O(log n)', 'O(1)', 'O(n^2)'],
        correctOption: 1,
        marks: 10,
      },
    ];

    const answers: Answers = {
      0: 1, // correct
      1: 1, // correct
    };

    const { calculation, result } = calculateExamScore(
      questions,
      answers,
      'Rohan Mehta',
      'e1',
    );

    expect(calculation.mcqMarksObtained).toBe(20);
    expect(calculation.mcqMarksTotal).toBe(20);
    expect(calculation.hasSubjective).toBe(false);
    expect(calculation.status).toBe('Graded');
    expect(result.score).toBe('20/20');
  });

  it('handles zero answered questions gracefully without crashing', () => {
    const questions: Question[] = [
      {
        id: 'q1',
        type: 'mcq',
        text: 'Sample MCQ',
        options: ['A', 'B', 'C', 'D'],
        correctOption: 0,
        marks: 5,
      },
    ];

    const answers: Answers = {};

    const { calculation, result } = calculateExamScore(
      questions,
      answers,
      'Test Student',
      'e-empty',
    );

    expect(calculation.mcqMarksObtained).toBe(0);
    expect(calculation.mcqMarksTotal).toBe(5);
    expect(result.score).toBe('0/5');
  });
});
