/*
 * src/api/movies.js – TMDB integration
 *
 * This module provides functions to fetch media metadata and generate embed URLs
 * using TMDB API, and player sources (Videasy, VidSrc, Vidking).
 */

import { PLAYER_SOURCES, getSourceUrl } from '../utils/playerSources';

const TMDB_API_KEY = '288d312680f3117dd4c56964be6809dc'; // Public TMDB key
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const tmdbImageCache = new Map();
const animeEpisodeThumbnailCache = new Map();

const MOVIE_GENRES = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance',
  878: 'Science Fiction', 10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
};

const TV_GENRES = {
  10759: 'Action & Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 10762: 'Kids', 9648: 'Mystery',
  10763: 'News', 10764: 'Reality', 10765: 'Sci-Fi & Fantasy', 10766: 'Soap',
  10767: 'Talk', 10768: 'War & Politics', 37: 'Western',
};

function tmdbImage(path, size = 'w780') {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : '';
}


function getUSCertification(data, mediaType) {
  if (mediaType === 'movie') {
    const us = data?.release_dates?.results?.find(item => item.iso_3166_1 === 'US');
    return us?.release_dates?.find(item => item.certification)?.certification || '';
  }
  const us = data?.content_ratings?.results?.find(item => item.iso_3166_1 === 'US');
  return us?.rating || '';
}

// Fetch movie details by TMDB ID
export async function fetchMovieDetails(tmdbId) {
  try {
    const res = await fetch(`${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=release_dates`);
    return await res.json();
  } catch (e) {
    console.warn('Failed to fetch movie details:', e);
    return null;
  }
}

// Fetch TV show details by TMDB ID
export async function fetchTVDetails(tmdbId) {
  try {
    const res = await fetch(`${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=content_ratings`);
    return await res.json();
  } catch (e) {
    console.warn('Failed to fetch TV details:', e);
    return null;
  }
}

// Fetch TV season details with episodes
export async function fetchTVSeasonDetails(tmdbId, seasonNumber) {
  try {
    const res = await fetch(`${TMDB_BASE_URL}/tv/${tmdbId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}&language=en-US`);
    return await res.json();
  } catch (e) {
    console.warn('Failed to fetch TV season details:', e);
    return null;
  }
}

function normalizeTitle(value) {
  return String(value || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
}

async function fetchTMDBJson(path, params = {}) {
  const url = new URL(`${TMDB_BASE_URL}${path}`);
  url.searchParams.set('api_key', TMDB_API_KEY);
  url.searchParams.set('language', 'en-US');
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  });
  const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`TMDB request failed: ${response.status}`);
  return response.json();
}

export function fetchTMDBPoster(title, year, mediaType = 'movie', requireAnimation = false, alternateTitles = []) {
  const searchTerms = [...new Set([title, ...alternateTitles].filter(Boolean))];
  const cacheKey = JSON.stringify([searchTerms.map(normalizeTitle), year || '', mediaType, requireAnimation]);
  if (!normalizeTitle(title)) return Promise.resolve(null);
  if (tmdbImageCache.has(cacheKey)) return tmdbImageCache.get(cacheKey);

  const request = (async () => {
    const yearParam = mediaType === 'movie' ? 'year' : 'first_air_date_year';
    const query = async (term, includeYear) => {
      const result = await fetchTMDBJson(`/search/${mediaType}`, {
        query: term,
        [yearParam]: includeYear ? String(year || '').match(/\d{4}/)?.[0] : undefined,
      });
      return result.results || [];
    };
    const withYear = Boolean(String(year || '').match(/\d{4}/));
    const expectedTitles = new Set(searchTerms.map(normalizeTitle));
    const findMatch = results => results
      .filter(item => [item.title, item.name, item.original_title, item.original_name]
        .some(candidate => expectedTitles.has(normalizeTitle(candidate))))
      .filter(item => !requireAnimation || item.genre_ids?.includes(16))
      .sort((a, b) => {
        const yearDistance = item => {
          const date = mediaType === 'movie' ? item.release_date : item.first_air_date;
          const itemYear = Number(date?.slice(0, 4));
          return year && Number.isFinite(itemYear) ? Math.abs(itemYear - Number(year)) : 999;
        };
        return yearDistance(a) - yearDistance(b) || (b.popularity || 0) - (a.popularity || 0);
      })[0];
    let results = (await Promise.all(searchTerms.map(term => query(term, withYear)))).flat();
    let match = findMatch(results);
    if (!match && withYear) {
      results = (await Promise.all(searchTerms.map(term => query(term, false)))).flat();
      match = findMatch(results);
    }
    return match?.poster_path ? tmdbImage(match.poster_path) : null;
  })();
  tmdbImageCache.set(cacheKey, request);
  request.catch(() => tmdbImageCache.delete(cacheKey));
  return request;
}

