import { useEffect, useState } from 'react';
import { Badge } from '../components/common/Badge';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { attemptService } from '../services/attemptService';
import type { AttemptSummary } from '../types/attempt';

const statusLabel: Record<AttemptSummary['status'], string> = {
  IN_PROGRESS: 'In Progress', SUBMITTED: 'Submitted', TIMED_OUT: 'Timed Out',
};

export function AttemptMonitoring() {
  const [attempts, setAttempts] = useState<AttemptSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    attemptService.getAll().then((rows) => {
      if (active) setAttempts(rows);
    }).catch((err: unknown) => {
      if (active) setError(err instanceof Error ? err.message : 'Unable to load examination attempts.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  return (
    <DashboardLayout title="Attempts">
      <div className="page-heading">
        <div><p className="eyebrow">EXAM OPERATIONS</p><h1>Examination attempts</h1><p className="mut">Monitor participation and evaluation progress across your examinations.</p></div>
        <div className="heading-count"><strong>{attempts.length}</strong><span>records</span></div>
      </div>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <div className="tw">
        <table>
          <thead><tr><th>Student</th><th>Examination</th><th>Started</th><th>Deadline</th><th>Status</th><th>Evaluation</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="table-state"><span className="spinner" /> Loading attempts…</td></tr> : attempts.length === 0 ? <tr><td colSpan={6} className="table-state"><div className="empty-state"><span className="empty-icon">⌁</span><strong>No attempts yet</strong><span>Student activity will appear here when an examination begins.</span></div></td></tr> : attempts.map((attempt) => (
              <tr key={attempt.id}>
                <td><strong>{attempt.studentName}</strong><span className="cell-subtitle">{attempt.studentEmail}</span></td>
                <td>{attempt.examTitle}</td>
                <td>{new Date(attempt.startedAt).toLocaleString()}</td>
                <td>{new Date(attempt.deadlineAt).toLocaleString()}</td>
                <td><Badge label={statusLabel[attempt.status]} /></td>
                <td>{attempt.evaluationStatus === 'PENDING_REVIEW' ? <Badge label="Pending review" /> : attempt.evaluationStatus === 'FINALIZED' ? <Badge label="Graded" /> : <span className="mut">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
