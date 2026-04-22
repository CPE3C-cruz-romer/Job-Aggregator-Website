import { useEffect, useRef, useState } from 'react';

const useResumeCamera = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [streaming, setStreaming] = useState(false);
  const [captureBlob, setCaptureBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [facingMode, setFacingMode] = useState('environment');

  const stopCamera = () => {
    const tracks = streamRef.current?.getTracks() || [];
    tracks.forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStreaming(false);
  };

  const resetCapture = () => {
    setCaptureBlob(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return '';
    });
  };

  const startCamera = async ({ onReset } = {}) => {
    setCameraError('');
    stopCamera();
    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraError('Camera is not supported on this device/browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facingMode } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setStreaming(true);
      if (typeof onReset === 'function') onReset();
    } catch {
      setCameraError('Camera access denied or unavailable.');
      setStreaming(false);
    }
  };

  useEffect(() => () => {
    stopCamera();
    resetCapture();
  }, []);

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    if (videoRef.current.readyState < 2 || !videoRef.current.videoWidth || !videoRef.current.videoHeight) {
      setCameraError('Camera stream is not ready yet. Please wait a second and try again.');
      return;
    }
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      setCameraError('Unable to process captured image. Please retry.');
      return;
    }
    context.drawImage(videoRef.current, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      resetCapture();
      setCaptureBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
      stopCamera();
    }, 'image/jpeg', 0.95);
  };

  return {
    videoRef,
    canvasRef,
    streaming,
    captureBlob,
    previewUrl,
    cameraError,
    facingMode,
    setFacingMode,
    setCaptureBlob,
    resetCapture,
    startCamera,
    stopCamera,
    capture,
  };
};

export default useResumeCamera;
