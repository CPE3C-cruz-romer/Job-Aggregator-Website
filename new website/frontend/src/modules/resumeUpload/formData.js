export const buildResumeUploadFormData = ({ file, captureBlob, nickname }) => {
    const form = new FormData();

    // Append document file if not an image
    if (file && file.type && !file.type.startsWith('image/')) {
        form.append('file', file);
    }

    // Append image file from input or camera capture
    if (file && file.type && file.type.startsWith('image/')) {
        form.append('image', file);
    } else if (captureBlob) {
        const captureFile = new File([captureBlob], `resume-capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
        form.append('image', captureFile);
    }

    // Append nickname if provided
    if (nickname && typeof nickname === 'string' && nickname.trim()) {
        form.append('nickname', nickname.trim());
    }

    return form;
};