export function fetchTMDBBackdrop(title, year, mediaType = 'tv', requireAnimation = false, alternateTitles = []) {
  const searchTerms = [...new Set([title, ...alternateTitles].filter(Boolean))];
  const cacheKey = JSON.stringify(['backdrop', searchTerms.map(normalizeTitle), year || '', mediaType, requireAnimation]);
  if (!normalizeTitle(title)) return Promise.resolve(null);
  if (tmdbImageCache.has(cacheKey)) return tmdbImageCache.get(cacheKey);

  const request = (async () => {
    const yearParam = mediaType === 'movie' ? 'year' : 'first_air_date_year';
    const query = async (term, includeYear) => {
      const result = await fetchTMDBJson(`/search/${mediaType}`, {
        query: term,
        [yearParam]: includeYear ? String(year || '').match(/\d{4}/)?.[0] : undefined,
      });
      return result.results || [];
    };
    const expectedTitles = new Set(searchTerms.map(normalizeTitle));
    const findMatch = results => results
      .filter(item => [item.title, item.name, item.original_title, item.original_name]
        .some(candidate => expectedTitles.has(normalizeTitle(candidate))))
      .filter(item => !requireAnimation || item.genre_ids?.includes(16))
      .filter(item => item.backdrop_path)
      .sort((a, b) => {
        const yearDistance = item => {
          const date = mediaType === 'movie' ? item.release_date : item.first_air_date;
          const itemYear = Number(date?.slice(0, 4));
          return year && Number.isFinite(itemYear) ? Math.abs(itemYear - Number(year)) : 999;
        };
        return yearDistance(a) - yearDistance(b) || (b.popularity || 0) - (a.popularity || 0);
      })[0];

    const withYear = Boolean(String(year || '').match(/\d{4}/));
    let results = (await Promise.all(searchTerms.map(term => query(term, withYear)))).flat();
    let match = findMatch(results);
    if (!match && withYear) {
      results = (await Promise.all(searchTerms.map(term => query(term, false)))).flat();
      match = findMatch(results);
    }
    return match?.backdrop_path ? tmdbImage(match.backdrop_path, 'w1280') : null;
  })();

  tmdbImageCache.set(cacheKey, request);
  request.catch(() => tmdbImageCache.delete(cacheKey));
  return request;
}

