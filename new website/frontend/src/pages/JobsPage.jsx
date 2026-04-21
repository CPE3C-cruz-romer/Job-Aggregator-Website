import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import JobCard from '../components/JobCard';
import FilterBar from '../components/FilterBar';
import { parseApiError } from '../utils/error';
import { getNormalizedJobUrl, hasExternalJobUrl } from '../utils/job';

const JobsPage = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [filters, setFilters] = useState({ title: '', location: '', company: '' });

  const loadJobs = async (searchQuery = '') => {
    setLoading(true);
    try {
      const { data } = await api.get(`/jobs/${searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ''}`);
      console.log('Jobs loaded:', data);
      setJobs(data);
    } catch (error) {
      console.error('Job list fetch failed:', error);
      setMessage(parseApiError(error, 'Failed to fetch jobs. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadJobs(); }, []);

  useEffect(() => {
    const onResumeRefresh = (event) => {
      const matchedSkills = event?.detail?.matchedSkills || [];
      const query = matchedSkills.slice(0, 4).join(' ');
      loadJobs(query);
      if (matchedSkills.length > 0) {
        setMessage(`Jobs refreshed using resume skills: ${matchedSkills.slice(0, 6).join(', ')}`);
      }
    };

    window.addEventListener('jobs:refresh-requested', onResumeRefresh);
    return () => window.removeEventListener('jobs:refresh-requested', onResumeRefresh);
  }, []);

  const saveJob = async (jobId) => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setMessage('Please login first to save jobs.');
      navigate('/login');
      return;
    }

    try {
      await api.post('/save-job/', { job_id: jobId });
      setMessage('Saved job successfully');
    } catch (error) {
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        setMessage('Your session expired. Please login again.');
        navigate('/login');
        return;
      }
      setMessage(parseApiError(error, 'Failed to save job.'));
    }
  };

  const runFilter = async () => {
    const query = [filters.title, filters.location, filters.company].filter(Boolean).join(' ');
    await loadJobs(query);
  };

  const applyJob = async (job) => {
    try {
      await api.post('/apply/', { job_id: job.id, status: 'applied' });
      const externalUrl = getNormalizedJobUrl(job.url);
      if (hasExternalJobUrl(externalUrl)) {
        window.open(externalUrl, '_blank', 'noopener,noreferrer');
        setMessage('Application tracked. Opening external application page in a new tab.');
      } else {
        setMessage('Application tracked. Showing full job details.');
        navigate(`/jobs/${job.id}`);
      }
    } catch (error) {
      setMessage(parseApiError(error, 'Unable to apply for this job.'));
    }
  };

  const refreshFromApi = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/jobs/refresh/', {
        query: filters.title || 'software engineer',
        location: filters.location || 'united states',
        results_per_page: 50,
        pages: 3,
      });
      console.log('Refresh API response:', data);
      await runFilter();
      setMessage(`Jobs refreshed from Adzuna (created: ${data.created}, updated: ${data.updated}).`);
    } catch (error) {
      console.error('Refresh from API failed:', error?.response?.data || error);
      setMessage(parseApiError(error, 'Failed to fetch jobs. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="page">
      <div className="hero">
        <h1>Find your next role faster.</h1>
        <p>Meet the team, search descriptions, and view prioritized direct jobs published on this website first.</p>
      </div>
      <FilterBar
        filters={filters}
        onChange={(e) => setFilters({ ...filters, [e.target.name]: e.target.value })}
        onSearch={runFilter}
      />
      <button className="btn" onClick={refreshFromApi}>Refresh from API</button>
      {message && <p className="status">{message}</p>}
      {loading ? <p>Loading jobs...</p> : (
        <div className="grid">
          {jobs.map((job) => <JobCard key={job.id} job={job} onSave={saveJob} onApply={applyJob} />)}
        </div>
      )}
    </section>
  );
};

export default JobsPage;
