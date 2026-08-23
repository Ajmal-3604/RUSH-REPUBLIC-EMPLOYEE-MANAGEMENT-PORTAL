import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { extractApiError } from '../api/services';
import { homeRouteFor } from '../constants/departments';
import './Auth.css';
import logo from '../assets/rush-republic-logo.png';

export default function Login() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login(form.email, form.password);
      // The popup is shown first; navigation to the department home page runs
      // once it has finished animating out.
      showToast('Logged in successfully', {
        onDone: () => navigate(homeRouteFor(user.department), { replace: true }),
      });
    } catch (err) {
      setError(extractApiError(err, 'Invalid email or password.'));
      setSubmitting(false);
    }
  };

  return (
    <div className="rr-auth">
      <div className="rr-auth__panel">
        <div className="rr-auth__brand">
          <img src={logo} alt="Rush Republic" className="rr-auth__logo" />
          <h1 className="rr-auth__company">Rush Republic</h1>
          <p className="rr-auth__tagline">Employee Management Portal</p>
        </div>
        <hr className="rr-auth__divider" />
        <h2 className="rr-auth__title">Log in</h2>

        {error && <div className="rr-form-error">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="rr-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="rr-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className="rr-submit" disabled={submitting}>
            {submitting ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className="rr-auth__switch">
          New here? <Link to="/signup">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
