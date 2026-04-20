export const API_HEADERS = {
  'X-Application-Id': 'aba5a62a',
  'X-Application-Key': '75f0ba2c5c175d657c947ab1e219a92b'
};

export function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return '';
}

export async function getJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  return response.json();
}
