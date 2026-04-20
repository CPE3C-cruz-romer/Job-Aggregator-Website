import React from 'react';
import { Link } from 'react-router-dom';

const EmployerPortalPage = () => (
  <section className="page">
    <div className="hero compact">
      <h1>Employer Portal</h1>
      <p>Register your company, login, and manage publishing in the dedicated employer workspace.</p>
      <div className="actions center portal-actions">
        <Link className="btn portal-btn" to="/employer/register">Register Employer</Link>
        <Link className="btn-alt portal-btn" to="/employer/login">Employer Login</Link>
      </div>
    </div>
  </section>
);

export default EmployerPortalPage;
