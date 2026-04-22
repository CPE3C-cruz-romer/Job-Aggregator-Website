import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { parseApiError } from '../utils/error';

const EmployerRegisterPage = () => {
  const { registerEmployer, loginWithGoogle, logout } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    username: '', email: '', password: '', company_name: '', contact_email: '', contact_phone: '',
  });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await registerEmployer({
        ...form,
        contact_email: form.contact_email || form.email,
      });
      navigate('/employer/workspace');
    } catch (err) {
      setError(parseApiError(err, 'Employer registration failed.'));
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
        setError('Google sign-in is enabled, but this account is not yet an employer. Complete employer registration form first.');
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
        <h2>Create Employer Account</h2>
        <p className="muted">Create your company profile to post jobs directly from your employer workspace.</p>
        <input placeholder="Username" required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        <input placeholder="Business email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input placeholder="Company name" required value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
        <input placeholder="Recruiter contact email (optional)" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
        <input placeholder="Recruiter contact phone" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
        <input placeholder="Password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn" type="submit" disabled={loading}>{loading ? 'Registering...' : 'Register Employer'}</button>
        <div className="google-wrap">
          <GoogleSignInButton onCredential={onGoogleCredential} onError={(msg) => setError(msg)} />
        </div>
        <p>Already an employer? <Link to="/employer/login">Login here</Link></p>
      </form>
    </section>
  );
};

export default EmployerRegisterPage;
