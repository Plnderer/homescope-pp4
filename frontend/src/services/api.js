const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }

  return response.json();
}

export function getSummary() {
  return request("/summary");
}

export function getFilters(state = "All") {
  const params = new URLSearchParams();
  if (state) params.set("state", state);
  return request(`/filters?${params.toString()}`);
}

export function getMarket(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, value);
    }
  });
  return request(`/market?${params.toString()}`);
}

export function getModels() {
  return request("/models");
}

export function predictListing(payload) {
  return request("/predict", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