export function fetchAnimeEpisodeThumbnails(title, year, episodeCount, alternateTitles = [], onPartial) {
  const searchTerms = [...new Set([title, ...alternateTitles].filter(Boolean))];
  if (!normalizeTitle(title) || !Number(episodeCount)) return Promise.resolve({});
  const cacheKey = JSON.stringify([searchTerms.map(normalizeTitle), year || '', Number(episodeCount) || 0]);
  const cached = animeEpisodeThumbnailCache.get(cacheKey);
  if (cached) {
    if (typeof onPartial === 'function') {
      if (Object.keys(cached.thumbnails).length) onPartial({ ...cached.thumbnails });
      if (!cached.complete) cached.listeners.add(onPartial);
    }
    return cached.promise;
  }
  const entry = { thumbnails: {}, listeners: new Set(), complete: false, promise: null };
  const publish = thumbnails => {
    Object.assign(entry.thumbnails, thumbnails);
    entry.listeners.forEach(listener => listener({ ...entry.thumbnails }));
  };
  const request = (async () => {
    const releaseYear = String(year || '').match(/\d{4}/)?.[0];
    const searches = await Promise.allSettled(searchTerms.map(async query => {
      const result = await fetchTMDBJson('/search/tv', { query, first_air_date_year: releaseYear });
      return result.results || [];
    }));
    const normalizedTitles = new Set(searchTerms.map(normalizeTitle));
    const candidates = searches
      .filter(result => result.status === 'fulfilled')
      .flatMap(result => result.value)
      .filter((item, index, all) => all.findIndex(candidate => candidate.id === item.id) === index)
      .filter(item => item.genre_ids?.includes(16)
        && [item.name, item.original_name].some(name => normalizedTitles.has(normalizeTitle(name))))
      .sort((a, b) => {
        const yearDiff = item => {
          const releaseYear = Number(item.first_air_date?.slice(0, 4));
          return year && Number.isFinite(releaseYear) ? Math.abs(releaseYear - Number(year)) : 999;
        };
        return yearDiff(a) - yearDiff(b) || (b.popularity || 0) - (a.popularity || 0);
      });

    const series = candidates[0];
    if (!series) return {};

    const details = await fetchTMDBJson(`/tv/${series.id}`);
    const seasons = (details.seasons || [])
      .filter(season => season.season_number > 0)
      .sort((a, b) => a.season_number - b.season_number);
    const targetCount = Math.max(1, Number(episodeCount) || 1);
    const seasonRequests = [];
    let count = 0;

    for (const season of seasons) {
      if (count >= targetCount || seasonRequests.length >= 12) break;
      seasonRequests.push({
        firstEpisodeNumber: count + 1,
        request: fetchTMDBJson(`/tv/${series.id}/season/${season.season_number}`),
      });
      count += Number(season.episode_count) || 0;
    }

    const thumbnails = {};
    await Promise.all(seasonRequests.map(async ({ firstEpisodeNumber, request }) => {
      const season = await request;
      (season.episodes || []).forEach((episode, index) => {
        const episodeNumber = firstEpisodeNumber + index;
        if (episodeNumber <= targetCount && episode.still_path) {
          thumbnails[episodeNumber] = `https://image.tmdb.org/t/p/w342${episode.still_path}`;
        }
      });
      publish(thumbnails);
    }));

    return thumbnails;
  })();
  entry.promise = request.then(thumbnails => {
    entry.complete = true;
    publish(thumbnails || {});
    entry.listeners.clear();
    return thumbnails;
  });
  animeEpisodeThumbnailCache.set(cacheKey, entry);
  entry.promise.catch(() => animeEpisodeThumbnailCache.delete(cacheKey));
  if (typeof onPartial === 'function') entry.listeners.add(onPartial);
  return entry.promise;
}

// Fetch detailed metadata for a given media type ('movie' | 'tv') and TMDB ID
export async function fetchMediaMeta(mediaType, tmdbId) {
  try {
    let data;
    if (mediaType === 'movie') {
      data = await fetchMovieDetails(tmdbId);
    } else {
      data = await fetchTVDetails(tmdbId);
    }

    if (data && data.id) {
      return {
        ...data,
        tmdbId: data.id,
        imdb_id: data.imdb_id,
        title: data.title || data.name,
        name: data.title || data.name,
        poster: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : '',
        banner: data.backdrop_path ? tmdbImage(data.backdrop_path, 'w1280') : '',
        description: data.overview,
        releaseInfo: data.release_date ? data.release_date.split('-')[0] : data.first_air_date?.split('-')[0] || '',
        genres: data.genres?.map(g => g.name) || [],
        certification: getUSCertification(data, mediaType),
        adult: Boolean(data.adult),
        runtime: data.runtime,
        type: mediaType,
        seasons: data.seasons || []
      };
    }
  } catch (e) {
    console.warn('Failed to fetch media meta:', e);
  }

  return null;
}

export async function fetchTMDBBanner(title, mediaType = 'movie') {
  try {
    const typePath = mediaType === 'tv' ? 'tv' : 'movie';
    const searchUrl = new URL(`${TMDB_BASE_URL}/search/${typePath}`);
    searchUrl.searchParams.set('api_key', TMDB_API_KEY);
    searchUrl.searchParams.set('query', title);
    searchUrl.searchParams.set('language', 'en-US');
    searchUrl.searchParams.set('page', '1');

    const res = await fetch(searchUrl.toString());
    if (!res.ok) {
      throw new Error(`TMDB search failed: ${res.status}`);
    }

    const data = await res.json();
    const result = data.results?.[0];
    if (!result) return null;

    const backdrop = result.backdrop_path ? `https://image.tmdb.org/t/p/original${result.backdrop_path}` : null;
    const poster = result.poster_path ? `https://image.tmdb.org/t/p/original${result.poster_path}` : null;
    return backdrop || poster;
  } catch (e) {
    console.warn('Failed to fetch TMDB banner for', title, mediaType, e);
    return null;
  }
}

/** Progress tracking – stored as { [tmdbId]: { progress: number (0-100), lastSeen: timestamp } } */
const PROGRESS_KEY = 'animevault_movie_progress';

function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveProgress(state) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(state));
  } catch {}
}

export function setMovieProgress(tmdbId, percent) {
  const state = loadProgress();
  state[tmdbId] = { progress: percent, lastSeen: Date.now() };
  saveProgress(state);
}

