import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { parseApiError } from '../utils/error';
import { useAuth } from '../context/AuthContext';

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { setOnboardingCompleted } = useAuth();
  const [jobPreferences, setJobPreferences] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const jobOptions = useMemo(() => ['construction', 'accountant', 'engineering', 'it', 'healthcare', 'marketing', 'sales'], []);
  const generatedQueries = useMemo(() => {
    const mapping = {
      construction: 'construction site engineer',
      accountant: 'accountant financial analyst',
      engineering: 'software devops engineer',
      it: 'backend developer data analyst',
      healthcare: 'registered nurse healthcare coordinator',
      marketing: 'digital marketing seo specialist',
      sales: 'sales representative account executive',
    };
    return jobPreferences.slice(0, 3).map((preference) => mapping[preference] || preference);
  }, [jobPreferences]);

  const togglePreference = (option) => {
    setError('');
    setJobPreferences((prev) => {
      if (prev.includes(option)) {
        return prev.filter((item) => item !== option);
      }
      if (prev.length >= 3) {
        setError('You can select up to 3 job types only.');
        return prev;
      }
      return [...prev, option];
    });
  };

  const submitOnboarding = async () => {
    if (!jobPreferences.length) {
      setError('Select at least one job type to continue.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const payload = {
        jobPreferences,
        skills: [],
      };
      const { data } = await api.post('/user/profile/onboarding/', payload);
      localStorage.setItem('userProfile', JSON.stringify(data));
      localStorage.setItem('onboardingCompleted', '1');
      setOnboardingCompleted(true);
      navigate('/jobs');
    } catch (err) {
      setError(parseApiError(err, 'Failed to complete onboarding.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-wrap">
      <div className="auth-card">
        <h2>Set your job preferences</h2>
        <p className="muted">Choose up to 3 job types. Your job feed will be built only from these selections.</p>
        <label>Select preferred job types</label>
        <div className="actions">
          {jobOptions.map((option) => (
            <button
              key={option}
              type="button"
              className={jobPreferences.includes(option) ? 'btn' : 'btn-alt'}
              onClick={() => togglePreference(option)}
            >
              {option}
            </button>
          ))}
        </div>
        <p className="muted">Selected: {jobPreferences.length}/3</p>
        {!!generatedQueries.length && (
          <p className="muted">
            Generated queries: {generatedQueries.map((query) => `"${query}"`).join(' • ')}
          </p>
        )}
        {error && <p className="error">{error}</p>}
        <button type="button" className="btn" onClick={submitOnboarding} disabled={loading || !jobPreferences.length}>
          {loading ? 'Saving...' : 'Finish Setup'}
        </button>
      </div>
    </section>
  );
};

export default OnboardingPage;
