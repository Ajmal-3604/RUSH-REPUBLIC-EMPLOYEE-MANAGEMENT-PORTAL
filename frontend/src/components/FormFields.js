import React from 'react';

/**
 * Labelled form controls shared by every create/edit form in the portal.
 * All of them take the same shape: name, label, value, onChange, error.
 */

export function Field({ name, label, type = 'text', value, onChange, error, hint, wide, ...rest }) {
  return (
    <div className={`rr-input-group${wide ? ' rr-input-group--wide' : ''}`}>
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        value={value ?? ''}
        onChange={onChange}
        {...rest}
      />
      {error && <div className="rr-input-error">{error}</div>}
      {!error && hint && <div className="rr-input-hint">{hint}</div>}
    </div>
  );
}

export function SelectField({
  name,
  label,
  value,
  onChange,
  options,
  error,
  hint,
  placeholder,
  wide,
  ...rest
}) {
  return (
    <div className={`rr-input-group${wide ? ' rr-input-group--wide' : ''}`}>
      <label htmlFor={name}>{label}</label>
      <select id={name} name={name} value={value ?? ''} onChange={onChange} {...rest}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <div className="rr-input-error">{error}</div>}
      {!error && hint && <div className="rr-input-hint">{hint}</div>}
    </div>
  );
}

export function TextAreaField({ name, label, value, onChange, error, hint, rows = 4, ...rest }) {
  return (
    <div className="rr-input-group rr-input-group--wide">
      <label htmlFor={name}>{label}</label>
      <textarea
        id={name}
        name={name}
        value={value ?? ''}
        onChange={onChange}
        rows={rows}
        {...rest}
      />
      {error && <div className="rr-input-error">{error}</div>}
      {!error && hint && <div className="rr-input-hint">{hint}</div>}
    </div>
  );
}
