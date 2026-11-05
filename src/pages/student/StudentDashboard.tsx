import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpenCheck, CalendarDays, Clock3, FileCheck2, GraduationCap } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { Badge } from '../../components/common/Badge';
import { StatCard } from '../../components/common/StatCard';
import { EmptyState } from '../../components/common/EmptyState';
import { Skeleton } from '../../components/common/Skeleton';
import { formatDateTime } from '../../utils/format';
import type { Exam } from '../../types/exam';
import type { Result } from '../../types/result';

function studentExamStatus(exam: Exam, submittedExamIds: string[], now: number): string {
  if (exam.attemptStatus === 'IN_PROGRESS') return 'In Progress';
  if (exam.attemptStatus === 'SUBMITTED') return 'Submitted';
  if (exam.attemptStatus === 'TIMED_OUT') return 'Timed Out';
  if (submittedExamIds.includes(exam.id)) return 'Completed';
  if (exam.status === 'Active' || exam.status === 'Scheduled') {
    return exam.date && Date.parse(exam.date) > now ? 'Upcoming' : 'Available';
  }
  return exam.status;
}

function countdown(date: string, now: number) {
  const seconds = Math.max(0, Math.floor((Date.parse(date) - now) / 1000));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return { days, hours, minutes };
}

export function StudentDashboard() {
  const { authUser, exams, results, isLoading, error } = useApp();
  const navigate = useNavigate();
  // oxlint-disable-next-line react/purity -- initial clock snapshot is needed to calculate scheduled exam availability.
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const visibleExams = exams.filter((exam) => exam.status !== 'Draft');
  const submittedIds = results.map((result) => result.examId);
  const myResults: Result[] = results;
  const getStatus = (exam: Exam) => studentExamStatus(exam, submittedIds, now);
  const availableCount = visibleExams.filter((exam) => getStatus(exam) === 'Available').length;
  const upcomingCount = visibleExams.filter((exam) => getStatus(exam) === 'Upcoming').length;
  const completedCount = visibleExams.filter((exam) => ['Submitted', 'Timed Out', 'Completed'].includes(getStatus(exam))).length;
  const priority = (exam: Exam) => {
    const status = studentExamStatus(exam, submittedIds, now);
    if (status === 'In Progress') return 0;
    if (status === 'Available') return 1;
    if (status === 'Upcoming') return 2;
    return 3;
  };
  const priorityExam = [...visibleExams].filter((exam) => priority(exam) < 3)
    .sort((a, b) => priority(a) - priority(b) || Date.parse(a.date) - Date.parse(b.date))[0];

  function priorityCopy(exam: Exam) {
    const status = getStatus(exam);
    if (status === 'In Progress') return { eyebrow: 'PICK UP WHERE YOU LEFT OFF', title: 'Continue your examination', action: 'Resume examination' };
    if (status === 'Available') return { eyebrow: 'READY WHEN YOU ARE', title: 'An examination is available', action: 'View instructions' };
    return { eyebrow: 'COMING UP', title: 'Your next examination', action: 'View schedule' };
  }

  const upcomingTime = priorityExam && getStatus(priorityExam) === 'Upcoming' ? countdown(priorityExam.date, now) : null;

  return (
    <DashboardLayout title="Overview">
      <div className="dashboard-intro student-intro">
        <div><p className="eyebrow">STUDENT WORKSPACE</p><h1>Welcome back, {authUser?.name ?? 'Student'}</h1><p className="mut">Your upcoming work, examination history and results are together here.</p></div>
        <button className="btn sec" onClick={() => navigate('/student/results')}><FileCheck2 size={16} /> My results</button>
      </div>
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      {priorityExam && (() => {
        const copy = priorityCopy(priorityExam);
        return (
          <section className="next-exam-card" aria-label="Next examination">
            <div className="next-exam-content">
              <p className="eyebrow">{copy.eyebrow}</p><h2>{copy.title}</h2><h3>{priorityExam.title}</h3>
              <p>{priorityExam.subject} <span aria-hidden="true">·</span> {priorityExam.durationMinutes} minutes <span aria-hidden="true">·</span> {priorityExam.totalMarks} marks</p>
              <div className="next-exam-meta"><span><CalendarDays size={15} /> {formatDateTime(priorityExam.date)}</span><Badge label={getStatus(priorityExam)} /></div>
              <button className="btn" onClick={() => navigate(`/student/exam/${priorityExam.id}/instructions`)}>{copy.action}<ArrowRight size={16} /></button>
            </div>
            {upcomingTime ? <div className="countdown-card" aria-label={`${upcomingTime.days} days, ${upcomingTime.hours} hours until examination`}><span className="countdown-icon"><Clock3 size={20} /></span><span className="eyebrow">STARTS IN</span><div className="countdown-values"><strong>{upcomingTime.days}<small>d</small></strong><strong>{upcomingTime.hours}<small>h</small></strong><strong>{upcomingTime.minutes}<small>m</small></strong></div><span className="countdown-note">Countdown updates while this page is open.</span></div> : <div className="next-exam-ornament" aria-hidden="true"><BookOpenCheck size={62} strokeWidth={1.2} /></div>}
          </section>
        );
      })()}
      {!priorityExam && <section className="panel next-exam-empty" aria-label="Upcoming examinations">{isLoading ? <Skeleton lines={3} /> : <EmptyState icon={<CalendarDays size={20} />} title={error ? 'Schedule unavailable' : visibleExams.length === 0 ? 'No examinations assigned yet' : 'You are all caught up'} description={error ? 'Examination information could not be loaded. Try again later.' : visibleExams.length === 0 ? 'Any examinations assigned to you will appear in this space.' : 'There are no upcoming or available examinations right now.'} action={<button className="btn sec sm2" onClick={() => navigate('/student/results')}>Review published results</button>} />}</section>}

      <section className="grid student-stats" aria-label="Your examination summary">
        <StatCard value={isLoading ? '—' : availableCount} label="Available now" detail="Ready to begin" color="mint" icon={BookOpenCheck} />
        <StatCard value={isLoading ? '—' : upcomingCount} label="Upcoming" detail="Scheduled ahead" color="blue" icon={CalendarDays} />
        <StatCard value={isLoading ? '—' : completedCount} label="Completed" detail="Submitted or timed out" color="lav" icon={GraduationCap} />
        <StatCard value={isLoading ? '—' : myResults.length} label="Published results" detail="Scores available to you" color="peach" icon={FileCheck2} />
      </section>

      <section className="panel student-exams-panel">
        <div className="section-heading"><div><p className="eyebrow">YOUR SCHEDULE</p><h2>Examinations</h2></div><span className="panel-count">{isLoading ? '—' : visibleExams.length}</span></div>
        <div className="tw inner-table">
          <table>
            <thead><tr><th>Examination</th><th>Date</th><th>Duration</th><th>Status</th><th><span className="sr-only">Action</span></th></tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan={5} className="table-state"><span className="spinner" /> Loading your examinations…</td></tr> : visibleExams.length === 0 ? <tr><td colSpan={5} className="table-state">{error ? 'Examination data is unavailable.' : 'No examinations are available right now.'}</td></tr> : visibleExams.map((exam) => {
                const status = getStatus(exam);
                return <tr key={exam.id}><td><strong>{exam.title}</strong><span className="cell-subtitle">{exam.subject}</span></td><td>{formatDateTime(exam.date)}</td><td>{exam.durationMinutes} min</td><td><Badge label={status} /></td><td><button className={['Available', 'In Progress'].includes(status) ? 'btn sm2' : 'btn sec sm2'} disabled={['Submitted', 'Timed Out', 'Completed'].includes(status)} onClick={() => navigate(`/student/exam/${exam.id}/instructions`)}>{status === 'In Progress' ? 'Resume' : status === 'Available' ? 'Start' : status === 'Upcoming' ? 'Details' : 'Completed'}</button></td></tr>;
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel recent-results-panel">
        <div className="section-heading"><div><p className="eyebrow">FEEDBACK</p><h2>Recent results</h2></div><button className="text-link" onClick={() => navigate('/student/results')}>All results <ArrowRight size={15} /></button></div>
        {isLoading ? <p className="panel-state"><span className="spinner" /> Loading published results…</p> : myResults.length === 0 ? <p className="panel-state">No published results are available yet. Written responses remain pending until evaluated.</p> : (
          <div className="graded-list">{myResults.slice(0, 5).map((result) => <div className="graded-row" key={result.id}><span className="record-icon"><FileCheck2 size={16} /></span><div className="record-copy"><strong>{exams.find((exam) => exam.id === result.examId)?.title ?? result.examId}</strong><small>{result.status === 'Pending review' ? 'Awaiting examiner evaluation' : 'Result published'}</small></div><Badge label={result.status} /><strong className="graded-score">{result.score}</strong></div>)}</div>
        )}
      </section>
    </DashboardLayout>
  );
}
