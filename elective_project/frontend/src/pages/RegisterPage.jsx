import React, { useState } from 'react';

export default function RegisterPage() {
  const [form, setForm] = useState({ username: '', password1: '', password2: '' });

  const onSubmit = async (e) => {
    e.preventDefault();
    const payload = new URLSearchParams(form);
    const response = await fetch('/register/', {
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
    <main className="card auth-wrap">
      <h2>Create Account</h2>
      <form onSubmit={onSubmit}>
        <input name="username" placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
        <input type="password" name="password1" placeholder="Password" value={form.password1} onChange={(e) => setForm({ ...form, password1: e.target.value })} required />
        <input type="password" name="password2" placeholder="Confirm Password" value={form.password2} onChange={(e) => setForm({ ...form, password2: e.target.value })} required />
        <button type="submit">Register</button>
      </form>
    </main>
  );
}
