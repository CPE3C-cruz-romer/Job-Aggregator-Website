import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { parseApiError } from '../utils/error';

const RegisterPage = () => {
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
        <p className="muted">Use 8+ characters and avoid common or numeric-only passwords.</p>
        <input placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error && <p className="error" role="alert">Please fix: {error}</p>}
        <button className="btn" type="submit" disabled={loading}>{loading ? 'Creating account...' : 'Register'}</button>
        <div className="google-wrap">
          <GoogleSignInButton onCredential={onGoogleCredential} onError={(msg) => setError(msg)} />
        </div>
        <p>Already have an account? <Link to="/login">Login</Link></p>
      </form>
    </section>
  );
};

export default RegisterPage;
