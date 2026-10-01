const API_BASE = 'https://ani.pm/api/partner/v1';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { Accept: 'application/json', ...(options.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || 'Ani.pm request failed.');
  return payload?.data;
}

export function searchAniPM(query, page = 1, limit = 20) {
  return request(`/titles?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
}

export function getAniPMTitle(id) {
  return request(`/titles/${encodeURIComponent(id)}`);
}

export function getAniPMSeries(id) {
  return request(`/series/${encodeURIComponent(id)}`);
}

export function getAniPMEpisodes(id) {
  return request(`/titles/${encodeURIComponent(id)}/episodes`);
}

export function getAniPMRecent(page = 1, limit = 24) {
  return request(`/recent?page=${page}&limit=${limit}`);
}

export function getAniPMSchedule() {
  return request('/schedule');
}

export function getAniPMTop(range = 'week', limit = 24) {
  return request(`/top?range=${encodeURIComponent(range)}&limit=${limit}`);
}

export function aniPMEmbedUrl({ anilistId, episode = 1, lang = 'sub', ...params }) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  });
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return `https://ani.pm/embed/ani/${encodeURIComponent(anilistId)}/${encodeURIComponent(episode)}/${encodeURIComponent(lang)}${suffix}`;
}
