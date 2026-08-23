import React from 'react';
import '../pages/Directory.css';
import './PageHeader.css';

/** Title row + content wrapper used by pages that sit inside AppShell. */
export default function PageHeader({ eyebrow, title, actions, children }) {
  return (
    <div className="rr-content">
      <div className="rr-page-header-row">
        <div>
          {eyebrow && <div className="rr-page-eyebrow">{eyebrow}</div>}
          <div className="rr-page-title">{title}</div>
        </div>
        {actions && <div className="rr-page-actions">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
