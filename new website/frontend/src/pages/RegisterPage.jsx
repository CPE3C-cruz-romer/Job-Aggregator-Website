import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { parseApiError } from '../utils/error';

const RegisterPage = () => {
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '', full_name: '', jobPreferences: [] });
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const preferenceOptions = useMemo(() => [
    ...new Set(['construction', 'accountant', 'engineering', 'it', 'healthcare', 'marketing', 'sales']),
  ], []);

  const togglePreference = (option) => {
    setForm((prev) => {
      const alreadySelected = prev.jobPreferences.includes(option);
      if (alreadySelected) {
        return { ...prev, jobPreferences: prev.jobPreferences.filter((item) => item !== option) };
      }
      if (prev.jobPreferences.length >= 3) {
        setError('You can select up to 3 job types only.');
        return prev;
      }
      return { ...prev, jobPreferences: [...prev.jobPreferences, option] };
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      navigate('/onboarding');
    } catch (err) {
      setError(parseApiError(err, 'Registration failed.'));
    } finally {
      setLoading(false);
    }
  };

  const onGoogleCredential = async (credential) => {
    setError('');
    setLoading(true);
    try {
      const data = await loginWithGoogle(credential);
      navigate(data?.onboarding_completed ? '/jobs' : '/onboarding');
    } catch (err) {
      setError(parseApiError(err, 'Google registration/login failed.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-wrap">
      <form className="auth-card" onSubmit={onSubmit}>
        <h2>Create Account</h2>
        <p className="muted">Use 8+ characters and avoid common or numeric-only passwords. Step {step} of 2.</p>
        {step === 1 ? (
          <>
            <input placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            <input placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <button type="button" className="btn" onClick={() => setStep(2)} disabled={!form.username || !form.email || !form.password}>
              Continue
            </button>
          </>
        ) : (
          <>
            <label>Select preferred work type (max 3)</label>
            <div className="actions">
              {preferenceOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={form.jobPreferences.includes(option) ? 'btn' : 'btn-alt'}
                  onClick={() => togglePreference(option)}
                >
                  {option}
                </button>
              ))}
            </div>
            <p className="muted">Selected: {form.jobPreferences.length}/3</p>
            {error && <p className="error" role="alert">Please fix: {error}</p>}
            <div className="actions">
              <button type="button" className="btn-alt" onClick={() => setStep(1)}>Back</button>
              <button className="btn" type="submit" disabled={loading}>
                {loading ? 'Creating account...' : 'Register'}
              </button>
            </div>
          </>
        )}
        <div className="google-wrap">
          <GoogleSignInButton onCredential={onGoogleCredential} onError={(msg) => setError(msg)} />
        </div>
        <p>Already have an account? <Link to="/login">Login</Link></p>
      </form>
    </section>
  );
};

export default RegisterPage;
