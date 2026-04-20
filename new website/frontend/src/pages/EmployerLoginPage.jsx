import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { parseApiError } from '../utils/error';

const EmployerLoginPage = () => {
  const { loginEmployer, loginWithGoogle, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await loginEmployer(form.username, form.password);
      navigate('/employer/workspace');
    } catch (err) {
      setError(parseApiError(err, 'Employer login failed.'));
    } finally {
      setLoading(false);
    }
  };

  const onGoogleCredential = async (credential) => {
    setError('');
    setLoading(true);
    try {
      const data = await loginWithGoogle(credential);
      if (!data?.is_employer) {
        logout();
        setError('This Google account is not registered as an employer. Please use Employer Register first.');
        return;
      }
      navigate('/employer/workspace');
    } catch (err) {
      setError(parseApiError(err, 'Employer Google login failed.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-wrap">
      <form className="auth-card" onSubmit={onSubmit}>
        <h2>Employer Login</h2>
        <p className="muted">Access your employer workspace to publish openings and manage listings.</p>
        <input placeholder="Employer username or email" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        <input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn" type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Login as Employer'}</button>
        <div className="google-wrap">
          <GoogleSignInButton onCredential={onGoogleCredential} onError={(msg) => setError(msg)} />
        </div>
        <p>Need an employer account? <Link to="/employer/register">Register here</Link></p>
      </form>
    </section>
  );
};

export default EmployerLoginPage;
