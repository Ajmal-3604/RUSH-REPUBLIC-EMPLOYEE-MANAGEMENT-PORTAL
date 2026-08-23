import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { extractFieldErrors } from '../api/services';
import { DEPARTMENT_OPTIONS } from '../constants/departments';
import './Auth.css';
import logo from '../assets/rush-republic-logo.png';

/** Mirrors the backend policy in users/serializers.py:enforce_strong_password. */
const PASSWORD_RULES = [
  { test: (v) => v.length >= 8, label: 'At least 8 characters' },
  { test: (v) => /[A-Z]/.test(v), label: 'One uppercase letter' },
  { test: (v) => /[a-z]/.test(v), label: 'One lowercase letter' },
  { test: (v) => /\d/.test(v), label: 'One number' },
  { test: (v) => /[!@#$%^&*(),.?":{}|<>_\-[\];'\\/`~+=]/.test(v), label: 'One special character' },
];

const initialForm = {
  username: '',
  email: '',
  contact: '',
  password: '',
  confirm_password: '',
  department: '',
};

export default function Signup() {
  const { signup } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const validate = () => {
    const errors = {};

    if (!form.username.trim()) errors.username = 'Username is required.';

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = 'Enter a valid email address.';
    }

    if (!/^\+?\d{10,15}$/.test(form.contact)) {
      errors.contact = 'Enter a valid contact number (10-15 digits).';
    }

    const failedRules = PASSWORD_RULES.filter((rule) => !rule.test(form.password));
    if (failedRules.length > 0) {
      errors.password = `Password must include: ${failedRules
        .map((r) => r.label.toLowerCase())
        .join(', ')}.`;
    }

    if (form.confirm_password !== form.password) {
      errors.confirm_password = "Passwords don't match.";
    }

    if (!form.department) errors.department = 'Please select a department.';

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!validate()) return;

    setSubmitting(true);
    try {
      await signup(form);
      showToast('Account created successfully', {
        onDone: () => navigate('/login', { replace: true }),
      });
    } catch (err) {
      const flattened = extractFieldErrors(err);
      if (Object.keys(flattened).length) {
        setFieldErrors((prev) => ({ ...prev, ...flattened }));
        setFormError(flattened.non_field_errors || 'Please fix the errors below.');
      } else {
        setFormError('Something went wrong. Please try again.');
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="rr-auth">
      <div className="rr-auth__panel rr-auth__panel--landscape">
        {/* ── Left: branding ─────────────────────────────── */}
        <div className="rr-auth__brand-panel">
          <div className="rr-auth__brand">
            <img src={logo} alt="Rush Republic" className="rr-auth__logo" />
            <h1 className="rr-auth__company">Rush Republic</h1>
            <p className="rr-auth__tagline">Employee Management Portal</p>
          </div>
        </div>

        {/* ── Right: form ────────────────────────────────── */}
        <div className="rr-auth__form-panel">
          <h2 className="rr-auth__title">Create account</h2>

          {formError && <div className="rr-form-error">{formError}</div>}

          <form onSubmit={handleSubmit} noValidate className="rr-auth__form">
            <div className="rr-auth__form-grid">
              <div className="rr-field">
                <label htmlFor="username">Username</label>
                <input id="username" name="username" value={form.username} onChange={handleChange} />
                {fieldErrors.username && <div className="rr-field-error">{fieldErrors.username}</div>}
              </div>

              <div className="rr-field">
                <label htmlFor="email">Email</label>
                <input id="email" name="email" type="email" value={form.email} onChange={handleChange} />
                {fieldErrors.email && <div className="rr-field-error">{fieldErrors.email}</div>}
              </div>

              <div className="rr-field">
                <label htmlFor="contact">Contact number</label>
                <input id="contact" name="contact" value={form.contact} onChange={handleChange} />
                {fieldErrors.contact && <div className="rr-field-error">{fieldErrors.contact}</div>}
              </div>

              <div className="rr-field">
                <label htmlFor="department">Department</label>
                <select id="department" name="department" value={form.department} onChange={handleChange}>
                  <option value="">Select department</option>
                  {DEPARTMENT_OPTIONS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
                {fieldErrors.department && <div className="rr-field-error">{fieldErrors.department}</div>}
              </div>

              <div className="rr-field">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={handleChange}
                />
                {fieldErrors.password && <div className="rr-field-error">{fieldErrors.password}</div>}
              </div>

              <div className="rr-field">
                <label htmlFor="confirm_password">Confirm password</label>
                <input
                  id="confirm_password"
                  name="confirm_password"
                  type="password"
                  autoComplete="new-password"
                  value={form.confirm_password}
                  onChange={handleChange}
                />
                {fieldErrors.confirm_password && (
                  <div className="rr-field-error">{fieldErrors.confirm_password}</div>
                )}
              </div>
            </div>

            <button type="submit" className="rr-submit" disabled={submitting}>
              {submitting ? 'Creating account…' : 'Sign up'}
            </button>
          </form>

          <p className="rr-auth__switch">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
