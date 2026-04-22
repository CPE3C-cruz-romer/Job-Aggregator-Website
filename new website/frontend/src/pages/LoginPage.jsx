import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { parseApiError } from '../utils/error';

const LoginPage = () => {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(form.username, form.password);
      navigate(data?.is_employer || data?.onboarding_completed ? '/jobs' : '/onboarding');
    } catch (err) {
      setError(parseApiError(err, 'Invalid email or password.'));
    } finally {
      setLoading(false);
    }
  };

  const onGoogleCredential = async (credential) => {
    setError('');
    setLoading(true);
    try {
      const data = await loginWithGoogle(credential);
      navigate(data?.is_employer || data?.onboarding_completed ? '/jobs' : '/onboarding');
    } catch (err) {
      setError(parseApiError(err, 'Google login failed.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-wrap">
      <form className="auth-card" onSubmit={onSubmit}>
        <h2>Welcome Back</h2>
        <p className="muted">Sign in with username/email + password or continue with Google.</p>
        <input placeholder="Username or Email" onChange={(e) => setForm({ ...form, username: e.target.value })} />
        <input placeholder="Password" type="password" onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn" type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Login'}</button>
        <div className="google-wrap">
          <GoogleSignInButton onCredential={onGoogleCredential} onError={(msg) => setError(msg)} />
        </div>
        <p>No account yet? <Link to="/register">Register</Link></p>
      </form>
    </section>
  );
};

export default LoginPage;
