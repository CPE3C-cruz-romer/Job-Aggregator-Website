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
  const [skip, setSkip] = useState(0);
  const [hasMoreJobs, setHasMoreJobs] = useState(false);
  const [recommended, setRecommended] = useState([]);
  const [recommendedPage, setRecommendedPage] = useState(1);
  const [recommendedHasMore, setRecommendedHasMore] = useState(false);
  const [preferredSearch, setPreferredSearch] = useState('');

  const loadJobs = async ({ searchQuery = '', nextSkip = 0, append = false } = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: '10',
        skip: String(nextSkip),
      });
      if (searchQuery) params.set('query', searchQuery);
      const { data, headers } = await api.get(`/jobs/?${params.toString()}`);
      const payload = Array.isArray(data) ? data : (data?.results || []);
      setJobs((prev) => (append ? [...prev, ...payload] : payload));
      setHasMoreJobs(headers['x-has-more'] === '1');
      setSkip(Number(headers['x-next-skip'] || nextSkip + 10));
    } catch (error) {
      console.error('Job list fetch failed:', error);
      setMessage(parseApiError(error, 'Failed to fetch jobs. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const boot = async () => {
      try {
        const { data } = await api.get('/user/profile/');
        localStorage.setItem('userProfile', JSON.stringify(data));
        const derivedQuery = (data.job_interests || []).join(' ');
        setPreferredSearch(derivedQuery.trim());
        await loadJobs({ searchQuery: derivedQuery });
      } catch {
        const profileRaw = localStorage.getItem('userProfile');
        if (!profileRaw) {
          loadJobs();
          return;
        }
        try {
          const profile = JSON.parse(profileRaw);
          const derivedQuery = (profile.job_interests || []).join(' ');
          setPreferredSearch(derivedQuery.trim());
          loadJobs({ searchQuery: derivedQuery });
        } catch {
          loadJobs();
        }
      }
    };
    boot();
  }, []);
  useEffect(() => {
    const loadMatches = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      try {
        const { data } = await api.get('/jobs/match/?limit=10&page=1');
        setRecommended(data.results || []);
        setRecommendedHasMore(Boolean(data.has_more));
        setRecommendedPage(1);
      } catch {
        setRecommended([]);
      }
    };
    loadMatches();
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

  const loadMoreRecommended = async () => {
    const nextPage = recommendedPage + 1;
    try {
      const { data } = await api.get(`/jobs/match/?limit=10&page=${nextPage}`);
      setRecommended((prev) => [...prev, ...(data.results || [])]);
      setRecommendedHasMore(Boolean(data.has_more));
      setRecommendedPage(nextPage);
    } catch {
      setRecommendedHasMore(false);
    }
  };

  const runFilter = async () => {
    const query = [filters.title, filters.location, filters.company].filter(Boolean).join(' ');
    await loadJobs({ searchQuery: query, nextSkip: 0, append: false });
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
      const searchTerm = filters.title.trim() || preferredSearch || 'software engineer';
      const location = filters.location.trim() || 'united states';
      const params = new URLSearchParams({
        search: searchTerm,
        where: location,
        page: '1',
        pages: '3',
        results_per_page: '50',
      });

      const { data } = await api.get(`/jobs/refresh/?${params.toString()}`);
      console.log('Refresh API response:', data);
      await loadJobs({ searchQuery: searchTerm, nextSkip: 0, append: false });
      setMessage(`Jobs refreshed for "${data.query}" in "${data.where}" (created: ${data.created}, updated: ${data.updated}).`);
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
      {recommended.length > 0 && (
        <section className="card">
          <h3>Recommended Jobs for You</h3>
          <p className="muted">Direct employer jobs are always ranked first, then jobs with strongest skill match.</p>
          <div className="grid">
            {recommended.map((job) => <JobCard key={`recommended-${job.id}`} job={job} onSave={saveJob} onApply={applyJob} />)}
          </div>
          {recommendedHasMore && (
            <button type="button" className="btn-alt" onClick={loadMoreRecommended}>Load More Matches</button>
          )}
        </section>
      )}
      {loading ? <p>Loading jobs...</p> : (
        <>
          <div className="grid">
            {jobs.map((job) => <JobCard key={job.id} job={job} onSave={saveJob} onApply={applyJob} />)}
          </div>
          {hasMoreJobs && (
            <button type="button" className="btn-alt" onClick={() => loadJobs({ nextSkip: skip, append: true })}>
              Load More Jobs
            </button>
          )}
        </>
      )}
    </section>
  );
};

export default JobsPage;
