const BASE = 'https://api.jikan.moe/v4';

async function get(endpoint) {
  const response = await fetch(`${BASE}${endpoint}`);
  if (!response.ok) {
    throw new Error(`Jikan request failed: ${response.status}`);
  }
  const data = await response.json();
  return data.data;
}

/**
 * Fetch streaming links for an anime (Crunchyroll, Netflix, etc.)
 * Uses /anime/{id}/external endpoint
 */
export async function fetchStreamingLinks(malId) {
  const external = await get(`/anime/${malId}/external`);
  // Filter to known streaming platforms
  const streamers = external.filter((e) =>
    ['Crunchyroll', 'Funimation', 'HIDIVE', 'Netflix', 'Hulu', 'Amazon Prime Video', 'Disney+', 'Anime Lab', 'Ani-One Asia', 'Muse Asia', 'VRV', 'Wakanim'].some(
      (name) => e.name?.toLowerCase().includes(name.toLowerCase())
    )
  );
  return streamers.length > 0 ? streamers : external.slice(0, 3);
}

/**
 * Fetch videos/trailers for an anime
 * Uses /anime/{id}/videos endpoint
 */
export async function fetchAnimeVideos(malId) {
  const videos = await get(`/anime/${malId}/videos`);
  return {
    promo: videos.promo || [],
    episodes: videos.episodes || [],
    music_videos: videos.music_videos || [],
  };
}

/**
 * Fetch episode list with titles and air dates
 * Uses /anime/{id}/episodes endpoint
 */
export async function fetchEpisodes(malId, page = 1) {
  const data = await get(`/anime/${malId}/episodes?page=${page}`);
  return Array.isArray(data) ? data : [];
}

/**
 * Search anime by MAL id (to get MAL id from AniList id we need cross-ref)
 * Uses /anime/{id} endpoint
 */
export async function fetchAnimeFull(malId) {
  return await get(`/anime/${malId}/full`);
}

/**
 * Fetch MyAnimeList episode-video metadata through Jikan.
 * MAL exposes episode-related video thumbnails rather than a dedicated
 * still-image field on the normal episode list, so these thumbnails are
 * matched back to the real episode numbers.
 */
export async function fetchEpisodeThumbnails(malId) {
  if (!malId) return {};
  const data = await get(`/anime/${encodeURIComponent(malId)}/videos/episodes`);
  const map = {};
  for (const item of Array.isArray(data) ? data : []) {
    const number = Number(item?.episode);
    const image =
      item?.images?.jpg?.image_url ||
      item?.images?.webp?.image_url ||
      item?.thumbnail ||
      item?.images?.jpg?.large_image_url ||
      item?.images?.webp?.large_image_url;
    if (Number.isFinite(number) && image) map[number] = image;
  }
  return map;
}
