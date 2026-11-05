import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { activityService } from '../services/activityService';
import type { ActivityLog } from '../types/api';

export function ActivityLogs() {
  const { authUser } = useApp();
  const [records, setRecords] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    activityService.getRecentActivities().then((rows) => {
      if (active) setRecords(rows);
    }).catch((requestError: unknown) => {
      if (active) setError(requestError instanceof Error ? requestError.message : 'Activity records are unavailable.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  return (
    <DashboardLayout title={authUser?.role === 'Administrator' ? 'Activity log' : 'My activity'}>
      <div className="page-heading"><div><p className="eyebrow">AUDIT TRAIL</p><h1>{authUser?.role === 'Administrator' ? 'Platform activity' : 'Your activity'}</h1><p className="mut">{authUser?.role === 'Administrator' ? 'Recent recorded actions across the platform.' : 'Recent actions performed by your account.'}</p></div><div className="heading-count"><strong>{records.length}</strong><span>records</span></div></div>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <div className="tw">
        <table>
          <thead><tr><th>Action</th><th>Recorded</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={2} className="table-state"><span className="spinner" /> Loading activity…</td></tr>
              : records.length === 0 ? <tr><td colSpan={2} className="table-state"><div className="empty-state"><span className="empty-icon">◷</span><strong>No activity recorded</strong><span>Successful changes will appear here when available.</span></div></td></tr>
                : records.map((record) => <tr key={record.id}><td>{record.description}</td><td>{new Date(record.timestamp).toLocaleString()}</td></tr>)}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
