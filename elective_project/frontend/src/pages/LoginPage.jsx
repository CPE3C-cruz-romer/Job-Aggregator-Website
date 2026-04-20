import React, { useState } from 'react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    const formData = new URLSearchParams({ username, password, next: '/dashboard/' });
    const response = await fetch('/login/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
      credentials: 'include'
    });
    if (response.redirected) {
      window.location.href = response.url;
      return;
    }
    setError('Invalid username or password');
  };

  return (
    <main className="card auth-wrap">
      <h2>Welcome Back</h2>
      {error && <p className="error">{error}</p>}
      <form onSubmit={onSubmit}>
        <input type="text" name="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" required />
        <input type="password" name="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
        <button className="btn-primary" type="submit">Login</button>
      </form>
      <p className="small">No account yet? <a href="/register">Register</a></p>
    </main>
  );
}
