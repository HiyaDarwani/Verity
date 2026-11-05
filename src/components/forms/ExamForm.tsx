/** ExamForm.tsx – create / edit exam modal form */

import { useState } from 'react';
import type { Exam, ExamDraft, ExamStatus } from '../../types/exam';

interface Props {
  exam?: Exam;
  onSave: (data: ExamDraft, status: ExamStatus) => void;
  onCancel: () => void;
}

function toLocalDateTimeValue(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function defaultExamDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return toLocalDateTimeValue(d.toISOString());
}

export function ExamForm({ exam, onSave, onCancel }: Props) {
  const [title, setTitle] = useState(exam?.title ?? '');
  const [subject, setSubject] = useState(exam?.subject ?? '');
  const [date, setDate] = useState(exam?.date ? toLocalDateTimeValue(exam.date) : defaultExamDate());
  const [availableUntil, setAvailableUntil] = useState(exam?.availableUntil ? toLocalDateTimeValue(exam.availableUntil) : '');
  const [status, setStatus] = useState<ExamStatus>(exam?.status ?? 'Draft');
  const [duration, setDuration] = useState(String(exam?.durationMinutes ?? 30));
  const [error, setError] = useState('');

  function handleSave(status: ExamStatus) {
    if (!title.trim() || !subject.trim() || !date) {
      setError('Title, subject and date are required.');
      return;
    }
    if (availableUntil && new Date(availableUntil) <= new Date(date)) {
      setError('Availability end must be after the start date and time.');
      return;
    }
    setError('');
    onSave(
      {
        title: title.trim(),
        subject: subject.trim(),
        date: new Date(date).toISOString(),
        availableUntil: availableUntil ? new Date(availableUntil).toISOString() : null,
        durationMinutes: Math.max(5, Number(duration) || 30),
        status,
      },
      status,
    );
  }

  return (
    <div className="ov" role="dialog" aria-modal="true" aria-labelledby="ef-title">
      <div className="dlg">
        <h3 id="ef-title">{exam ? 'Edit exam' : 'Create exam'}</h3>

        <label htmlFor="xt">Title</label>
        <input id="xt" value={title} onChange={(e) => setTitle(e.target.value)} />

        <label htmlFor="xs">Subject</label>
        <input id="xs" value={subject} onChange={(e) => setSubject(e.target.value)} />

        <label htmlFor="xd">Date and time</label>
        <input
          id="xd"
          type="datetime-local"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <label htmlFor="xe">Availability ends (optional)</label>
        <input id="xe" type="datetime-local" value={availableUntil} onChange={(e) => setAvailableUntil(e.target.value)} />
        <p className="field-hint">Scheduled examinations become available at their start time and close at this time if set.</p>

        {exam && (
          <>
            <label htmlFor="xstatus">Exam status</label>
            <select id="xstatus" value={status} onChange={(event) => setStatus(event.target.value as ExamStatus)}>
              {(['Draft', 'Scheduled', 'Active', 'Completed'] as ExamStatus[]).map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </>
        )}

        <label htmlFor="xu">Duration (min)</label>
        <input id="xu" type="number" min={5} value={duration} onChange={(e) => setDuration(e.target.value)} />
        <p className="field-hint">Total marks are calculated from the marks assigned to each question.</p>

        {error && <p className="err" role="alert">{error}</p>}

        <div className="bar" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button className="btn sec" onClick={onCancel}>Cancel</button>
          {exam ? <button className="btn" onClick={() => handleSave(status)}>Save changes</button> : <>
            <button className="btn sec" onClick={() => handleSave('Draft')}>Save draft</button>
            <button className="btn" onClick={() => handleSave('Scheduled')}>Schedule examination</button>
          </>}
        </div>
      </div>
    </div>
  );
}
