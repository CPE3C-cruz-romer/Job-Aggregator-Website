import React, { useEffect, useRef, useState } from 'react';

const MobileCameraCapture = ({ onCapture }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [facingMode, setFacingMode] = useState('user');
  const [error, setError] = useState('');
  const [supported, setSupported] = useState(true);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startStream = async (mode) => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      setSupported(false);
      setError('Camera is not supported on this device/browser.');
      return;
    }
    setError('');
    stopStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError('Camera access denied or unavailable.');
    }
  };

  useEffect(() => {
    startStream(facingMode);
    return () => stopStream();
  }, [facingMode]);

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `camera-profile-${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture(file, URL.createObjectURL(blob));
      },
      'image/jpeg',
      0.82
    );
  };

  if (!supported) return <p className="muted">Camera capture is not supported on this browser.</p>;

  return (
    <div className="card">
      <video ref={videoRef} className="camera" autoPlay playsInline muted />
      <canvas ref={canvasRef} className="hidden" />
      <div className="actions" style={{ marginTop: 10 }}>
        <button type="button" className="btn-alt" onClick={() => setFacingMode((m) => (m === 'user' ? 'environment' : 'user'))}>
          Switch Camera
        </button>
        <button type="button" className="btn" onClick={capturePhoto}>Capture Photo</button>
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
};

export default MobileCameraCapture;
