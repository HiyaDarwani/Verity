import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ArrowRight, BookOpen, ClipboardCheck, Clock3, GraduationCap, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import { Skeleton } from '../../components/common/Skeleton';
import { activityService } from '../../services/activityService';
import { attemptService } from '../../services/attemptService';
import type { ActivityLog } from '../../types/api';
import { formatDateTime } from '../../utils/format';

function ActivityChart({ items, loading, error }: { items: ActivityLog[]; loading: boolean; error: string | null }) {
  const buckets = useMemo(() => {
    const latestTime = Math.max(0, ...items.map((item) => Date.parse(item.timestamp)).filter(Number.isFinite));
    if (latestTime === 0) return [];
    const latest = new Date(latestTime);
    latest.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, offset) => {
      const day = new Date(latest);
      day.setDate(day.getDate() - (6 - offset));
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      const count = items.filter((item) => {
        const time = Date.parse(item.timestamp);
        return Number.isFinite(time) && time >= day.getTime() && time < next.getTime();
      }).length;
      return { label: day.toLocaleDateString(undefined, { weekday: 'short' }), date: day.toLocaleDateString(), count };
    });
  }, [items]);
  const max = Math.max(1, ...buckets.map((bucket) => bucket.count));

  if (loading) return <div className="chart-state"><span className="spinner" /> Loading activity data…</div>;
  if (error) return <div className="chart-state" role="status">{error}</div>;
  if (items.length === 0 || buckets.length === 0) return <div className="chart-state">No platform activity is available yet.</div>;

  return (
    <div className="activity-chart" role="img" aria-label={`Platform activity for the last seven days: ${buckets.map((item) => `${item.label} ${item.count}`).join(', ')}`}>
      {buckets.map((bucket) => (
        <div className="activity-chart-column" key={bucket.label} title={`${bucket.date}: ${bucket.count} activities`}>
          <span className="activity-chart-count">{bucket.count}</span>
          <div className="activity-chart-track"><span style={{ height: `${bucket.count === 0 ? 4 : Math.max(10, (bucket.count / max) * 100)}%` }} /></div>
          <span className="activity-chart-label">{bucket.label}</span>
        </div>
      ))}
    </div>
  );
}

