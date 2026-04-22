import React from 'react';

const ResumeCameraPanel = ({
  streaming,
  facingMode,
  onToggleFacingMode,
  onStart,
  onCapture,
  onStop,
  onConfirmCapture,
  onRetake,
  videoRef,
  canvasRef,
  captureBlob,
  previewUrl,
  cameraError,
}) => (
  <div className="card">
    <h3>Camera Capture</h3>
    <div className="actions">
      {!streaming && <button className="btn-alt" onClick={onStart}>Start Camera</button>}
      {!streaming && (
        <button type="button" className="btn-alt" onClick={onToggleFacingMode}>
          Use {facingMode === 'user' ? 'Back' : 'Front'} Camera
        </button>
      )}
      {streaming && <button className="btn-alt" onClick={onCapture}>Capture Resume</button>}
      {streaming && <button className="btn-alt" onClick={onStop}>Stop Camera</button>}
    </div>
    <video ref={videoRef} autoPlay playsInline muted className="camera" />
    <canvas ref={canvasRef} className="camera hidden" />
    {previewUrl && (
      <div>
        <img src={previewUrl} alt="Captured resume preview" className="camera" />
        <div className="actions">
          <button type="button" className="btn" onClick={onConfirmCapture}>Use This Capture</button>
          <button type="button" className="btn-alt" onClick={onRetake}>Retake</button>
        </div>
      </div>
    )}
    {captureBlob && <p className="status">Captured image is ready. Confirm to enable upload.</p>}
    {cameraError && <p className="error">{cameraError}</p>}
  </div>
);

export default ResumeCameraPanel;
