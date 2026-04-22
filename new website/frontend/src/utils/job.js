export const getNormalizedJobUrl = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

export const hasExternalJobUrl = (value) => {
  const normalized = getNormalizedJobUrl(value);
  return normalized.startsWith('http://') || normalized.startsWith('https://');
};

