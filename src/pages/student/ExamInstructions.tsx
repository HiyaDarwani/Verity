/** ExamInstructions.tsx – pre-exam instructions and start acknowledgement */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { StatCard } from '../../components/common/StatCard';

export function ExamInstructions() {
  const { id } = useParams<{ id: string }>();
  const { exams, results } = useApp();
  const navigate = useNavigate();
  const [acknowledged, setAcknowledged] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const exam = exams.find((e) => e.id === id);
  const scheduledStart = exam?.date ? Date.parse(exam.date) : 0;

  useEffect(() => {
    if (!Number.isFinite(scheduledStart)) return;
    const delay = scheduledStart - Date.now();
    // This state mirrors an external clock boundary after commit.
    // oxlint-disable-next-line react-hooks/set-state-in-effect
    setHasStarted(delay <= 0);
    if (delay <= 0) return;
    const timer = window.setTimeout(() => setHasStarted(true), delay + 25);
    return () => window.clearTimeout(timer);
  }, [scheduledStart]);

  if (!exam) {
    return (
      <DashboardLayout title="Exam instructions">
        <p className="mut">Exam not found.</p>
        <button className="btn sec" onClick={() => navigate('/student/dashboard')}>
          Back to dashboard
        </button>
      </DashboardLayout>
    );
  }

  const isCompleted = exam.status === 'Completed' ||
    exam.attemptStatus === 'SUBMITTED' || exam.attemptStatus === 'TIMED_OUT' ||
    results.some((r) => r.examId === exam.id);
  const isAvailable = (exam.status === 'Active' || exam.status === 'Scheduled') && hasStarted && !isCompleted;
  const isUpcoming = !isAvailable && !isCompleted && !hasStarted;

  return (
    <DashboardLayout title="Exam instructions">
      <h1>{exam.title}</h1>
      <p className="mut">{exam.subject}</p>

      <div className="grid">
        <StatCard value={`${exam.durationMinutes} min`} label="Duration" color="blue" />
        <StatCard value={exam.totalMarks} label="Total marks" color="lav" />
        <StatCard value={exam.questions.length} label="Questions" color="mint" />
      </div>

      <h2>Instructions</h2>
      <ul className="mut">
        <li>Answer every question; MCQs have one correct option.</li>
        <li>The timer runs once you start. The exam submits when it ends.</li>
        <li>Verity records when the exam page becomes hidden. An event is reviewed in context and does not by itself establish misconduct.</li>
        <li>Written answers are marked as pending until evaluated by an examiner.</li>
      </ul>

      {isAvailable ? (
        <>
          <p>
            <label className="opt" style={{ maxWidth: '420px' }}>
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
              />
              {' '}I have read and understood the instructions.
            </label>
          </p>
          <div className="row">
            <button
              className="btn sec"
              onClick={() => navigate('/student/dashboard')}
            >
              Back
            </button>
            <button
              className="btn"
              disabled={!acknowledged}
              onClick={() => navigate(`/student/exam/${exam.id}/take`)}
            >
              {exam.attemptStatus === 'IN_PROGRESS' ? 'Resume Exam' : 'Start Exam'}
            </button>
          </div>
        </>
      ) : (
        <>
          <p>
          <span className="bdg b-n">
              {isCompleted ? 'Already completed' : isUpcoming ? `Opens ${new Date(scheduledStart).toLocaleString()}` : 'This exam is not available to start.'}
            </span>
          </p>
          <p>
            <button
              className="btn sec"
              onClick={() => navigate('/student/dashboard')}
            >
              Back
            </button>
          </p>
        </>
      )}
    </DashboardLayout>
  );
}
