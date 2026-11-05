import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import type { Exam, McqQuestion, Question, SubjectiveQuestion } from '../types/exam';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  startAttempt: vi.fn(),
  saveProgress: vi.fn(),
  submitAttempt: vi.fn(),
  recordEvent: vi.fn(),
  exam: null as unknown,
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'exam-1' }),
  useNavigate: () => mocks.navigate,
}));
vi.mock('../context/AppContext', () => ({
  useApp: () => ({ exams: mocks.exam ? [mocks.exam] : [] }),
}));
vi.mock('../services/attemptService', () => ({
  attemptService: {
    startAttempt: mocks.startAttempt,
    saveProgress: mocks.saveProgress,
    submitAttempt: mocks.submitAttempt,
  },
}));
vi.mock('../services/proctoringService', () => ({
  proctoringService: { recordEvent: mocks.recordEvent },
}));

import { ExamTaking } from '../pages/student/ExamTaking';

const mcq = (id: string, text: string): McqQuestion => ({
  id,
  type: 'mcq',
  text,
  options: ['Option A', 'Option B', 'Option C', 'Option D'],
  marks: 2,
});

const subjective = (id: string, text: string): SubjectiveQuestion => ({
  id,
  type: 'sub',
  text,
  marks: 5,
});

function makeExam(questions: Question[]): Exam {
  return {
    id: 'exam-1',
    title: 'Submission regression exam',
    subject: 'Testing',
    date: new Date().toISOString(),
    durationMinutes: 30,
    totalMarks: questions.reduce((total, question) => total + question.marks, 0),
    status: 'Active',
    questions,
  };
}

function renderExam(questions: Question[], endTime = Date.now() + 60_000) {
  mocks.exam = makeExam(questions);
  mocks.startAttempt.mockResolvedValue({
    id: 'attempt-123',
    studentId: 'student-1',
    examId: 'exam-1',
    answers: {},
    startTime: Date.now(),
    endTime,
    status: 'in-progress',
  });
  return render(<ExamTaking />);
}

async function confirmSubmit() {
  fireEvent.click(screen.getByRole('button', { name: 'Submit examination' }));
  fireEvent.click(screen.getByRole('button', { name: /^Submit$/ }));
}

describe('ExamTaking submission flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.exam = null;
    mocks.saveProgress.mockResolvedValue(undefined);
    mocks.submitAttempt.mockResolvedValue({ attemptId: 'attempt-123' });
    mocks.recordEvent.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not consume submission while the attempt is loading, then submits an MCQ answer', async () => {
    renderExam([mcq('q1', 'Choose the correct option')]);
    await screen.findByText('Choose the correct option');
    expect(mocks.submitAttempt).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('radio', { name: 'Option C' }));
    await confirmSubmit();

    await waitFor(() => expect(mocks.submitAttempt).toHaveBeenCalledWith('attempt-123', { 0: 2 }));
    expect(mocks.navigate).toHaveBeenCalledWith('/student/exam/exam-1/done');
  });

  it('submits subjective answers through the same attempt endpoint', async () => {
    renderExam([subjective('q1', 'Explain your answer')]);
    await screen.findByText('Explain your answer');

    fireEvent.change(screen.getByRole('textbox', { name: 'Written answer' }), { target: { value: 'A written response' } });
    await confirmSubmit();

    await waitFor(() => expect(mocks.submitAttempt).toHaveBeenCalledWith('attempt-123', { 0: 'A written response' }));
    expect(mocks.navigate).toHaveBeenCalledWith('/student/exam/exam-1/done');
  });

  it('submits every answer for a mixed-question exam', async () => {
    renderExam([mcq('q1', 'Pick an option'), subjective('q2', 'Write a response')]);
    await screen.findByText('Pick an option');

    fireEvent.click(screen.getByRole('radio', { name: 'Option B' }));
    fireEvent.click(screen.getByRole('button', { name: 'Question 2' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Written answer' }), { target: { value: 'Mixed response' } });
    await confirmSubmit();

    await waitFor(() => expect(mocks.submitAttempt).toHaveBeenCalledWith('attempt-123', { 0: 1, 1: 'Mixed response' }));
    expect(mocks.navigate).toHaveBeenCalledWith('/student/exam/exam-1/done');
  });

  it('flags a question for review and exposes the flag in the question map', async () => {
    renderExam([mcq('q1', 'First question'), subjective('q2', 'Second question')]);
    await screen.findByText('First question');

    fireEvent.click(screen.getByRole('button', { name: 'Flag for review' }));
    expect(screen.getByRole('button', { name: 'Flagged for review' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Question 1, flagged for review' })).toHaveClass('flagged');

    fireEvent.click(screen.getByRole('button', { name: 'Question 2' }));
    expect(screen.getByRole('button', { name: 'Flag for review' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows submitting state and ignores duplicate confirmation clicks', async () => {
    let resolveSubmission!: (value: { attemptId: string }) => void;
    mocks.submitAttempt.mockReturnValueOnce(new Promise((resolve) => { resolveSubmission = resolve; }));
    renderExam([mcq('q1', 'Choose an option')]);
    await screen.findByText('Choose an option');
    fireEvent.click(screen.getByRole('button', { name: 'Submit examination' }));
    fireEvent.click(screen.getByRole('button', { name: /^Submit$/ }));

    const submittingButton = await screen.findByRole('button', { name: 'Submitting…' });
    expect(submittingButton).toBeDisabled();
    expect(mocks.submitAttempt).toHaveBeenCalledTimes(1);

    await act(async () => resolveSubmission({ attemptId: 'attempt-123' }));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/student/exam/exam-1/done'));
  });

  it('shows API failures, stays on the exam, and allows a retry', async () => {
    mocks.submitAttempt.mockRejectedValueOnce(new Error('Submission service is unavailable.'));
    renderExam([mcq('q1', 'Choose an option')]);
    await screen.findByText('Choose an option');
    await confirmSubmit();

    expect(await screen.findByRole('alert')).toHaveTextContent('Submission service is unavailable.');
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Submit examination' })).toBeEnabled();

    await confirmSubmit();
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/student/exam/exam-1/done'));
    expect(mocks.submitAttempt).toHaveBeenCalledTimes(2);
  });

  it('automatically submits when the server deadline has already expired', async () => {
    renderExam([mcq('q1', 'Choose an option')], Date.now() - 1);

    await waitFor(() => expect(mocks.submitAttempt).toHaveBeenCalledWith('attempt-123', {}));
    expect(mocks.navigate).toHaveBeenCalledWith('/student/exam/exam-1/done');
  });
});
