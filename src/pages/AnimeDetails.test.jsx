import { describe, expect, it } from 'vitest';
import { formatScore, normalizeAnime } from '../hooks/useAnimeDetails';
import { getContentMinAgeFromMedia, getProfileMaxAge, isBlockedForProfile, isKidsProfile } from '../utils/ageRating';

describe('normalizeAnime', () => {
  it('normalizes core metadata from title and series responses', () => {
    const anime = normalizeAnime(
      {
        title: 'Solo Leveling',
        nativeTitle: '나 혼자만 레벨업',
        genres: ['Action', 'Fantasy'],
        poster: 'https://poster.example/solo.jpg',
        episodes: 12,
        score: 8.9,
      },
      {
        title: 'Solo Leveling',
        season: 'Winter 2024',
        episodeList: [{ number: 1, available: { sub: true } }],
      },
      'solo-leveling'
    );

    expect(anime.id).toBe('solo-leveling');
    expect(anime.title).toBe('Solo Leveling');
    expect(anime.nativeTitle).toBe('나 혼자만 레벨업');
    expect(anime.genres).toEqual(['Action', 'Fantasy']);
    expect(anime.episodesCount).toBe(12);
    expect(anime.episodeList).toHaveLength(1);
    expect(anime.season).toBe('Winter 2024');
  });

  it('falls back to a safe default title when metadata is missing', () => {
    const anime = normalizeAnime(null, null, 'unknown-id');
    expect(anime.title).toBe('Anime');
    expect(anime.related).toEqual([]);
    expect(anime.episodeList).toEqual([]);
  });
});

describe('formatScore', () => {
  it('keeps scores in the expected display format', () => {
    expect(formatScore(8.9)).toBe('8.9');
    expect(formatScore(89)).toBe('8.9');
    expect(formatScore('9')).toBe('9.0');
    expect(formatScore('')).toBeNull();
  });
});

describe('kids profile protections', () => {
  it('treats missing profiles as a safe default for kids mode', () => {
    expect(isKidsProfile(null)).toBe(true);
    expect(getProfileMaxAge(null)).toBe(12);
  });

  it('blocks unknown media for kids profiles by default', () => {
    expect(getContentMinAgeFromMedia(null)).toBe(13);
    expect(getContentMinAgeFromMedia({ title: 'Unknown' })).toBe(13);
    expect(isBlockedForProfile({ title: 'Unknown' }, { ageRating: 'kids' })).toBe(true);
  });

  it('handles browse-feed genre and rating metadata safely', () => {
    expect(getContentMinAgeFromMedia({ genres: [{ name: 'Horror' }] })).toBe(18);
    expect(getContentMinAgeFromMedia({ genre: 'Adventure' })).toBe(13);
    expect(getContentMinAgeFromMedia({ certification: { name: 'PG-13' } })).toBe(13);
    expect(getContentMinAgeFromMedia({ rating: 'PG' })).toBe(7);
    expect(getContentMinAgeFromMedia({
      release_dates: { results: [{ iso_3166_1: 'US', release_dates: [{ certification: 'PG' }] }] },
    })).toBe(7);
    expect(getContentMinAgeFromMedia({
      content_ratings: { results: [{ iso_3166_1: 'US', rating: 'TV-14' }] },
    })).toBe(14);
  });

  it('allows adult profiles to view mature content', () => {
    expect(isBlockedForProfile({ adult: true }, { ageRating: 'adults' })).toBe(false);
    expect(isKidsProfile({ ageRating: 'kids' })).toBe(true);
  });
});
