/*
 * src/api/movies.js – TMDB integration
 *
 * This module provides functions to fetch media metadata and generate embed URLs
 * using TMDB API, and player sources (Videasy, VidSrc, Vidking).
 */

import { PLAYER_SOURCES, getSourceUrl } from '../utils/playerSources';

const TMDB_API_KEY = '288d312680f3117dd4c56964be6809dc'; // Public TMDB key
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Fetch movie details by TMDB ID
export async function fetchMovieDetails(tmdbId) {
  try {
    const res = await fetch(`${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US`);
    return await res.json();
  } catch (e) {
    console.warn('Failed to fetch movie details:', e);
    return null;
  }
}

// Fetch TV show details by TMDB ID
export async function fetchTVDetails(tmdbId) {
  try {
    const res = await fetch(`${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US`);
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
      let seasons = data.seasons || [];
      
      // For TV shows, fetch all season details to get actual episodes
      if (mediaType !== 'movie' && seasons.length > 0) {
        const seasonPromises = seasons
          .filter(s => s.season_number > 0) // Skip season 0 (specials) if needed
          .map(async (s) => {
            const seasonData = await fetchTVSeasonDetails(tmdbId, s.season_number);
            return {
              ...s,
              episodes: seasonData?.episodes || []
            };
          });
        
        seasons = await Promise.all(seasonPromises);
      }

      return {
        ...data,
        tmdbId: data.id,
        imdb_id: data.imdb_id,
        title: data.title || data.name,
        name: data.title || data.name,
        poster: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : '',
        banner: data.backdrop_path ? `https://image.tmdb.org/t/p/original${data.backdrop_path}` : '',
        description: data.overview,
        releaseInfo: data.release_date ? data.release_date.split('-')[0] : data.first_air_date?.split('-')[0] || '',
        genres: data.genres?.map(g => g.name) || [],
        runtime: data.runtime,
        type: mediaType,
        seasons
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
        poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '',
        quality: '1080p',
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
        poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '',
        quality: 'HD',
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
export async function searchMoviesAndSeries(query) {
  if (!query) return [];
  try {
    const res = await fetch(`${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=en-US`);
    const data = await res.json();
    if (data && data.results) {
      return data.results.filter(item => item.media_type === 'movie' || item.media_type === 'tv')
        .map(item => ({
          id: item.id,
          tmdbId: item.id,
          title: item.title || item.name,
          name: item.title || item.name,
          poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '',
          banner: item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : '',
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