export function getMovieProgress(tmdbId) {
  const state = loadProgress();
  return state[tmdbId]?.progress ?? 0;
}

/** Fetch trending movies */
export async function fetchLatestMovies(page = 1, genre = '') {
  const pageSize = 12;
  try {
    let url = `${TMDB_BASE_URL}/trending/movie/week?api_key=${TMDB_API_KEY}&page=${page}`;
    if (genre) {
      url = `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${genre}&sort_by=popularity.desc&page=${page}`;
    }
    const res = await fetch(url);
    const data = await res.json();
    if (data && data.results) {
      return data.results.map(item => ({
        id: item.id,
        tmdbId: item.id,
        title: item.title,
        name: item.title,
        year: item.release_date ? item.release_date.split('-')[0] : '',
        poster: tmdbImage(item.poster_path),
        banner: tmdbImage(item.backdrop_path, 'w1280'),
        genres: (item.genre_ids || []).map(id => MOVIE_GENRES[id]).filter(Boolean),
        genre_ids: item.genre_ids || [],
        overview: item.overview || '',
        rating: item.vote_average || 0,
        popularity: item.popularity || 0,
        quality: '1080p',
        adult: Boolean(item.adult),
        progress: getMovieProgress(item.id),
        mediaType: 'movie',
        type: 'movie'
      }));
    }
  } catch (err) {
    console.error('Failed to fetch latest movies:', err);
  }
  return [];
}

/** Fetch trending TV shows */
export async function fetchLatestTVShows(page = 1, genre = '') {
  const pageSize = 12;
  try {
    let url = `${TMDB_BASE_URL}/trending/tv/week?api_key=${TMDB_API_KEY}&page=${page}`;
    if (genre) {
      url = `${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&with_genres=${genre}&sort_by=popularity.desc&page=${page}`;
    }
    const res = await fetch(url);
    const data = await res.json();
    if (data && data.results) {
      return data.results.map(item => ({
        id: item.id,
        tmdbId: item.id,
        title: item.name,
        name: item.name,
        year: item.first_air_date ? item.first_air_date.split('-')[0] : '',
        poster: tmdbImage(item.poster_path),
        banner: tmdbImage(item.backdrop_path, 'w1280'),
        genres: (item.genre_ids || []).map(id => TV_GENRES[id]).filter(Boolean),
        genre_ids: item.genre_ids || [],
        overview: item.overview || '',
        rating: item.vote_average || 0,
        popularity: item.popularity || 0,
        quality: 'HD',
        adult: Boolean(item.adult),
        progress: getMovieProgress(item.id),
        mediaType: 'series',
        type: 'series'
      }));
    }
  } catch (err) {
    console.error('Failed to fetch latest TV shows:', err);
  }
  return [];
}

/** Search movies/series on TMDB */
export async function searchMoviesAndSeries(query, page = 1) {
  if (!query) return [];
  try {
    const res = await fetch(`${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=en-US&page=${page}`);
    const data = await res.json();
    if (data && data.results) {
      return data.results.filter(item => item.media_type === 'movie' || item.media_type === 'tv')
        .map(item => ({
          id: item.id,
          tmdbId: item.id,
          title: item.title || item.name,
          name: item.title || item.name,
          poster: tmdbImage(item.poster_path),
          banner: tmdbImage(item.backdrop_path, 'w1280'),
          genres: (item.genre_ids || []).map(id => (
            item.media_type === 'tv' ? TV_GENRES[id] : MOVIE_GENRES[id]
          )).filter(Boolean),
          genre_ids: item.genre_ids || [],
          year: (item.release_date || item.first_air_date || '').slice(0, 4),
          overview: item.overview || '',
          rating: item.vote_average || 0,
          popularity: item.popularity || 0,
          adult: Boolean(item.adult),
          progress: getMovieProgress(item.id),
          mediaType: item.media_type === 'tv' ? 'series' : 'movie',
          type: item.media_type === 'tv' ? 'series' : 'movie'
        }));
    }
  } catch (err) {
    console.error('Search failed:', err);
  }
  return [];
}

/** Fetch recommendations */
export async function getRecommended(limit = 50) {
  try {
    const [movieRes, tvRes] = await Promise.all([
      fetchLatestMovies(1),
      fetchLatestTVShows(1)
    ]);
    return [...(movieRes || []), ...(tvRes || [])].slice(0, limit);
  } catch (err) {
    console.error('Failed to fetch recommendations:', err);
  }
  return [];
}
