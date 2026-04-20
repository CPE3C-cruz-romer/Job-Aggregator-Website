import React, { useState } from 'react';

export default function EmployerRegisterPage() {
  const [form, setForm] = useState({ username: '', email: '', company_name: '', password1: '', password2: '' });

  const onSubmit = async (event) => {
    event.preventDefault();
    const payload = new URLSearchParams(form);
    const response = await fetch('/employers/register/', {
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
      <h2>Create Employer Account</h2>
      <form onSubmit={onSubmit}>
        <input name="username" placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
        <input name="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <input name="company_name" placeholder="Company Name" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} required />
        <input type="password" name="password1" placeholder="Password" value={form.password1} onChange={(e) => setForm({ ...form, password1: e.target.value })} required />
        <input type="password" name="password2" placeholder="Confirm Password" value={form.password2} onChange={(e) => setForm({ ...form, password2: e.target.value })} required />
        <button type="submit">Register Employer</button>
      </form>
    </main>
  );
}
