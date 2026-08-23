import React from 'react';
import './Drawer.css';

/** Right-side slide-in panel used for every add/edit form across the app. */
export default function Drawer({ open, title, onClose, children, footer }) {
  if (!open) return null;
  return (
    <div className="rr-drawer-overlay" onClick={onClose}>
      <div className="rr-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="rr-drawer__title">{title}</div>
        {children}
        {footer && <div className="rr-drawer__foot">{footer}</div>}
      </div>
    </div>
  );
}
