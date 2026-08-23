import React, { useEffect } from 'react';
import './Modal.css';

/**
 * Centred modal used for every create/edit form and confirmation in the portal.
 * Closes on Escape and on backdrop click.
 */
export default function Modal({ open, title, subtitle, onClose, children, footer, width = 640 }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="rr-modal-backdrop" onMouseDown={onClose}>
      <div
        className="rr-modal"
        style={{ maxWidth: width }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="rr-modal__head">
          <div>
            <h3 className="rr-modal__title">{title}</h3>
            {subtitle && <p className="rr-modal__subtitle">{subtitle}</p>}
          </div>
          <button type="button" className="rr-modal__close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 20 20" width="16" height="16">
              <path
                d="M5 5L15 15M15 5L5 15"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="rr-modal__body">{children}</div>

        {footer && <div className="rr-modal__footer">{footer}</div>}
      </div>
    </div>
  );
}

/** Destructive-action confirmation, styled to match the modal system. */
export function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', onConfirm, onClose, busy }) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      width={440}
      footer={
        <>
          <button type="button" className="rr-btn rr-btn--ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="rr-btn" onClick={onConfirm} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      <p className="rr-modal__message">{message}</p>
    </Modal>
  );
}
