import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

export default function Unauthorized() {
  return (
    <div className="rr-page">
      <div className="rr-page__body">
        <div className="rr-page__eyebrow">Access denied</div>
        <h1 className="rr-page__title">Your department can't open this page</h1>
        <Link to="/login" className="rr-submit" style={{ display: 'inline-block', width: 'auto', padding: '14px 28px', textDecoration: 'none' }}>
          Back to login
        </Link>
      </div>
    </div>
  );
}
