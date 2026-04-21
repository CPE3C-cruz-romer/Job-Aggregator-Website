import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { parseApiError } from '../utils/error';

const EMPTY_FORM = {
  title: '',
  company: '',
  location: '',
  description: '',
  url: '',
};

const EmployerHomePage = () => {
  const [jobs, setJobs] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const loadEmployerProfile = async () => {
    try {
      const { data } = await api.get('/employer/profile/');
      const profile = Array.isArray(data) ? data[0] : null;
      if (profile?.company_name) {
        setForm((prev) => ({ ...prev, company: profile.company_name }));
      }
    } catch {
      // Keep a blank company field if profile is unavailable.
    }
  };

  const loadEmployerJobs = async () => {
    try {
      const { data } = await api.get('/employer/jobs/');
      setJobs(data);
    } catch (error) {
      setMessage(parseApiError(error, 'Failed to load employer jobs.'));
      setJobs([]);
    }
  };

  useEffect(() => {
    loadEmployerProfile();
    loadEmployerJobs();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setSuccess(false);
    try {
      await api.post('/employer/jobs/', form);
      setMessage('Job posted successfully. Your job is now live.');
      setSuccess(true);
      setForm((prev) => ({ ...EMPTY_FORM, company: prev.company }));
      await loadEmployerJobs();
    } catch (error) {
      setMessage(parseApiError(error, 'Failed to post employer job.'));
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const removeJob = async (jobId) => {
    try {
      await api.delete(`/employer/jobs/${jobId}/`);
      setJobs((prev) => prev.filter((job) => job.id !== jobId));
      setMessage('Job removed successfully.');
    } catch (error) {
      setMessage(parseApiError(error, 'Failed to remove employer job.'));
    }
  };

  return (
    <section className="page">
      <div className="hero compact">
        <h1>Employer Workspace</h1>
        <p>Publish jobs, update descriptions, and manage direct openings in a dedicated employer area.</p>
      </div>

      <form className="card" onSubmit={submit}>
        <h3>Publish a New Job</h3>
        <p className="muted">Required: title, company, location, and description. Optional: application URL.</p>
        <div className="grid">
          <input value={form.title} placeholder="Job title" onChange={(e) => updateField('title', e.target.value)} required />
          <input value={form.company} placeholder="Company name" onChange={(e) => updateField('company', e.target.value)} required />
          <input value={form.location} placeholder="Location" onChange={(e) => updateField('location', e.target.value)} required />
          <input value={form.url} placeholder="Optional application URL (https://...)" onChange={(e) => updateField('url', e.target.value)} />
        </div>
        <textarea value={form.description} placeholder="Job description" onChange={(e) => updateField('description', e.target.value)} required />
        <button className="btn" type="submit" disabled={loading}>{loading ? 'Publishing...' : 'Publish Job'}</button>
        {message && <p className={success ? 'status' : 'error'}>{message}</p>}
      </form>

      <section className="card">
        <h3>Your Posted Jobs</h3>
        {jobs.length === 0 ? <p className="muted">No jobs posted yet.</p> : (
          <div className="grid">
            {jobs.map((job) => (
              <article className="card" key={job.id}>
                <h4>{job.title}</h4>
                <p className="muted">{job.company} • {job.location}</p>
                <p className="desc">{job.description?.slice(0, 180)}...</p>
                {job.requirements && <p className="muted"><strong>Requirements:</strong> {job.requirements.slice(0, 120)}...</p>}
                <div className="actions">
                  <button type="button" className="btn danger" onClick={() => removeJob(job.id)}>Remove</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
};

export default EmployerHomePage;
