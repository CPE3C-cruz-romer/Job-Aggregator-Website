import React from 'react';

const members = [
  { name: 'Romer Cholo Cruz', role: 'Frontend Developer' },
  { name: 'Allan Valenzuela', role: 'Backend Developer' },
  { name: 'Hugh Ariff Aserit', role: 'Data Integration' },
  { name: 'Eisen Liam', role: 'AI Matching' }
];

export default function AboutPage() {
  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="/">Job <span>Aggregator</span></a>
          <nav className="nav"><a href="/">Home</a></nav>
        </div>
      </header>
      <section className="hero">
        <div className="hero-content">
          <div className="hero-eyebrow">BulSU Elective Project</div>
          <h1>Meet the <span>Team</span></h1>
          <div className="hero-divider" />
          <p className="subtitle">Same UI theme retained, now rendered with React components.</p>
        </div>
      </section>
      <main className="container">
        <div className="grid">
          {members.map((member) => (
            <article className="card" key={member.name}>
              <div className="card-accent" />
              <div className="card-body">
                <div className="member-info">
                  <h3>{member.name}</h3>
                  <span className="role role-blue">{member.role}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>
    </>
  );
}
