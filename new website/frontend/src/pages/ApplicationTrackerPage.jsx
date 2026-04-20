import React, { useEffect, useState } from 'react';
import api from '../api/client';

const ApplicationTrackerPage = () => {
  const [applications, setApplications] = useState([]);

  const load = async () => {
    const { data } = await api.get('/apply/');
    setApplications(data);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id, status) => {
    await api.patch(`/apply/${id}/`, { status });
    load();
  };

  return (
    <section className="page">
      <h2>Application Tracker</h2>
      {applications.map((app) => (
        <article className="card" key={app.id}>
          <h3>{app.job.title}</h3>
          <p>{app.job.company}</p>
          <select value={app.status} onChange={(e) => updateStatus(app.id, e.target.value)}>
            <option value="applied">Applied</option>
            <option value="interviewing">Interviewing</option>
            <option value="offered">Offered</option>
            <option value="rejected">Rejected</option>
          </select>
        </article>
      ))}
    </section>
  );
};

export default ApplicationTrackerPage;
