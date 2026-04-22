import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { parseApiError } from '../utils/error';

const EmployerProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/employer/profile/');
        setProfile(Array.isArray(data) ? data[0] : data);
      } catch (err) {
        setMessage(parseApiError(err, 'Unable to load employer profile.'));
      }
    })();
  }, []);

  const save = async (e) => {
    e.preventDefault();
    if (!profile?.id) return;
    try {
      await api.patch(`/employer/profile/${profile.id}/`, profile);
      setMessage('Employer profile updated.');
    } catch (err) {
      setMessage(parseApiError(err, 'Unable to update employer profile.'));
    }
  };

  if (!profile) return <section className="page"><p>Loading employer profile...</p>{message && <p className="error">{message}</p>}</section>;

  return (
    <section className="page">
      <div className="hero compact"><h1>Employer Profile</h1></div>
      <form className="card profile-card" onSubmit={save}>
        <input value={profile.company_name || ''} placeholder="Company name" onChange={(e) => setProfile({ ...profile, company_name: e.target.value })} />
        <textarea value={profile.about || ''} placeholder="Company description" onChange={(e) => setProfile({ ...profile, about: e.target.value })} />
        <input value={profile.contact_email || ''} placeholder="Contact email" onChange={(e) => setProfile({ ...profile, contact_email: e.target.value })} />
        <input value={profile.contact_phone || ''} placeholder="Contact phone" onChange={(e) => setProfile({ ...profile, contact_phone: e.target.value })} />
        <input value={profile.website || ''} placeholder="Website" onChange={(e) => setProfile({ ...profile, website: e.target.value })} />
        <input value={profile.logo_url || ''} placeholder="Logo URL (optional)" onChange={(e) => setProfile({ ...profile, logo_url: e.target.value })} />
        <button type="submit" className="btn">Save Employer Profile</button>
        {message && <p className="status">{message}</p>}
      </form>
    </section>
  );
};

export default EmployerProfilePage;
