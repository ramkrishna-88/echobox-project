import { useEffect, useRef } from 'react';
import './ConfirmDialog.css';

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  variant = 'primary',
  confirmDisabled = false,
  children,
  onConfirm,
  onCancel,
}) {
  const cancelButtonRef = useRef(null);

  useEffect(() => {
    cancelButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onCancel();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="confirm-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
      >
        <div className={`confirm-dialog-icon confirm-dialog-icon-${variant}`} aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
            <path d="M10.3 3.9 2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
          </svg>
        </div>

        <h2 id="confirm-dialog-title">{title}</h2>
        <p id="confirm-dialog-message">{message}</p>
        {children}

        <div className="confirm-dialog-actions">
          <button ref={cancelButtonRef} className="confirm-cancel" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className={`confirm-action confirm-action-${variant}`} type="button" onClick={onConfirm} disabled={confirmDisabled}>
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
