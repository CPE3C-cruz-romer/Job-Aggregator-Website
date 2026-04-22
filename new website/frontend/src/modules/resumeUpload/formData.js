export const buildResumeUploadFormData = ({ file, captureBlob, nickname }) => {
  const form = new FormData();
  if (file?.type?.startsWith('image/')) {
    form.append('image', file, file.name || 'resume-image');
  } else if (file) {
    form.append('file', file);
  }
  if (captureBlob) {
    const captureFile = new File([captureBlob], `resume-capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
    form.append('image', captureFile);
  }
  if ((nickname || '').trim()) form.append('nickname', nickname.trim());
  return form;
};
