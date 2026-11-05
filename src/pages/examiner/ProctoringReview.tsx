/** ProctoringReview.tsx – Examiner proctoring events review */

import { useApp } from '../../context/AppContext';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { Badge } from '../../components/common/Badge';
import { Toast } from '../../components/common/Toast';
import { useToast } from '../../hooks/useToast';

export function ProctoringReview() {
  const { proctoringEvents, setEventReviewStatus, isLoading, error } = useApp();
  const { message, toast } = useToast();

  async function toggleStatus(id: string, currentStatus: 'Open' | 'Reviewed') {
    const nextStatus = currentStatus === 'Open' ? 'Reviewed' : 'Open';
    try {
      await setEventReviewStatus(id, nextStatus);
      toast(`Event marked as ${nextStatus.toLowerCase()}`);
    } catch {
      toast('Failed to update event review status');
    }
  }

  return (
    <DashboardLayout title="Proctoring">
      <h1>Proctoring Event Logs</h1>
      <p className="mut">
        Browser visibility events are recorded during active examinations. These records provide review context and do not establish misconduct.
      </p>

      {error && (
        <div className="err" role="alert" style={{ margin: '1rem 0' }}>
          {error}
        </div>
      )}

      <div className="tw" style={{ marginTop: '1rem' }}>
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Exam</th>
              <th>Time</th>
              <th>Recorded Event</th>
              <th>Review Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="mut">
                  Loading proctoring event logs…
                </td>
              </tr>
            ) : proctoringEvents.length === 0 ? (
              <tr>
                <td colSpan={6} className="mut">
                  {error ? 'Unable to load proctoring logs.' : 'No proctoring events recorded.'}
                </td>
              </tr>
            ) : (
              proctoringEvents.map((v) => (
                <tr key={v.id}>
                  <td>{v.studentName}</td>
                  <td>{v.examTitle ?? '—'}</td>
                  <td>{new Date(v.time).toLocaleString()}</td>
                  <td>{v.type}</td>
                  <td>
                    <Badge label={v.reviewStatus} />
                  </td>
                  <td>
                    <button
                      className="btn sec sm2"
                      onClick={() => toggleStatus(v.id, v.reviewStatus)}
                    >
                      Mark {v.reviewStatus === 'Open' ? 'reviewed' : 'open'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Toast message={message} />
    </DashboardLayout>
  );
}
