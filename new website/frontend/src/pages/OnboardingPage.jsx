import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { parseApiError } from '../utils/error';
import { useAuth } from '../context/AuthContext';

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { setOnboardingCompleted } = useAuth();
  const [step, setStep] = useState(1);
  const [jobPreferences, setJobPreferences] = useState([]);
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const jobOptions = ['Construction', 'Accountant', 'IT', 'Healthcare', 'Marketing', 'Sales'];
  const skillOptions = ['Python', 'JavaScript', 'Communication', 'C++', 'Project Management', 'SQL'];

  const submitOnboarding = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = {
        jobPreferences,
        skills,
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
        <h2>Complete your profile setup</h2>
        <p className="muted">Step {step} of 2</p>
        {step === 1 ? (
          <>
            <label>Select work/job interests</label>
            <div className="actions">
              {jobOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={jobPreferences.includes(option) ? 'btn' : 'btn-alt'}
                  onClick={() => setJobPreferences((prev) => (prev.includes(option) ? prev.filter((item) => item !== option) : [...prev, option]))}
                >
                  {option}
                </button>
              ))}
            </div>
            <button type="button" className="btn" onClick={() => setStep(2)} disabled={!jobPreferences.length}>
              Continue
            </button>
          </>
        ) : (
          <>
            <label>Select or add your skills</label>
            <div className="actions">
              {skillOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={skills.includes(option) ? 'btn' : 'btn-alt'}
                  onClick={() => setSkills((prev) => (prev.includes(option) ? prev.filter((item) => item !== option) : [...prev, option]))}
                >
                  {option}
                </button>
              ))}
            </div>
            <input
              placeholder="Type a skill and press Add"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
            />
            <button
              type="button"
              className="btn-alt"
              onClick={() => {
                const newSkill = skillInput.trim();
                if (!newSkill) return;
                setSkills((prev) => (prev.includes(newSkill) ? prev : [...prev, newSkill]));
                setSkillInput('');
              }}
            >
              Add Skill
            </button>
            {error && <p className="error">{error}</p>}
            <div className="actions">
              <button type="button" className="btn-alt" onClick={() => setStep(1)}>Back</button>
              <button type="button" className="btn" onClick={submitOnboarding} disabled={loading || !skills.length}>
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
