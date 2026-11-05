/** ExamDetail.tsx – Exam details and question management */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { Badge } from '../../components/common/Badge';
import { QuestionForm } from '../../components/forms/QuestionForm';
import { Toast } from '../../components/common/Toast';
import { useToast } from '../../hooks/useToast';
import { formatDateTime } from '../../utils/format';
import type { Question } from '../../types/exam';

export function ExamDetail() {
  const { id } = useParams<{ id: string }>();
  const { exams, authUser, addQuestion, updateQuestion, removeQuestion, error } = useApp();
  const navigate = useNavigate();
  const examsPath = authUser?.role === 'Administrator' ? '/admin/exams' : '/examiner/exams';
  const { message, toast } = useToast();

  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<{
    index: number;
    question: Question;
  } | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const exam = exams.find((e) => e.id === id);

  if (!exam) {
    return (
      <DashboardLayout title="Exam details">
        <p className="mut">Exam not found.</p>
        <button className="btn sec" onClick={() => navigate(examsPath)}>
          ← All exams
        </button>
      </DashboardLayout>
    );
  }

  async function handleAddQuestion(q: Question) {
    if (!id) return;
    try {
      await addQuestion(id, q);
      setIsAddingQuestion(false);
      toast('Question added');
    } catch {
      toast('Failed to add question');
    }
  }

  async function handleSaveEditedQuestion(q: Question) {
    if (!id || editingQuestion === null) return;
    try {
      await updateQuestion(id, editingQuestion.index, q);
      setEditingQuestion(null);
      toast('Question updated');
    } catch {
      toast('Failed to update question');
    }
  }

  async function handleRemoveQuestion(idx: number) {
    if (!id) return;
    try {
      await removeQuestion(id, idx);
      toast('Question removed');
    } catch {
      toast('Failed to remove question');
    }
  }

  return (
    <DashboardLayout title="Exam details">
      {error && (
        <div className="err" role="alert" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div className="bar">
        <button
          className="btn sec sm2"
          onClick={() => navigate(examsPath)}
        >
          ← All exams
        </button>
      </div>

      <h1>
        {exam.title} <Badge label={exam.status} />
      </h1>
      <p className="mut">
        {exam.subject} · {formatDateTime(exam.date)} · {exam.durationMinutes} min · {exam.totalMarks} marks
      </p>

      <div className="bar" style={{ marginTop: '1.25rem' }}>
        <h2 className="sp" style={{ margin: 0 }}>
          Questions ({exam.questions.length})
        </h2>
        <button className="btn sec" onClick={() => setIsAddingQuestion(true)}>
          Add question
        </button>
        <button
          className="btn sec"
          onClick={() => setIsPreviewOpen(true)}
          disabled={exam.questions.length === 0}
        >
          Preview
        </button>
      </div>

      {exam.questions.length === 0 ? (
        <p className="mut" style={{ padding: '1.5rem 0' }}>
          No questions yet. Add your first question.
        </p>
      ) : (
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>#</th>
                <th style={{ width: '90px' }}>Type</th>
                <th style={{ width: '70px' }}>Marks</th>
                <th>Question</th>
                <th style={{ width: '130px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {exam.questions.map((q, k) => (
                <tr key={q.id ?? k}>
                  <td>{k + 1}</td>
                  <td>{q.type === 'mcq' ? 'MCQ' : 'Written'}</td>
                  <td>{q.marks ?? 10}</td>
                  <td style={{ whiteSpace: 'normal' }}>
                    <div>{q.text}</div>
                    {q.type === 'mcq' && (
                      <div className="sm mut" style={{ marginTop: '0.2rem' }}>
                        Correct: {q.options[q.correctOption ?? 0]}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="row">
                      <button
                        className="btn sec sm2"
                        onClick={() => setEditingQuestion({ index: k, question: q })}
                        aria-label={`Edit question ${k + 1}`}
                      >
                        Edit
                      </button>
                      <button
                        className="btn sec sm2"
                        onClick={() => handleRemoveQuestion(k)}
                        aria-label={`Remove question ${k + 1}`}
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Question Modal */}
      {isAddingQuestion && (
        <QuestionForm
          onSave={handleAddQuestion}
          onCancel={() => setIsAddingQuestion(false)}
        />
      )}

      {/* Edit Question Modal */}
      {editingQuestion && (
        <QuestionForm
          question={editingQuestion.question}
          onSave={handleSaveEditedQuestion}
          onCancel={() => setEditingQuestion(null)}
        />
      )}

      {/* Preview Modal */}
      {isPreviewOpen && (
        <div
          className="ov"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pv-title"
        >
          <div className="dlg">
            <h3 id="pv-title">Preview: {exam.title}</h3>
            {exam.questions.length === 0 ? (
              <p className="mut">No questions to preview.</p>
            ) : (
              exam.questions.map((q, k) => (
                <div key={k} style={{ marginBottom: '1rem' }}>
                  <p>
                    <b>
                      {k + 1}. {q.text} ({q.marks ?? 10} marks)
                    </b>
                  </p>
                  {q.type === 'mcq' ? (
                    q.options.map((opt, i) => (
                      <p
                        key={i}
                        className={`sm ${i === q.correctOption ? '' : 'mut'}`}
                        style={{ margin: '0.2rem 0 0.2rem 1rem' }}
                      >
                        {i === q.correctOption ? '✓ ' : '○ '}
                        {opt}
                      </p>
                    ))
                  ) : (
                    <p
                      className="sm mut"
                      style={{ margin: '0.2rem 0 0.2rem 1rem' }}
                    >
                      (written answer)
                    </p>
                  )}
                </div>
              ))
            )}
            <div className="bar" style={{ justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button className="btn sec" onClick={() => setIsPreviewOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast message={message} />
    </DashboardLayout>
  );
}
