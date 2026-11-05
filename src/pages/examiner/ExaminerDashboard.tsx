import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, BookOpen, ClipboardCheck, Clock3, FileCheck2, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import { formatDateTime } from '../../utils/format';
import { attemptService } from '../../services/attemptService';
import { ExamForm } from '../../components/forms/ExamForm';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/common/Toast';
import type { ExamDraft, ExamStatus } from '../../types/exam';

export function ExaminerDashboard() {
  const { exams, results, proctoringEvents, createExam, isLoading, error } = useApp();
  const navigate = useNavigate();
  const { message, toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [attemptSummary, setAttemptSummary] = useState<{ count: number; liveCount: number } | null>(null);
  const [attemptsError, setAttemptsError] = useState('');

  useEffect(() => {
    let active = true;
    attemptService.getSummary().then((summary) => {
      if (active) setAttemptSummary(summary);
    }).catch((requestError: unknown) => {
      if (active) setAttemptsError(requestError instanceof Error ? requestError.message : 'Attempt metrics are unavailable.');
    });
    return () => { active = false; };
  }, []);

  const count = (status: ExamStatus) => exams.filter((exam) => exam.status === status).length;
  const pendingResults = results.filter((result) => result.status === 'Pending review');
  const openEvents = proctoringEvents.filter((event) => event.reviewStatus === 'Open');
  const schedule = useMemo(() => exams.filter((exam) => ['Active', 'Scheduled'].includes(exam.status))
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date)), [exams]);
  const recentGraded = results.filter((result) => result.status === 'Graded').slice(0, 4);

  async function handleCreate(data: ExamDraft, status: ExamStatus) {
    try {
      await createExam(data, status);
      setShowForm(false);
      toast(status === 'Draft' ? 'Exam saved as draft' : 'Exam published');
    } catch (requestError) {
      toast(requestError instanceof Error ? requestError.message : 'Unable to save the examination. Please try again.');
    }
  }

  return (
    <DashboardLayout title="Overview">
      <div className="dashboard-intro">
        <div><p className="eyebrow">EXAM OPERATIONS</p><h1>Your examination workspace</h1><p className="mut">Review schedules, follow active attempts and keep evaluations moving.</p></div>
        <button className="btn" onClick={() => setShowForm(true)}><Plus size={17} /> Create examination</button>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <section className="grid" aria-label="Examination metrics">
        <StatCard value={isLoading ? '—' : exams.length} label="Assigned exams" detail="Examinations you manage" color="blue" icon={BookOpen} />
        <StatCard value={count('Scheduled')} label="Upcoming" detail="Scheduled to open later" color="lav" icon={Clock3} />
        <StatCard value={count('Active')} label="Active exams" detail="Currently available to students" color="mint" icon={FileCheck2} />
        <StatCard value={attemptSummary?.count ?? '—'} label="Attempts recorded" detail="Across your examinations" color="blue" icon={ClipboardCheck} />
        <StatCard value={attemptSummary?.liveCount ?? '—'} label="Live attempts" detail={attemptsError || 'Students taking an exam now'} color="peach" icon={Clock3} />
        <StatCard value={isLoading ? '—' : pendingResults.length} label="Pending evaluation" detail="Submissions with written answers" color="mint" icon={ClipboardCheck} />
        <StatCard value={isLoading ? '—' : openEvents.length} label="Proctoring alerts" detail="Open events in your review queue" color="peach" icon={AlertTriangle} />
      </section>

      <div className="dashboard-columns">
        <section className="panel">
          <div className="section-heading"><div><p className="eyebrow">SCHEDULE</p><h2>Upcoming and active</h2></div><button className="text-link" onClick={() => navigate('/examiner/exams')}>Manage exams <ArrowRight size={15} /></button></div>
          <div className="tw inner-table">
            <table>
              <thead><tr><th>Examination</th><th>Availability</th><th>Status</th></tr></thead>
              <tbody>
                {isLoading ? <tr><td colSpan={3} className="table-state"><span className="spinner" /> Loading your schedule…</td></tr> : schedule.length === 0 ? <tr><td colSpan={3} className="table-state">{error ? 'Schedule data is unavailable.' : 'No active or scheduled examinations.'}</td></tr> : schedule.slice(0, 6).map((exam) => <tr key={exam.id}><td><strong>{exam.title}</strong><span className="cell-subtitle">{exam.subject}</span></td><td>{formatDateTime(exam.date)}</td><td><Badge label={exam.status} /></td></tr>)}
              </tbody>
            </table>
          </div>
          <button className="btn sec" onClick={() => navigate('/examiner/exams')}>View all examinations</button>
        </section>

        <div className="dashboard-stack">
          <section className="panel">
            <div className="section-heading"><div><p className="eyebrow">REVIEW QUEUE</p><h2>Pending evaluations</h2></div><button className="icon-link" aria-label="Open result evaluations" onClick={() => navigate('/examiner/results')}><ArrowRight size={17} /></button></div>
            {isLoading ? <p className="panel-state"><span className="spinner" /> Loading evaluations…</p> : pendingResults.length === 0 ? <p className="panel-state">No written answers are waiting for evaluation.</p> : <div className="compact-record-list">{pendingResults.slice(0, 5).map((result) => <button className="compact-record" key={result.id} onClick={() => navigate('/examiner/results')}><span className="record-icon"><ClipboardCheck size={16} /></span><span className="record-copy"><strong>{result.studentName}</strong><small>{exams.find((exam) => exam.id === result.examId)?.title ?? result.examId}</small></span><Badge label="Pending review" /><ArrowRight className="record-arrow" size={15} /></button>)}</div>}
            {pendingResults.length > 0 && <button className="text-link queue-link" onClick={() => navigate('/examiner/results')}>Open evaluation workspace <ArrowRight size={15} /></button>}
          </section>

          <section className="panel">
            <div className="section-heading"><div><p className="eyebrow">PROCTORING</p><h2>Review alerts</h2></div><button className="icon-link" aria-label="Open proctoring review" onClick={() => navigate('/examiner/proctoring')}><ArrowRight size={17} /></button></div>
            {isLoading ? <p className="panel-state"><span className="spinner" /> Loading alerts…</p> : openEvents.length === 0 ? <p className="panel-state">No open proctoring events to review.</p> : <div className="compact-record-list">{openEvents.slice(0, 3).map((event) => <button className="compact-record" key={event.id} onClick={() => navigate('/examiner/proctoring')}><span className="record-icon alert-record-icon"><AlertTriangle size={16} /></span><span className="record-copy"><strong>{event.studentName}</strong><small>{event.type.replaceAll('_', ' ')} · {event.examTitle ?? 'Examination'}</small></span><Badge label="Open" /><ArrowRight className="record-arrow" size={15} /></button>)}</div>}
          </section>
        </div>
      </div>

      <section className="panel graded-panel">
        <div className="section-heading"><div><p className="eyebrow">RESULTS</p><h2>Graded submissions</h2><p className="mut panel-subtitle">Most recently submitted graded results for examinations you manage.</p></div><button className="text-link" onClick={() => navigate('/examiner/results')}>All results <ArrowRight size={15} /></button></div>
        {isLoading ? <p className="panel-state"><span className="spinner" /> Loading results…</p> : recentGraded.length === 0 ? <p className="panel-state">No graded submissions are available yet.</p> : <div className="graded-list">{recentGraded.map((result) => <div className="graded-row" key={result.id}><span className="record-icon"><FileCheck2 size={16} /></span><div className="record-copy"><strong>{result.studentName}</strong><small>{exams.find((exam) => exam.id === result.examId)?.title ?? result.examId}</small></div><Badge label="Graded" /><strong className="graded-score">{result.score}</strong></div>)}</div>}
      </section>

      {attemptSummary && <p className="sr-only" role="status">{attemptSummary.count} total attempts recorded, including {attemptSummary.liveCount} live attempts.</p>}
      {attemptsError && <p className="field-hint" role="status">Attempt data unavailable: {attemptsError}</p>}
      {showForm && <ExamForm onSave={handleCreate} onCancel={() => setShowForm(false)} />}
      <Toast message={message} />
    </DashboardLayout>
  );
}
