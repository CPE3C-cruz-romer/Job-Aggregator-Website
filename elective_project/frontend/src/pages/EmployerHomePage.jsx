import React from 'react';

export default function EmployerHomePage() {
  return (
    <div className="shell">
      <nav className="top-actions">
        <a className="top-link" href="/about">Meet the Team</a>
        <a className="top-link" href="/">Go to User Home</a>
      </nav>
      <section className="card">
        <div className="hero">
          <h1>Employer <span>Homepage</span></h1>
          <p>This page uses employer database tables so companies can register, log in, and publish job listings.</p>
          <div className="actions">
            <a className="btn btn-primary" href="/employers/login">Employer Login</a>
            <a className="btn btn-outline" href="/employers/register">Employer Sign Up</a>
          </div>
        </div>
      </section>
    </div>
  );
}
