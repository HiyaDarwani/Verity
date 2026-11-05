/** Confirmation screen after the attempt API accepts a submission. */
import { useNavigate } from 'react-router-dom';
import { Check, ClipboardCheck } from 'lucide-react';
import { DashboardLayout } from '../../layouts/DashboardLayout';

export function ExamSubmitted() {
  const navigate = useNavigate();

  return (
    <DashboardLayout title="Submitted">
      <section className="exam-submitted-card">
        <span className="submitted-mark"><Check size={30} strokeWidth={2.2} /></span>
        <p className="eyebrow">SUBMISSION RECEIVED</p>
        <h1>Exam submitted successfully</h1>
        <p>Your answers were accepted by the examination service. Results will appear here when they are published. Written answers may need examiner evaluation first.</p>
        <div className="submitted-actions">
          <button className="btn" onClick={() => navigate('/student/dashboard')}><ClipboardCheck size={16} /> Back to dashboard</button>
          <button className="btn sec" onClick={() => navigate('/student/results')}>View published results</button>
        </div>
      </section>
    </DashboardLayout>
  );
}
