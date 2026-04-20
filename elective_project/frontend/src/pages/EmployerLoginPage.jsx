import React, { useState } from 'react';

export default function EmployerLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const onSubmit = async (event) => {
    event.preventDefault();
    const payload = new URLSearchParams({ username, password });
    const response = await fetch('/employers/login/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: payload,
      credentials: 'include'
    });
    if (response.redirected) {
      window.location.href = response.url;
    }
  };

  return (
    <main className="wrap">
      <h2>Employer Login</h2>
      <form onSubmit={onSubmit}>
        <input type="text" name="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" required />
        <input type="password" name="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
        <button type="submit">Login</button>
      </form>
    </main>
  );
}
