import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';
import { parseApiError } from '../utils/error';
import { getNormalizedJobUrl, hasExternalJobUrl } from '../utils/job';

const JobDetailsPage = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const externalUrl = getNormalizedJobUrl(job?.url);
  const hasExternalUrl = hasExternalJobUrl(externalUrl);

  useEffect(() => {
    const loadJob = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get(`/jobs/${jobId}/`);
        setJob(data);
      } catch (err) {
        setError(parseApiError(err, 'Unable to load job details.'));
      } finally {
        setLoading(false);
      }
    };
    loadJob();
  }, [jobId]);

  const saveJob = async () => {
    try {
      await api.post('/save-job/', { job_id: job.id });
      setMessage('Job saved successfully.');
    } catch (err) {
      setMessage(parseApiError(err, 'Unable to save this job.'));
    }
  };

  const applyJob = async () => {
    try {
      await api.post('/apply/', { job_id: job.id, status: 'applied' });
      setMessage('Application submitted and tracked.');

      if (hasExternalUrl) {
        window.open(externalUrl, '_blank', 'noopener,noreferrer');
        return;
      }

      // Internal/direct jobs stay in-app and show full details.
      setMessage('Application submitted and tracked. Review the full details on this page.');
    } catch (err) {
      setMessage(parseApiError(err, 'Unable to submit application.'));
    }
  };

  if (loading) return <section className="page"><p>Loading job details...</p></section>;
  if (error) return <section className="page"><p className="error">{error}</p></section>;
  if (!job) return <section className="page"><p className="error">Job not found.</p></section>;

  return (
    <section className="page">
      <article className="card">
        <h2>{job.title}</h2>
        <p className="muted">{job.company} • {job.location}</p>
        {job.source === 'employer' && <p className="badge">Direct Employer Post</p>}
        <p>{job.description}</p>
        {job.requirements && (
          <div className="card">
            <h4>Requirements</h4>
            <p>{job.requirements}</p>
          </div>
        )}
        {(job.contact_name || job.contact_email || job.contact_phone) && (
          <div className="card">
            <h4>Employer Contact</h4>
            {job.contact_name && <p><strong>Name:</strong> {job.contact_name}</p>}
            {job.contact_email && <p><strong>Email:</strong> {job.contact_email}</p>}
            {job.contact_phone && <p><strong>Phone:</strong> {job.contact_phone}</p>}
          </div>
        )}

        <div className="actions">
          <button className="btn" onClick={saveJob}>Save</button>
          <button className="btn" onClick={applyJob}>Apply</button>
          {hasExternalUrl && <a className="btn-alt" href={externalUrl} target="_blank" rel="noreferrer">Open Original</a>}
          <button className="btn-alt" onClick={() => navigate('/jobs')}>Back to Jobs</button>
        </div>
        {message && <p className="status">{message}</p>}
        <p className="muted">Need recruiter help? Visit <Link to="/team">Meet the Team</Link>.</p>
      </article>
    </section>
  );
};

export default JobDetailsPage;
