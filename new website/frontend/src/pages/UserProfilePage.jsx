import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { parseApiError } from '../utils/error';

const UserProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [message, setMessage] = useState('');

  const loadProfile = async () => {
    try {
      const { data } = await api.get('/user/profile/');
      setProfile(data);
    } catch (err) {
      setMessage(parseApiError(err, 'Failed to load profile.'));
    }
  };

  useEffect(() => { loadProfile(); }, []);

  const updateField = (field, value) => setProfile((prev) => ({ ...prev, [field]: value }));

  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      await api.patch('/user/profile/me/', profile);
      setMessage('Profile updated successfully.');
    } catch (err) {
      setMessage(parseApiError(err, 'Failed to update profile.'));
    }
  };

  if (!profile) return <section className="page"><p>Loading profile...</p>{message && <p className="error">{message}</p>}</section>;

  return (
    <section className="page">
      <div className="hero compact"><h1>My Profile</h1></div>
      <form className="card" onSubmit={saveProfile}>
        <input value={profile.full_name || ''} placeholder="Name" onChange={(e) => updateField('full_name', e.target.value)} />
        <input
          value={(profile.skills || []).join(', ')}
          placeholder="Skills"
          onChange={(e) => updateField('skills', e.target.value.split(',').map((i) => i.trim()).filter(Boolean))}
        />
        <input
          value={(profile.job_interests || []).join(', ')}
          placeholder="Job preferences"
          onChange={(e) => updateField('job_interests', e.target.value.split(',').map((i) => i.trim()).filter(Boolean))}
        />
        <textarea value={profile.experience || ''} placeholder="Experience (optional)" onChange={(e) => updateField('experience', e.target.value)} />
        <input value={profile.profile_picture_url || ''} placeholder="Profile picture URL (optional)" onChange={(e) => updateField('profile_picture_url', e.target.value)} />
        <button className="btn" type="submit">Save Profile</button>
        {message && <p className="status">{message}</p>}
      </form>
    </section>
  );
};

export default UserProfilePage;
