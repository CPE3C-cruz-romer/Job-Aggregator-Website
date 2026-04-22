import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { parseApiError } from '../utils/error';

const UserProfilePage = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [message, setMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploadNonce, setUploadNonce] = useState(0);

  const loadProfile = async () => {
    try {
      const { data } = await api.get('/user/profile/');
      setProfile(data);
      localStorage.setItem('userProfile', JSON.stringify(data));
    } catch (err) {
      setMessage(parseApiError(err, 'Failed to load profile.'));
    }
  };

  useEffect(() => { loadProfile(); }, []);

  const updateField = (field, value) => setProfile((prev) => ({ ...prev, [field]: value }));
  const uniqueTerms = (items) => Array.from(new Set((items || []).map((item) => String(item).trim().toLowerCase()).filter(Boolean)));

  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('full_name', profile.full_name || '');
      formData.append('experience', profile.experience || '');
      uniqueTerms(profile.skills).forEach((skill) => formData.append('skills', skill));
      uniqueTerms(profile.job_interests).forEach((interest) => formData.append('job_interests', interest));
      if (selectedImage) formData.append('profile_picture', selectedImage);
      await api.patch('/user/profile/me/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await loadProfile();
      setMessage('Profile updated successfully.');
    } catch (err) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        setMessage('Session expired. Please login again.');
        navigate('/login');
        return;
      }
      setMessage(parseApiError(err, 'Failed to update profile.'));
    }
  };

  if (!profile) return <section className="page"><p>Loading profile...</p>{message && <p className="error">{message}</p>}</section>;

  return (
    <section className="page">
      <form className="card profile-card" onSubmit={saveProfile}>
        <div className="profile-avatar-wrap">
          <button
            type="button"
            className="btn-alt profile-avatar-btn"
            onClick={() => document.getElementById(`profile-upload-${uploadNonce}`)?.click()}
            aria-label="Upload profile picture"
          >
            {(previewUrl || profile.profile_picture_url) ? (
              <img
                src={previewUrl || profile.profile_picture_url}
                alt="Profile preview"
                className="profile-avatar-img"
              />
            ) : (
              <span>Upload Photo</span>
            )}
          </button>
        </div>
        <input value={profile.full_name || ''} placeholder="Name" onChange={(e) => updateField('full_name', e.target.value)} />
        <input
          value={(profile.skills || []).join(', ')}
          placeholder="Skills"
          onChange={(e) => updateField('skills', uniqueTerms(e.target.value.split(',')))}
        />
        <input
          value={(profile.job_interests || []).join(', ')}
          placeholder="Job preferences"
          onChange={(e) => updateField('job_interests', uniqueTerms(e.target.value.split(',')))}
        />
        <textarea value={profile.experience || ''} placeholder="Experience (optional)" onChange={(e) => updateField('experience', e.target.value)} />
        <input
          id={`profile-upload-${uploadNonce}`}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setSelectedImage(file);
            setPreviewUrl(URL.createObjectURL(file));
            setUploadNonce((prev) => prev + 1);
          }}
        />
        <button className="btn" type="submit">Save Profile</button>
        {message && <p className="status">{message}</p>}
      </form>
    </section>
  );
};

export default UserProfilePage;
