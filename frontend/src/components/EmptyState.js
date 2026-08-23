import React from 'react';

/** Shown in place of a table when a scope has no rows yet. */
export default function EmptyState({ title, text, action }) {
  return (
    <div className="rr-empty">
      <h4 className="rr-empty__title">{title}</h4>
      {text && <p className="rr-empty__text">{text}</p>}
      {action}
    </div>
  );
}

export function LoadingState({ label = 'Loading' }) {
  return <div className="rr-loading">{label}…</div>;
}

export function ErrorAlert({ message }) {
  if (!message) return null;
  return (
    <div className="rr-alert" role="alert">
      {message}
    </div>
  );
}
