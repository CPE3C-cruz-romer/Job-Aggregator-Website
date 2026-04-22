import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { parseApiError } from '../utils/error';
import { getNormalizedJobUrl, hasExternalJobUrl } from '../utils/job';

const ResumePage = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [nickname, setNickname] = useState('');
  const [info, setInfo] = useState('');
  const [jobId, setJobId] = useState('');
  const [match, setMatch] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [captureBlob, setCaptureBlob] = useState(null);
  const [faceWelcomeMessage, setFaceWelcomeMessage] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const detectionFrameRef = useRef(null);
  const faceDetectorRef = useRef(null);

  const fetchRecommendations = async () => {
    const { data } = await api.get('/resume/recommendations/');
    setRecommendations(data);
  };

  const resetSkillMatchingState = ({ keepInfo = false } = {}) => {
    setMatch(null);
    setRecommendations(null);
    setError('');
    if (!keepInfo) setInfo('');
  };

  const upload = async () => {
    if (!file && !captureBlob) {
      setError('Please upload a PDF or capture a resume image first.');
      return;
    }

    setLoading(true);
    resetSkillMatchingState();

    try {
      const form = new FormData();
      if (file?.type?.startsWith('image/')) {
        form.append('image', file, file.name || 'resume-image');
      } else if (file) {
        form.append('file', file);
      }
      if (captureBlob) form.append('image', captureBlob, 'resume-capture.jpg');
      if (nickname.trim()) form.append('nickname', nickname.trim());

      const { data } = await api.post('/resume/', form);
      setInfo(`Resume uploaded at ${new Date(data.uploaded_at).toLocaleString()}`);
      if (data.ocr_warning) setInfo((prev) => `${prev} • ${data.ocr_warning}`);

      try {
        await fetchRecommendations();
      } catch (recommendationError) {
        setRecommendations(null);
        setError(parseApiError(recommendationError, 'Resume uploaded, but recommendations failed to load.'));
      }
    } catch (err) {
      setError(parseApiError(err, 'Failed to upload resume.'));
      setRecommendations(null);
    } finally {
      setLoading(false);
    }
  };

  const checkMatch = async () => {
    if (!jobId) {
      setError('Enter a job ID first.');
      return;
    }
    setLoading(true);
    resetSkillMatchingState({ keepInfo: true });
    try {
      const { data } = await api.get(`/resume/skill_match/?job_id=${jobId}`);
      setMatch(data);
    } catch (err) {
      setError(parseApiError(err, 'Failed to check skill match.'));
      setMatch(null);
    } finally {
      setLoading(false);
    }
  };

  const saveRecommendedJob = async (jobId) => {
    try {
      await api.post('/save-job/', { job_id: jobId });
      setInfo('Recommended job saved.');
    } catch (err) {
      setError(parseApiError(err, 'Unable to save recommended job.'));
    }
  };

  const applyRecommendedJob = async (job) => {
    try {
      await api.post('/apply/', { job_id: job.job_id, status: 'applied' });
      const externalUrl = getNormalizedJobUrl(job.url);
      if (hasExternalJobUrl(externalUrl)) {
        window.open(externalUrl, '_blank', 'noopener,noreferrer');
      } else {
        navigate(`/jobs/${job.job_id}`);
      }
      setInfo('Application tracked from recommendations.');
    } catch (err) {
      setError(parseApiError(err, 'Unable to apply for recommended job.'));
    }
  };

  const startCamera = async () => {
    setError('');
    setFaceWelcomeMessage('');
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoRef.current.srcObject = stream;
    setStreaming(true);

    if (!('FaceDetector' in window)) return;
    if (!faceDetectorRef.current) {
      faceDetectorRef.current = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
    }

    const detectFace = async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        detectionFrameRef.current = requestAnimationFrame(detectFace);
        return;
      }

      const faces = await faceDetectorRef.current.detect(videoRef.current);
      if (faces.length > 0) {
        setMatch(null);
        setRecommendations(null);
        setInfo('');
        setError('');
        setCaptureBlob(null);
        setFaceWelcomeMessage('Hello, welcome to our website. Thank you for using it!');
        stopCamera();
        return;
      }

      detectionFrameRef.current = requestAnimationFrame(detectFace);
    };

    detectionFrameRef.current = requestAnimationFrame(detectFace);
  };

  const stopCamera = () => {
    if (detectionFrameRef.current) {
      cancelAnimationFrame(detectionFrameRef.current);
      detectionFrameRef.current = null;
    }
    const tracks = videoRef.current?.srcObject?.getTracks() || [];
    tracks.forEach((t) => t.stop());
    setStreaming(false);
  };

  const capture = () => {
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    canvas.toBlob((blob) => setCaptureBlob(blob), 'image/jpeg', 0.95);
  };

  return (
    <section className="page">
      <h2>Resume Upload, Skill Match & Recommended Jobs</h2>
      <p className="muted">Upload resume as PDF, DOCX, or images (.jpg, .jpeg, .png, .webp, .bmp, .tiff) or use camera capture for OCR skill matching.</p>

      <div className="card">
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Optional nickname (used to personalize skill matching)"
        />
        <input type="file" accept=".pdf,.docx,image/*,.jpeg,.jpg,.png,.webp,.bmp,.tif,.tiff" onChange={(e) => setFile(e.target.files[0])} />
        <div className="actions">
          <button className="btn" onClick={upload} disabled={loading}>{loading ? 'Processing...' : 'Upload Resume'}</button>
        </div>
      </div>

      <div className="card">
        <h3>Camera Capture</h3>
        <div className="actions">
          {!streaming && <button className="btn-alt" onClick={startCamera}>Start Camera</button>}
          {streaming && <button className="btn-alt" onClick={capture}>Capture Resume</button>}
          {streaming && <button className="btn-alt" onClick={stopCamera}>Stop Camera</button>}
        </div>
        <video ref={videoRef} autoPlay className="camera" />
        <canvas ref={canvasRef} className="camera hidden" />
        {captureBlob && <p className="status">Captured image is ready. Click Upload Resume.</p>}
        {faceWelcomeMessage && <p className="status">{faceWelcomeMessage}</p>}
      </div>

      {info && <p className="status">{info}</p>}
      {error && <p className="error">{error}</p>}

      {recommendations && (
        <section className="card">
          <h3>Suggested Jobs for You</h3>
          <p><strong>Detected skills:</strong> {recommendations.extracted_skills.join(', ') || 'None'}</p>
          {recommendations.profile && (
            <p className="muted">
              <strong>Parsed profile:</strong> {Object.entries(recommendations.profile).map(([k, v]) => `${k}: ${v.length}`).join(' • ')}
            </p>
          )}
          {recommendations.recommended_jobs.length === 0 ? (
            <p>No suitable jobs found yet. Try refreshing jobs and uploading a more detailed resume.</p>
          ) : (
            <div className="grid">
              {recommendations.recommended_jobs.map((job) => (
                <article key={job.job_id} className="card">
                  <h4>
                    {hasExternalJobUrl(getNormalizedJobUrl(job.url)) ? (
                      <a href={getNormalizedJobUrl(job.url)} target="_blank" rel="noreferrer">{job.title}</a>
                    ) : (
                      <button type="button" className="link-btn" onClick={() => navigate(`/jobs/${job.job_id}`)}>{job.title}</button>
                    )}
                  </h4>
                  <p className="muted">{job.company} • {job.location}</p>
                  <p><strong>Match score:</strong> {job.match_score}%</p>
                  <p><strong>Matched skills:</strong> {job.matched_skills.join(', ')}</p>
                  <p className="muted"><strong>Reason:</strong> {job.reason}</p>
                  <div className="actions">
                    <button className="btn" type="button" onClick={() => saveRecommendedJob(job.job_id)}>Save</button>
                    <button className="btn" type="button" onClick={() => applyRecommendedJob(job)}>Apply</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="card">
        <h3>Check Match with Specific Job ID</h3>
        <input value={jobId} onChange={(e) => setJobId(e.target.value)} placeholder="Enter Job ID" />
        <div className="actions">
          <button className="btn" onClick={checkMatch} disabled={loading}>Check Match</button>
          <button
            type="button"
            className="btn-alt"
            onClick={() => {
              setJobId('');
              resetSkillMatchingState();
            }}
            disabled={loading}
          >
            Reset Skill Matching
          </button>
        </div>
        {match && <p>Score: {match.score}% | Skills: {match.matched_skills.join(', ') || 'None'}</p>}
      </div>
    </section>
  );
};

export default ResumePage;
