import React, { useState } from 'react';
import './RepeatingCard.css';

/**
 * Collapsible card used for every repeatable row in the wizard (a model
 * booking, a location, a reel, a photo brief, a prop). Header has the
 * caret, title, a completeness check, and reorder/duplicate/remove controls;
 * body is whatever fields the step passes as children.
 */
export default function RepeatingCard({
  index,
  title,
  complete,
  summary,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  onDuplicate,
  onRemove,
  headerExtra,
  children,
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rr-repcard">
      <div className="rr-repcard__head">
        <button type="button" className="rr-repcard__caret" onClick={() => setExpanded((e) => !e)}>
          {expanded ? '▾' : '▸'}
        </button>
        <span className="rr-repcard__title">{title}</span>
        {complete && (
          <span className="rr-repcard__check" title="Complete">
            ✓
          </span>
        )}
        {headerExtra}
        <button type="button" onClick={onMoveUp} disabled={isFirst} className="rr-repcard__iconbtn">
          ↑
        </button>
        <button type="button" onClick={onMoveDown} disabled={isLast} className="rr-repcard__iconbtn">
          ↓
        </button>
        {onDuplicate && (
          <button type="button" onClick={onDuplicate} className="rr-repcard__iconbtn">
            ⧉
          </button>
        )}
        <button type="button" onClick={onRemove} className="rr-repcard__iconbtn rr-repcard__iconbtn--danger">
          ✕
        </button>
      </div>
      {expanded ? <div className="rr-repcard__body">{children}</div> : summary && <div className="rr-repcard__summary">{summary}</div>}
    </div>
  );
}
