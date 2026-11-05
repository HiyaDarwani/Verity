import { useState } from 'react';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { Badge } from '../../components/common/Badge';
import { useApp } from '../../context/AppContext';
import { resultService } from '../../services/resultService';
import type { Result, ResultDetail } from '../../types/result';

export function StudentResults() {
  const { results, exams, isLoading, error } = useApp();
  const [selectedResult, setSelectedResult] = useState<Result | null>(null);
  const [detail, setDetail] = useState<ResultDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState('');
  const examTitle = (result: Result) => exams.find((exam) => exam.id === result.examId)?.title ?? result.examId;

  async function openResult(result: Result) {
    setSelectedResult(result);
    setDetail(null);
    setDetailError('');
    setLoadingDetail(true);
    try {
      setDetail(await resultService.getById(result.id));
    } catch (requestError) {
      setDetailError(requestError instanceof Error ? requestError.message : 'Unable to load result details.');
    } finally {
      setLoadingDetail(false);
    }
  }

  return (
    <DashboardLayout title="My Results">
      <div className="page-heading"><div><p className="eyebrow">YOUR EXAM HISTORY</p><h1>Your results</h1><p className="mut">Published scores and examiner feedback for completed examinations.</p></div></div>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <div className="tw">
        <table>
          <thead><tr><th>Examination</th><th>Status</th><th>Score</th><th>Details</th></tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={4} className="table-state"><span className="spinner" /> Loading your results…</td></tr>
              : results.length === 0 ? <tr><td colSpan={4} className="table-state"><div className="empty-state"><span className="empty-icon">▤</span><strong>No published results</strong><span>Your results will appear here after evaluation and publication.</span></div></td></tr>
                : results.map((result) => <tr key={result.id}><td>{examTitle(result)}</td><td><Badge label={result.status} /></td><td>{result.score}</td><td><button className="btn sec sm2" onClick={() => void openResult(result)}>View feedback</button></td></tr>)}
          </tbody>
        </table>
      </div>

      {selectedResult && (
        <div className="ov" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedResult(null); }}>
          <section className="dlg result-dialog" role="dialog" aria-modal="true" aria-labelledby="student-result-title">
            <p className="eyebrow">PUBLISHED RESULT</p>
            <h2 id="student-result-title">{examTitle(selectedResult)}</h2>
            <p className="mut">{selectedResult.score}</p>
            {loadingDetail && <div className="table-state"><span className="spinner" /> Loading feedback…</div>}
            {detailError && <div className="alert alert-error" role="alert">{detailError}</div>}
            {detail && <div className="result-questions">{detail.questions.map((question) => {
              const answerLabel = question.type === 'mcq' && typeof question.answer === 'number'
                ? question.options?.[question.answer] ?? 'Answer unavailable'
                : typeof question.answer === 'string' && question.answer.trim() ? question.answer : 'No answer submitted.';
              return <article className="result-question" key={question.questionId}>
                <div className="question-card-heading"><span className="eyebrow">QUESTION {String(question.number).padStart(2, '0')}</span><span className="mark-value">{question.awardedMarks ?? 0} / {question.marks}</span></div>
                <h3>{question.text}</h3><p className="answer-label">Your answer</p><div className="answer-content">{answerLabel}</div>
                {question.feedback && <div className="alert alert-info">{question.feedback}</div>}
              </article>;
            })}</div>}
            <div className="bar"><button className="btn sec" onClick={() => setSelectedResult(null)}>Close</button></div>
          </section>
        </div>
      )}
    </DashboardLayout>
  );
}
