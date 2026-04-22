import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { parseApiError } from '../utils/error';
import { useAuth } from '../context/AuthContext';

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { setOnboardingCompleted } = useAuth();
  const [step, setStep] = useState(1);
  const [jobInterests, setJobInterests] = useState('');
  const [skills, setSkills] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const toArray = (value) => value.split(',').map((item) => item.trim()).filter(Boolean);

  const submitOnboarding = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = {
        job_interests: toArray(jobInterests),
        skills: toArray(skills),
      };
      await api.post('/user/profile/onboarding/', payload);
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
        <h2>Complete your profile setup</h2>
        <p className="muted">Step {step} of 2</p>
        {step === 1 ? (
          <>
            <label>Job interests (comma separated)</label>
            <input
              placeholder="Construction, Accountant, IT"
              value={jobInterests}
              onChange={(e) => setJobInterests(e.target.value)}
            />
            <button type="button" className="btn" onClick={() => setStep(2)} disabled={!jobInterests.trim()}>
              Continue
            </button>
          </>
        ) : (
          <>
            <label>Skills (comma separated)</label>
            <input
              placeholder="Python, JavaScript, Communication"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
            />
            {error && <p className="error">{error}</p>}
            <div className="actions">
              <button type="button" className="btn-alt" onClick={() => setStep(1)}>Back</button>
              <button type="button" className="btn" onClick={submitOnboarding} disabled={loading || !skills.trim()}>
                {loading ? 'Saving...' : 'Finish Setup'}
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default OnboardingPage;
