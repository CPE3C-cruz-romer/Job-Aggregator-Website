import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { parseApiError } from '../utils/error';
import { getNormalizedJobUrl, hasExternalJobUrl } from '../utils/job';

const SavedJobsPage = () => {
  const navigate = useNavigate();
  const [savedJobs, setSavedJobs] = useState([]);
  const [message, setMessage] = useState('');

  const loadSaved = async () => {
    try {
      const res = await api.get('/save-job/');
      setSavedJobs(res.data);
    } catch {
      setSavedJobs([]);
    }
  };

  useEffect(() => {
    loadSaved();
  }, []);

  const unsaveJob = async (savedId) => {
    try {
      await api.delete(`/save-job/${savedId}/`);
      setSavedJobs((prev) => prev.filter((item) => item.id !== savedId));
      setMessage('Job removed from saved list.');
    } catch (error) {
      setMessage(parseApiError(error, 'Failed to remove saved job.'));
    }
  };

  return (
    <section className="page">
      <h2>Saved Jobs</h2>
      {message && <p className="status">{message}</p>}
      <div className="grid">
        {savedJobs.map((item) => (
          <article className="card" key={item.id}>
            <h3>{item.job.title}</h3>
            <p>{item.job.company} • {item.job.location}</p>
            <div className="actions">
              {hasExternalJobUrl(getNormalizedJobUrl(item.job.url)) ? (
                <a className="btn-alt" href={getNormalizedJobUrl(item.job.url)} target="_blank" rel="noreferrer">Open Job</a>
              ) : (
                <button type="button" className="btn-alt" onClick={() => navigate(`/jobs/${item.job.id}`)}>View Details</button>
              )}
              <button className="btn danger" onClick={() => unsaveJob(item.id)}>Unsave</button>
            </div>
          </article>
        ))}
      </div>
      {savedJobs.length === 0 && <p className="muted">No saved jobs yet.</p>}
    </section>
  );
};

export default SavedJobsPage;
