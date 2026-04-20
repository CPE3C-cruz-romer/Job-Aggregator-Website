import React, { useEffect, useState } from 'react';
import { API_HEADERS, getJson } from '../components/api';

export default function DashboardPage() {
  const [jobs, setJobs] = useState([]);
  const [query, setQuery] = useState('');

  async function loadJobs() {
    const data = await getJson('/api/jobs/', { headers: API_HEADERS });
    const filtered = (Array.isArray(data) ? data : []).filter((job) => {
      const hay = `${job.title} ${job.company} ${job.location} ${job.skills_required}`.toLowerCase();
      return hay.includes(query.toLowerCase());
    });
    setJobs(filtered);
  }

  useEffect(() => {
    loadJobs().catch(() => setJobs([]));
  }, []);

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="/dashboard">Dashboard</a>
          <nav className="nav">
            <a href="/about">Meet the Team</a>
            <a href="/logout">Logout</a>
          </nav>
        </div>
      </header>
      <main className="container">
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Search Jobs</h2>
          <input className="field" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search jobs..." />
          <button className="btn btn-primary" onClick={loadJobs}>Search</button>
          <div id="jobs" className="small">
            {jobs.map((job) => (
              <div className="job" key={job.id}>
                <div className="job-title">{job.title}</div>
                <div>{job.company}</div>
                <div>{job.location}</div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
