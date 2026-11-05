/** QuestionForm.tsx – add or edit question modal form */

import { useState } from 'react';
import type { Question } from '../../types/exam';

interface Props {
  question?: Question;
  onSave?: (q: Question) => void;
  onAdd?: (q: Question) => void;
  onCancel: () => void;
}

export function QuestionForm({ question, onSave, onAdd, onCancel }: Props) {
  const [type, setType] = useState<'mcq' | 'sub'>(question?.type ?? 'mcq');
  const [text, setText] = useState(question?.text ?? '');
  const [options, setOptions] = useState<string[]>(
    question?.type === 'mcq'
      ? [...question.options]
      : ['', '', '', ''],
  );
  const [correctOption, setCorrectOption] = useState<number>(
    question?.type === 'mcq' ? question.correctOption ?? 0 : 0,
  );
  const [marks, setMarks] = useState<number>(question?.marks ?? 10);
  const [error, setError] = useState('');

  function setOption(idx: number, val: string) {
    setOptions((prev) => prev.map((o, i) => (i === idx ? val : o)));
  }

  function handleSave() {
    if (!text.trim()) {
      setError('Enter the question text.');
      return;
    }
    if (type === 'mcq' && options.some((o) => !o.trim())) {
      setError('Fill in all four options.');
      return;
    }
    setError('');

    const saveFn = onSave ?? onAdd;
    if (!saveFn) return;

    if (type === 'mcq') {
      saveFn({
        id: question?.id ?? 'q' + Date.now(),
        type: 'mcq',
        text: text.trim(),
        options: options.map((o) => o.trim()) as [string, string, string, string],
        correctOption,
        marks: marks || 10,
      });
    } else {
      saveFn({
        id: question?.id ?? 'q' + Date.now(),
        type: 'sub',
        text: text.trim(),
        marks: marks || 10,
      });
    }
  }

  return (
    <div className="ov" role="dialog" aria-modal="true" aria-labelledby="qf-title">
      <div className="dlg">
        <h3 id="qf-title">{question ? 'Edit question' : 'Add question'}</h3>

        <label htmlFor="qt">Type</label>
        <select
          id="qt"
          value={type}
          onChange={(e) => setType(e.target.value as 'mcq' | 'sub')}
        >
          <option value="mcq">Multiple choice</option>
          <option value="sub">Written answer</option>
        </select>

        <label htmlFor="qx">Question</label>
        <textarea
          id="qx"
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <label htmlFor="qm">Marks</label>
        <input
          id="qm"
          type="number"
          min={1}
          value={marks}
          onChange={(e) => setMarks(Math.max(1, Number(e.target.value) || 1))}
        />

        {type === 'mcq' && (
          <div>
            {options.map((opt, i) => (
              <div key={i}>
                <label htmlFor={`o${i}`}>Option {i + 1}</label>
                <input
                  id={`o${i}`}
                  value={opt}
                  onChange={(e) => setOption(i, e.target.value)}
                />
              </div>
            ))}
            <label htmlFor="qc">Correct option</label>
            <select
              id="qc"
              value={correctOption}
              onChange={(e) => setCorrectOption(Number(e.target.value))}
            >
              {options.map((_, i) => (
                <option key={i} value={i}>
                  Option {i + 1}
                </option>
              ))}
            </select>
          </div>
        )}

        {error && <p className="err" role="alert">{error}</p>}

        <div className="bar" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button className="btn sec" onClick={onCancel}>Cancel</button>
          <button className="btn" onClick={handleSave}>
            {question ? 'Save changes' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}
