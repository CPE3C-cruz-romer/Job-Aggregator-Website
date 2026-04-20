import React from 'react';

export default function HomePage() {
  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="/">Job <span>Aggregator</span></a>
          <nav className="nav">
            <a href="/about">Meet the Team</a>
            <a href="/login">Login</a>
            <a href="/register">Register</a>
            <a href="/employers">Employers</a>
          </nav>
        </div>
      </header>
      <section className="hero">
        <div className="hero-content">
          <h1>Job <span>Aggregator</span></h1>
          <div className="hero-divider" />
          <p className="hero-sub">Frontend migrated to React without changing backend endpoints.</p>
          <div className="hero-actions">
            <a className="btn btn-primary" href="/login">Get Started</a>
            <a className="btn btn-outline" href="/about">About</a>
          </div>
        </div>
      </section>
    </>
  );
}
