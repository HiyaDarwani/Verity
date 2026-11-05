/**
 * ExamTaking.tsx
 * The live exam-taking interface.
 * - Timestamp-based timer (avoids drift)
 * - Question navigator with answered/current indicators
 * - MCQ and subjective question rendering
 * - Submit confirmation dialog
 * - Auto-submit on timer expiry
 * - Attempt state is held by the API and kept in memory while taking the exam
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useExamTimer } from '../../hooks/useExamTimer';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { attemptService } from '../../services/attemptService';
import { proctoringService } from '../../services/proctoringService';
import { Flag } from 'lucide-react';
import type { Answers } from '../../types/attempt';

export function ExamTaking() {
  const { id } = useParams<{ id: string }>();
  const { exams } = useApp();
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittedRef = useRef(false);

  const exam = exams.find((e) => e.id === id);

  const [attempt, setAttemptState] = useState<{ id: string; questionIndex: number; answers: Answers; endTimeMs: number } | null>(null);
  const [attemptError, setAttemptError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'Saved' | 'Saving' | 'Not saved'>('Saved');
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(() => new Set());
  const attemptId = attempt?.id;

  useEffect(() => {
    if (!id) return;
    let active = true;
    attemptService.startAttempt(id).then((started) => {
      if (active) setAttemptState({ id: started.id, questionIndex: 0, answers: started.answers ?? {}, endTimeMs: started.endTime });
    }).catch((error: unknown) => {
      if (active) setAttemptError(error instanceof Error ? error.message : 'Unable to start examination.');
    });
    return () => { active = false; };
  }, [id]);

  function setAttempt(updater: (prev: NonNullable<typeof attempt>) => NonNullable<typeof attempt>) {
    setAttemptState((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      return next;
    });
  }

  useEffect(() => {
    if (!attempt) return;
    if (Object.keys(attempt.answers).length === 0) return;
    setSaveState('Saving');
    const timer = window.setTimeout(() => {
      attemptService.saveProgress(attempt.id, attempt.questionIndex, attempt.answers).then(() => {
        setSaveState('Saved');
      }).catch((error: unknown) => {
        setSaveState('Not saved');
        setAttemptError(error instanceof Error ? error.message : 'Unable to save examination progress.');
      });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [attempt]);

  useEffect(() => {
    if (!attemptId) return;
    let active = true;
    const recordVisibility = () => {
      if (document.visibilityState !== 'hidden') return;
      void proctoringService.recordEvent(attemptId, 'TAB_HIDDEN', { visibilityState: 'hidden' }).catch((error: unknown) => {
        if (active) setAttemptError(error instanceof Error ? `Proctoring event could not be saved: ${error.message}` : 'Proctoring event could not be saved.');
      });
    };
    document.addEventListener('visibilitychange', recordVisibility);
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', recordVisibility);
    };
  }, [attemptId]);

  async function handleSubmit() {
    if (submittedRef.current || !exam || !attempt) return;
    submittedRef.current = true;
    setIsSubmitting(true);
    setAttemptError(null);
    setShowConfirm(false);
    try {
      await attemptService.submitAttempt(attempt.id, attempt.answers);
      navigate(`/student/exam/${exam.id}/done`);
    } catch (error) {
      submittedRef.current = false;
      setIsSubmitting(false);
      setAttemptError(error instanceof Error ? error.message : 'Unable to submit examination.');
    }
  }

  const { display, expired } = useExamTimer(attempt?.endTimeMs ?? null, () => {
    if (attempt && !submittedRef.current) void handleSubmit();
  });

  // Redirect if exam not found or has no questions
  useEffect(() => {
    if (!exam) {
      navigate('/student/dashboard');
      return;
    }
    if (exam.questions.length === 0) {
      navigate(`/student/exam/${exam.id}/instructions`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam, navigate]);

  if (!exam || exam.questions.length === 0) return null;
  if (!attempt) return <div className="pad">{attemptError ? <p className="err" role="alert">{attemptError}</p> : <p className="mut">Starting examination…</p>}</div>;

  const q = exam.questions[attempt.questionIndex];
  const totalQ = exam.questions.length;

  function setAnswer(val: number | string) {
    setAttempt((prev) => ({
      ...prev,
      answers: { ...prev.answers, [prev.questionIndex]: val },
    }));
  }

  function goTo(idx: number) {
    setAttempt((prev) => ({ ...prev, questionIndex: idx }));
  }

  function toggleFlag(index: number) {
    setFlaggedQuestions((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  const isAnswered = (idx: number) => {
    const a = attempt.answers[idx];
    return a !== undefined && a !== '';
  };

  const timerUrgent = attempt.endTimeMs - Date.now() < 5 * 60 * 1000; // < 5 min

  return (
    <>
      {/* Top bar (no sidebar during exam) */}
      <div className="exam-header">
        <div className="exam-brand"><span className="brand-mark">V</span><span>verity</span></div>
        <h1>{exam.title}</h1>
        <div className="exam-header-meta"><span className={`save-status ${saveState === 'Saving' ? 'is-saving' : saveState === 'Not saved' ? 'is-failed' : 'is-saved'}`} role="status">{saveState === 'Saving' ? 'Saving answers…' : saveState === 'Not saved' ? 'Answers not saved' : 'All changes saved'}</span>
        <span
          className="tm"
          style={timerUrgent ? { background: 'var(--errbg)', color: 'var(--err)' } : {}}
          aria-label={`Time remaining: ${display}`}
          aria-live="off"
        >
          {expired ? '00:00' : display}
        </span>
        </div>
      </div>

      <main className="exam-workspace">
        {attemptError && <div className="alert alert-error" role="alert">{attemptError}</div>}
        <div className="exam-progress"><span>Question {attempt.questionIndex + 1} <span className="mut">of {totalQ}</span></span><div className="progress-track" role="progressbar" aria-valuenow={attempt.questionIndex + 1} aria-valuemin={1} aria-valuemax={totalQ}><span style={{ width: `${((attempt.questionIndex + 1) / totalQ) * 100}%` }} /></div></div>
        <div className="ex">
          {/* Question area */}
          <div>
            <section className="question-card">
              <div className="question-card-heading"><span className="eyebrow">QUESTION {String(attempt.questionIndex + 1).padStart(2, '0')}</span><div className="row"><span className="mark-value">{q.marks} {q.marks === 1 ? 'mark' : 'marks'}</span><button type="button" className="flag-question" aria-pressed={flaggedQuestions.has(attempt.questionIndex)} onClick={() => toggleFlag(attempt.questionIndex)}><Flag size={14} />{flaggedQuestions.has(attempt.questionIndex) ? 'Flagged for review' : 'Flag for review'}</button></div></div>
              <h2>{q.text}</h2>

            {q.type === 'mcq' ? (
              q.options.map((opt, k) => (
                <label key={k} className="opt">
                  <input
                    type="radio"
                    name="mcq-option"
                    checked={attempt.answers[attempt.questionIndex] === k}
                    onChange={() => setAnswer(k)}
                  />
                  {' '}{opt}
                </label>
              ))
            ) : (
              <>
                <textarea
                  rows={7}
                  placeholder="Type your answer…"
                  value={(attempt.answers[attempt.questionIndex] as string) ?? ''}
                  onChange={(e) => setAnswer(e.target.value)}
                  aria-label="Written answer"
                />
                <p className="field-hint">Your written answer is saved automatically. Check the save status above before submitting.</p>
              </>
            )}
            </section>

            <div className="exam-controls">
              <button
                type="button"
                className="btn sec"
                disabled={attempt.questionIndex === 0}
                onClick={() => goTo(attempt.questionIndex - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn sec"
                disabled={attempt.questionIndex === totalQ - 1}
                onClick={() => goTo(attempt.questionIndex + 1)}
              >
                Next
              </button>
              <span className="sp" />
              <button
                type="button"
                className="btn"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
                onClick={() => setShowConfirm(true)}
              >
                {isSubmitting ? 'Submitting…' : 'Submit examination'}
              </button>
            </div>
          </div>

          {/* Question navigator */}
          <aside className="question-nav-card" aria-label="Question navigation">
            <div className="question-nav-heading"><h3>Question map</h3><span className="sm mut">{Object.keys(attempt.answers).length} answered</span></div>
            <div className="qn">
              {exam.questions.map((_, k) => (
                <button
                  key={k}
                  type="button"
                  className={[
                    k === attempt.questionIndex ? 'cur' : '',
                    isAnswered(k) ? 'ans' : '',
                    flaggedQuestions.has(k) ? 'flagged' : '',
                  ]
                    .join(' ')
                    .trim()}
                  onClick={() => goTo(k)}
                  aria-label={`Question ${k + 1}${isAnswered(k) ? ', answered' : ''}${flaggedQuestions.has(k) ? ', flagged for review' : ''}`}
                  aria-current={k === attempt.questionIndex ? 'step' : undefined}
                >
                  {k + 1}
                </button>
              ))}
            </div>
            <div className="question-legend"><span><i className="legend-dot legend-answered" /> Answered</span><span><i className="legend-dot legend-current" /> Current</span>{flaggedQuestions.size > 0 && <span><i className="legend-dot legend-flagged" /> Flagged</span>}</div>
            <p className="field-hint">Review flags are held for this exam session and are not sent to the examination service. Page visibility events are recorded for examiner review.</p>
          </aside>
        </div>
      </main>

      {/* Confirm submit dialog */}
      {showConfirm && (
        <ConfirmDialog
          message="Submit your exam? You cannot change answers afterwards."
          confirmLabel="Submit"
          onConfirm={handleSubmit}
          onCancel={() => setShowConfirm(false)}
        />
      )}
      {isSubmitting && <p className="sr-only" role="status" aria-live="polite">Submitting your examination…</p>}
    </>
  );
}
