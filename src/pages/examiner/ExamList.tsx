/** ExamList.tsx – Examiner exams management */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { Badge } from '../../components/common/Badge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ExamForm } from '../../components/forms/ExamForm';
import { Toast } from '../../components/common/Toast';
import { useToast } from '../../hooks/useToast';
import { formatDateTime } from '../../utils/format';
import type { Exam, ExamDraft, ExamStatus } from '../../types/exam';

const STATUSES: ExamStatus[] = ['Draft', 'Scheduled', 'Active', 'Completed'];

export function ExamList() {
  const { exams, authUser, createExam, updateExam, deleteExam, isLoading, error } = useApp();
  const navigate = useNavigate();
  const examsPath = authUser?.role === 'Administrator' ? '/admin/exams' : '/examiner/exams';
  const { message, toast } = useToast();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('');
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingExam, setDeletingExam] = useState<Exam | null>(null);

  const filteredExams = exams.filter((e) => {
    const matchesQuery =
      e.title.toLowerCase().includes(query.toLowerCase()) ||
      e.subject.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = !filter || e.status === filter;
    return matchesQuery && matchesFilter;
  });

  async function handleSave(data: ExamDraft, status: ExamStatus) {
    try {
      if (editingExam) {
        await updateExam(editingExam.id, data);
        setEditingExam(null);
        toast('Exam updated');
      } else {
        await createExam(data, status);
        setIsCreating(false);
        toast(status === 'Draft' ? 'Exam saved as draft' : 'Exam published');
      }
    } catch {
      toast('Failed to save exam');
    }
  }

  async function handleDelete() {
    if (deletingExam) {
      try {
        await deleteExam(deletingExam.id);
        setDeletingExam(null);
        toast('Exam deleted');
      } catch {
        toast('Failed to delete exam');
      }
    }
  }

  async function handleStatusChange(exam: Exam, status: ExamStatus) {
    try {
      await updateExam(exam.id, { status });
      toast(`Exam status changed to ${status.toLowerCase()}`);
    } catch {
      toast('Failed to change exam status');
    }
  }

  return (
    <DashboardLayout title="Exams">
      {error && (
        <div className="err" role="alert" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div className="bar">
        <input
          placeholder="Search exams"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search exams"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <span className="sp" />
        <button className="btn" onClick={() => setIsCreating(true)}>
          Create Exam
        </button>
      </div>

      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Subject</th>
              <th>Date</th>
              <th>Marks</th>
              <th>Qs</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="mut">
                  Loading exams…
                </td>
              </tr>
            ) : filteredExams.length === 0 ? (
              <tr>
                <td colSpan={7} className="mut">
                  {error ? 'Unable to load exams.' : 'No exams match your search.'}
                </td>
              </tr>
            ) : (
              filteredExams.map((e) => (
                <tr key={e.id}>
                  <td>{e.title}</td>
                  <td>{e.subject}</td>
                  <td>{formatDateTime(e.date)}</td>
                  <td>{e.totalMarks}</td>
                  <td>{e.questions.length}</td>
                  <td>
                    <Badge label={e.status} />
                  </td>
                  <td>
                    <div className="row">
                      <button
                        className="btn sec sm2"
                        onClick={() => navigate(`${examsPath}/${e.id}`)}
                      >
                        View
                      </button>
                      <button
                        className="btn sec sm2"
                        onClick={() => setEditingExam(e)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn sec sm2"
                        onClick={() => setDeletingExam(e)}
                      >
                        Delete
                      </button>
                      <select aria-label={`Status for ${e.title}`} value={e.status} onChange={(event) => void handleStatusChange(e, event.target.value as ExamStatus)}>
                        {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Form */}
      {(isCreating || editingExam) && (
        <ExamForm
          exam={editingExam ?? undefined}
          onSave={handleSave}
          onCancel={() => {
            setIsCreating(false);
            setEditingExam(null);
          }}
        />
      )}

      {/* Delete Confirmation */}
      {deletingExam && (
        <ConfirmDialog
          title="Delete Exam"
          message={`Delete “${deletingExam.title}”? This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeletingExam(null)}
        />
      )}

      <Toast message={message} />
    </DashboardLayout>
  );
}
