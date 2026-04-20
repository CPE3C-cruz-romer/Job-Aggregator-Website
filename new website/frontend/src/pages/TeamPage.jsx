import React from 'react';

const members = [
  { name: 'Romer Cholo Cruz', role: 'Project Lead', image: '/team/romer-cholo-cruz.jpeg' },
  { name: 'Eisen Liam Palsat', role: 'AI Researcher', image: '/team/eisen-liam-palsat.jpeg' },
  { name: 'Allan Allan Paul Valenzuela', role: 'Frontend Specialist', image: '/team/allan-allan-paul-valenzuela.jpeg' },
  { name: 'Hugh Ariff Aserit', role: 'Backend Developer', image: '/team/hugh-ariff-aserit.jpeg' },
];

const TeamPage = () => (
  <section className="page">
    <div className="hero compact">
      <h1>Built for the Future</h1>
      <p>Meet the team behind the Job Aggregator platform.</p>
    </div>

    <div className="grid team-grid">
      {members.map((member) => (
        <article className="card team-card" key={member.name}>
          <img
            src={member.image}
            alt={member.name}
            className="team-photo"
            onError={(e) => { e.currentTarget.src = '/team/default-avatar.svg'; }}
          />
          <h3>{member.name}</h3>
          <p className="muted">{member.role}</p>
        </article>
      ))}
    </div>
  </section>
);

export default TeamPage;
