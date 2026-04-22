const FIELD_LABELS = {
  username: 'Username',
  email: 'Email',
  password: 'Password',
  non_field_errors: '',
  detail: '',
};

const toPrettyField = (field) => {
  if (FIELD_LABELS[field] !== undefined) return FIELD_LABELS[field];
  return field
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const flattenErrorPayload = (payload) => {
  if (typeof payload === 'string') return [payload];

  if (Array.isArray(payload)) {
    return payload.flatMap((item) => flattenErrorPayload(item));
  }

  if (!payload || typeof payload !== 'object') return [];

  const lines = [];

  Object.entries(payload).forEach(([field, messages]) => {
    const messageList = Array.isArray(messages) ? messages : [messages];
    messageList.forEach((msg) => {
      const flattened = flattenErrorPayload(msg);
      flattened.forEach((line) => {
        const label = toPrettyField(field);
        lines.push(label ? `${label}: ${line}` : line);
      });
    });
  });

  return lines;
};

export const parseApiError = (err, fallback = 'Request failed.') => {
  const payload = err?.response?.data;
  if (!payload) return fallback;
  if (typeof payload === 'string') {
    const normalized = payload.trim().toLowerCase();
    if (normalized.startsWith('<!doctype html') || normalized.startsWith('<html')) return fallback;
  }
  if (typeof payload === 'object' && typeof payload.error === 'string') {
    return payload.error;
  }
  if (typeof payload === 'object' && typeof payload.detail === 'string') {
    return payload.detail;
  }
  const lines = flattenErrorPayload(payload).filter(Boolean);
  return lines.length ? lines.join(' • ') : fallback;
};
