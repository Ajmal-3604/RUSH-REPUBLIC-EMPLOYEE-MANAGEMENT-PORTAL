import React, { useEffect, useState } from 'react';
import './Toast.css';

const ICONS = {
  success: 'M4 10.5L8 14.5L16 5.5',
  error: 'M6 6L14 14M14 6L6 14',
};

/**
 * Black-and-white toast popup used for every success confirmation and error
 * in the portal. Calls `onDone` once it has animated out, which lets callers
 * chain a navigation onto the end of the popup.
 */
export default function Toast({ message, show, variant = 'success', duration = 2600, onDone }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!show) return undefined;

    setLeaving(false);
    const leaveTimer = setTimeout(() => setLeaving(true), duration - 300);
    const doneTimer = setTimeout(() => {
      if (onDone) onDone();
    }, duration);

    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(doneTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, message, duration]);

  if (!show) return null;

  return (
    <div className="rr-toast-layer" role="status" aria-live="polite">
      <div
        className={[
          'rr-toast',
          `rr-toast--${variant}`,
          leaving ? 'rr-toast--leaving' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <span className="rr-toast__icon" aria-hidden="true">
          <svg viewBox="0 0 20 20" width="16" height="16">
            <path
              d={ICONS[variant] || ICONS.success}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="rr-toast__message">{message}</span>
      </div>
    </div>
  );
}
