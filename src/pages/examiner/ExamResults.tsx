import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import type { QuestionGrade, Result, ResultDetail } from '../../types/result';
import { resultService } from '../../services/resultService';

type GradeDraft = Record<string, { marks: string; feedback: string }>;

export function ExamResults() {
  const { results, exams, authUser, isLoading, error, refreshResults } = useApp();
  const [selectedResult, setSelectedResult] = useState<Result | null>(null);
  const [detail, setDetail] = useState<ResultDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [grades, setGrades] = useState<GradeDraft>({});

  const getExamTitle = (examId: string) => exams.find((exam) => exam.id === examId)?.title ?? examId;
  const canEvaluate = authUser?.role === 'Examiner' || authUser?.role === 'Administrator';

  async function openResult(result: Result) {
    setSelectedResult(result);
    setDetail(null);
    setDetailError('');
    setSaveMessage('');
    setDetailLoading(true);
    try {
      const fullResult = await resultService.getById(result.id);
      setDetail(fullResult);
      setGrades(Object.fromEntries(fullResult.questions
        .filter((question) => question.type === 'sub')
        .map((question) => [question.questionId, {
          marks: question.awardedMarks === null ? '' : String(question.awardedMarks),
          feedback: question.feedback ?? '',
        }])));
    } catch (requestError) {
      setDetailError(requestError instanceof Error ? requestError.message : 'Unable to load result details.');
    } finally {
      setDetailLoading(false);
    }
  }

  async function saveEvaluation() {
    if (!detail) return;
    const submittedGrades: QuestionGrade[] = detail.questions
      .filter((question) => question.type === 'sub' && grades[question.questionId]?.marks.trim() !== '')
      .map((question) => ({
        questionId: question.questionId,
        marks: Number(grades[question.questionId]?.marks),
        ...(grades[question.questionId]?.feedback.trim() ? { feedback: grades[question.questionId]!.feedback.trim() } : {}),
      }));
    if (submittedGrades.length === 0) {
      setDetailError('Enter marks for at least one written answer before saving.');
      return;
    }

    setSaving(true);
    setDetailError('');
    setSaveMessage('');
    try {
      await resultService.evaluate(detail.id, submittedGrades);
      await refreshResults();
      await openResult(detail);
      setSaveMessage('Evaluation saved. The result is published when every written answer has been graded.');
    } catch (requestError) {
      setDetailError(requestError instanceof Error ? requestError.message : 'Unable to save evaluation.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout title="Results">
      <div className="page-heading">
        <div><p className="eyebrow">ASSESSMENT REVIEW</p><h1>Examination results</h1><p className="mut">Review submissions and evaluate written answers for your examinations.</p></div>
        <div className="heading-count"><strong>{results.length}</strong><span>results</span></div>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <div className="tw" style={{ marginTop: '1rem' }}>
        <table>
          <thead><tr><th>Student</th><th>Exam</th><th>Status</th><th>Score</th><th>Actions</th></tr></thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="table-state"><span className="spinner" /> Loading results…</td></tr>
            ) : results.length === 0 ? (
              <tr><td colSpan={5} className="table-state"><EmptyState title="No results yet" description="Submitted examination results will appear here." compact /></td></tr>
            ) : results.map((result) => (
              <tr key={result.id}>
                <td>{result.studentName}</td>
                <td>{getExamTitle(result.examId)}</td>
                <td><Badge label={result.status} /></td>
                <td>{result.score}</td>
                <td><button className="btn sec sm2" onClick={() => void openResult(result)}>Review answers</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedResult && (
        <div className="ov" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedResult(null); }}>
          <section className="dlg result-dialog" role="dialog" aria-modal="true" aria-labelledby="rd-title">
            <div className="evaluation-header">
              <div><p className="eyebrow">RESULT REVIEW</p><h2 id="rd-title">{selectedResult.studentName}</h2><div className="evaluation-meta"><span>{getExamTitle(selectedResult.examId)}</span><span>Score: {detail?.score ?? selectedResult.score}</span><span>{detail?.questions.length ?? 0} questions</span></div></div>
              {detail && detail.questions.some((question) => question.type === 'sub') && (() => {
                const written = detail.questions.filter((question) => question.type === 'sub');
                const graded = written.filter((question) => question.awardedMarks !== null).length;
                return <div className="evaluation-progress" aria-label={`${graded} of ${written.length} written answers evaluated`}><div><span>Written answers</span><strong>{graded} / {written.length}</strong></div><div className="evaluation-progress-track"><span style={{ width: `${(graded / written.length) * 100}%` }} /></div></div>;
              })()}
            </div>
            {detailLoading ? <div className="table-state"><span className="spinner" /> Loading answer details…</div> : null}
            {detailError && <div className="alert alert-error" role="alert">{detailError}</div>}
            {saveMessage && <div className="alert alert-success" role="status">{saveMessage}</div>}
            {detail && (
              <>
                <div className="result-summary"><span>Status <Badge label={detail.status} /></span><span>Score <strong>{detail.score}</strong></span></div>
                <div className="result-questions">
                  {detail.questions.map((question) => {
                    const answerLabel = question.type === 'mcq' && typeof question.answer === 'number'
                      ? question.options?.[question.answer] ?? 'Answer unavailable'
                      : typeof question.answer === 'string' && question.answer.trim() ? question.answer : 'No answer submitted.';
                    return (
                      <article className="evaluation-question" key={question.questionId}>
                        <div className="evaluation-answer-pane">
                          <div className="question-card-heading"><span className="eyebrow">QUESTION {String(question.number).padStart(2, '0')}</span><span className="mark-value">{question.marks} marks</span></div>
                          <h3>{question.text}</h3>
                          <p className="answer-label">Student answer</p><div className="answer-content">{answerLabel}</div>
                          <p className="answer-score">{question.type === 'mcq' ? 'Automatically scored' : 'Awarded'}: {question.awardedMarks === null ? 'Pending review' : `${question.awardedMarks} / ${question.marks}`}</p>
                          {question.feedback && !canEvaluate && <div className="alert alert-info">{question.feedback}</div>}
                        </div>
                        <div className="evaluation-grade-pane">
                          {question.type === 'sub' && canEvaluate ? (
                            <div className="grade-fields">
                              <p className="eyebrow">WRITTEN ANSWER EVALUATION</p>
                              <label htmlFor={`marks-${question.questionId}`}>Marks awarded (max {question.marks})</label>
                              <input id={`marks-${question.questionId}`} type="number" min="0" max={question.marks} step="0.01" value={grades[question.questionId]?.marks ?? ''} onChange={(event) => setGrades((current) => ({ ...current, [question.questionId]: { marks: event.target.value, feedback: current[question.questionId]?.feedback ?? '' } }))} />
                              <label htmlFor={`feedback-${question.questionId}`}>Feedback for student</label>
                              <textarea id={`feedback-${question.questionId}`} rows={4} value={grades[question.questionId]?.feedback ?? ''} onChange={(event) => setGrades((current) => ({ ...current, [question.questionId]: { marks: current[question.questionId]?.marks ?? '', feedback: event.target.value } }))} placeholder="Add clear, constructive feedback" />
                            </div>
                          ) : <div className="evaluation-readonly"><span className="eyebrow">{question.type === 'mcq' ? 'AUTOMATIC SCORING' : 'FEEDBACK'}</span><strong>{question.type === 'mcq' ? `${question.awardedMarks ?? 0} / ${question.marks} marks` : question.feedback || 'No feedback provided yet.'}</strong>{question.type === 'mcq' && <span>MCQ marks are calculated by the examination service.</span>}</div>}
                        </div>
                      </article>
                    );
                  })}
                </div>
                {detail.questions.some((question) => question.type === 'sub') && canEvaluate && (
                  <p className="field-hint">Save a partial evaluation and return later, or grade every written answer to finalize and publish this result.</p>
                )}
              </>
            )}
            <div className="bar">
              <button className="btn sec" onClick={() => setSelectedResult(null)}>Close</button>
              {detail && canEvaluate && detail.questions.some((question) => question.type === 'sub') && (
                <button className="btn" disabled={saving || detailLoading} onClick={() => void saveEvaluation()}>{saving ? 'Saving…' : 'Save evaluation'}</button>
              )}
            </div>
          </section>
        </div>
      )}
    </DashboardLayout>
  );
}
