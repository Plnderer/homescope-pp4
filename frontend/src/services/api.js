const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

function buildUrl(path, params = {}) {
  const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${base}${normalizedPath}`, window.location.origin);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  });

  return url;
}

async function request(path, options = {}) {
  const { params, ...fetchOptions } = options;
  const response = await fetch(buildUrl(path, params), {
    headers: {
      'Content-Type': 'application/json',
      ...(fetchOptions.headers || {}),
    },
    ...fetchOptions,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export function getSummary() {
  return request('/summary');
}

export function getFilters(state) {
  return request('/filters', { params: { state } });
}

export function getMarket(filters) {
  return request('/market', {
    params: {
      state: filters.state,
      city: filters.city,
      min_beds: filters.minBeds,
      min_baths: filters.minBaths,
      min_sqft: filters.minSqft,
      max_sqft: filters.maxSqft,
    },
  });
}

export function getModels() {
  return request('/models');
}

export function predictFairValue(payload) {
  return request('/predict', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
