import React, { useMemo, useRef, useState } from 'react';
import './SearchPicker.css';

function initials(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

/**
 * Click-to-open searchable dropdown used for Brand / Model / Location /
 * Freelancer / Prop pickers throughout the wizard. `options` is
 * [{ id, name }]; `value` is the selected id (or '').
 */
export default function SearchPicker({ label, required, value, options, onSelect, placeholder = 'Search…', error }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const boxRef = useRef(null);

  const selected = options.find((o) => String(o.id) === String(value));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.name.toLowerCase().includes(q));
  }, [options, query]);

  React.useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  return (
    <div className="rr-searchpicker" ref={boxRef}>
      {label && (
        <label>
          {label} {required && <span className="rr-wiz-required">*</span>}
        </label>
      )}
      <div
        className={`rr-searchpicker__field${error ? ' rr-searchpicker__field--error' : ''}`}
        onClick={() => setOpen((o) => !o)}
        role="button"
        tabIndex={0}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label || placeholder}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((o) => !o);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
      >
        <span className="rr-searchpicker__value">
          {selected && (
            <span className="rr-searchpicker__avatar">{initials(selected.name)}</span>
          )}
          {selected ? selected.name : <span className="rr-searchpicker__placeholder">{placeholder}</span>}
        </span>
        <span className="rr-searchpicker__caret">⌄</span>
      </div>
      {open && (
        <div className="rr-searchpicker__menu" role="listbox">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            onClick={(e) => e.stopPropagation()}
          />
          {selected && (
            <div
              className="rr-searchpicker__option rr-searchpicker__option--clear"
              role="option"
              aria-selected="false"
              tabIndex={0}
              onClick={() => {
                onSelect('');
                setOpen(false);
                setQuery('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect('');
                  setOpen(false);
                  setQuery('');
                }
              }}
            >
              Clear selection
            </div>
          )}
          {filtered.map((o) => (
            <div
              key={o.id}
              className="rr-searchpicker__option"
              role="option"
              aria-selected={String(o.id) === String(value)}
              tabIndex={0}
              onClick={() => {
                onSelect(o.id);
                setOpen(false);
                setQuery('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(o.id);
                  setOpen(false);
                  setQuery('');
                }
              }}
            >
              <span className="rr-searchpicker__avatar">{initials(o.name)}</span>
              {o.name}
            </div>
          ))}
          {filtered.length === 0 && <div className="rr-searchpicker__empty">No matches</div>}
        </div>
      )}
      {error && <div className="rr-drawer__error">{error}</div>}
    </div>
  );
}