export function AdminDashboard() {
  const { users, exams, results, proctoringEvents, isLoading, error } = useApp();
  const navigate = useNavigate();
  const [attemptSummary, setAttemptSummary] = useState<{ count: number; liveCount: number } | null>(null);
  const [attemptsError, setAttemptsError] = useState<string | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    activityService.getRecentActivities().then((logs) => {
      if (active) setActivities(logs);
    }).catch(() => {
      if (active) setActivitiesError('Activity data is unavailable.');
    }).finally(() => {
      if (active) setActivitiesLoading(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    attemptService.getSummary().then((summary) => {
      if (active) setAttemptSummary(summary);
    }).catch(() => {
      if (active) setAttemptsError('Attempt data is unavailable.');
    });
    return () => { active = false; };
  }, []);

  const countRole = (role: string) => users.filter((user) => user.role === role).length;
  const activeExams = exams.filter((exam) => exam.status === 'Active').length;
  const pendingEvaluations = results.filter((result) => result.status === 'Pending review').length;
  const recentExams = [...exams].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 5);
  const activeUsers = users.filter((user) => user.active).length;
  const userTotal = users.length;

  return (
    <DashboardLayout title="Overview">
      <div className="dashboard-intro">
        <div><p className="eyebrow">PLATFORM OVERVIEW</p><h1>Good day. Here’s your platform at a glance.</h1><p className="mut">Manage people, examinations and assessment operations from one place.</p></div>
        <div className="dashboard-quick-actions">
          <button className="btn sec" onClick={() => navigate('/admin/users')}><Users size={16} /> Manage users</button>
          <button className="btn" onClick={() => navigate('/admin/exams')}><BookOpen size={16} /> Examinations</button>
        </div>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <section aria-label="Platform metrics" className="grid">
        <StatCard value={isLoading ? '—' : users.length} label="Total users" detail={isLoading ? 'Loading accounts' : `${activeUsers} active accounts`} color="blue" icon={Users} />
        <StatCard value={isLoading ? '—' : countRole('Student')} label="Students" detail="Registered student accounts" color="mint" icon={GraduationCap} />
        <StatCard value={isLoading ? '—' : exams.length} label="Examinations" detail="Total examinations" color="lav" icon={BookOpen} />
        <StatCard value={isLoading ? '—' : activeExams} label="Active examinations" detail="Currently available to students" color="blue" icon={BookOpen} />
        <StatCard value={attemptSummary?.liveCount ?? '—'} label="Live attempts" detail={attemptsError ?? 'In progress right now'} color="peach" icon={Clock3} />
        <StatCard value={isLoading ? '—' : pendingEvaluations} label="Pending evaluations" detail="Written answers awaiting review" color="mint" icon={ClipboardCheck} />
        <StatCard value={proctoringEvents.filter((event) => event.reviewStatus === 'Open').length} label="Open alerts" detail="Proctoring events to review" color="blue" icon={Activity} />
      </section>

      <div className="dashboard-columns">
        <section className="panel activity-panel">
          <div className="section-heading"><div><p className="eyebrow">SEVEN-DAY ACTIVITY WINDOW</p><h2>Platform activity</h2></div><button type="button" className="text-link" onClick={() => navigate('/admin/activities')}>Activity log <ArrowRight size={15} /></button></div>
          <ActivityChart items={activities} loading={activitiesLoading} error={activitiesError} />
          <p className="panel-footnote">Counts group recorded activity by day. This window ends on the latest event returned by the activity service.</p>
        </section>

        <section className="panel user-overview-panel">
          <div className="section-heading"><div><p className="eyebrow">ACCOUNT DIRECTORY</p><h2>User overview</h2></div><button type="button" className="icon-link" aria-label="Open user management" onClick={() => navigate('/admin/users')}><ArrowRight size={17} /></button></div>
          {isLoading ? <Skeleton lines={4} className="panel-skeleton" /> : userTotal === 0 ? <p className="panel-state">No user accounts found.</p> : (
            <>
              <div className="user-total"><strong>{userTotal}</strong><span>accounts in directory</span></div>
              <div className="user-role-list">
                {[['Students', countRole('Student')], ['Examiners', countRole('Examiner')], ['Administrators', countRole('Administrator')]].map(([label, count]) => (
                  <div className="user-role-row" key={label}><span>{label}</span><strong>{count}</strong><span className="user-role-track"><i style={{ width: `${userTotal ? (Number(count) / userTotal) * 100 : 0}%` }} /></span></div>
                ))}
              </div>
              <p className="panel-footnote">{activeUsers} active · {userTotal - activeUsers} deactivated</p>
            </>
          )}
        </section>
      </div>

      <div className="dashboard-columns dashboard-columns-bottom">
        <section className="panel">
          <div className="section-heading"><div><p className="eyebrow">SCHEDULE</p><h2>Recent examinations</h2></div><button className="text-link" onClick={() => navigate('/admin/exams')}>All exams <ArrowRight size={15} /></button></div>
          {isLoading ? <Skeleton lines={4} className="panel-skeleton" /> : recentExams.length === 0 ? <p className="panel-state">No examinations have been created yet.</p> : (
            <div className="compact-record-list">{recentExams.map((exam) => <button className="compact-record" key={exam.id} onClick={() => navigate('/admin/exams')}><span className="record-icon"><BookOpen size={16} /></span><span className="record-copy"><strong>{exam.title}</strong><small>{formatDateTime(exam.date)}</small></span><Badge label={exam.status} /><ArrowRight className="record-arrow" size={15} /></button>)}</div>
          )}
        </section>

        <section className="panel recent-activity-panel">
          <div className="section-heading"><div><p className="eyebrow">AUDIT TRAIL</p><h2>Recent activity</h2></div><button className="text-link" onClick={() => navigate('/admin/activities')}>View log <ArrowRight size={15} /></button></div>
          {activitiesLoading ? <p className="panel-state"><span className="spinner" /> Loading activity…</p> : activitiesError ? <p className="panel-state" role="status">{activitiesError}</p> : activities.length === 0 ? <p className="panel-state">No platform activity has been logged yet.</p> : (
            <div className="timeline-list">{activities.slice(0, 5).map((activity) => <article className="timeline-item" key={activity.id}><span className="timeline-dot" /><div><strong>{activity.description}</strong><time dateTime={activity.timestamp}>{formatDateTime(activity.timestamp)}</time></div></article>)}</div>
          )}
        </section>
      </div>
      {attemptsError && <p className="field-hint" role="status">{attemptsError}</p>}
    </DashboardLayout>
  );
}
