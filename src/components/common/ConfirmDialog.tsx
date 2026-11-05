/** ConfirmDialog.tsx – modal confirm/cancel dialog */

import type { ReactNode } from 'react';

interface Props {
  title?: string;
  message: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title = 'Please confirm',
  message,
  confirmLabel = 'Confirm',
  danger,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div className="ov" role="dialog" aria-modal="true" aria-labelledby="cdlg-title">
      <div className="dlg">
        <h3 id="cdlg-title">{title}</h3>
        <p>{message}</p>
        <div className="bar" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button type="button" className="btn sec" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={`btn${danger ? ' dng' : ''}`}
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
