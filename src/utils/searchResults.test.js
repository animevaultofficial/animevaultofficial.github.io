import { describe, expect, it } from 'vitest';
import { mergeAnimeAndMediaResults, normalizeAnimeSearchResults } from './searchResults';

describe('anime search result routing', () => {
  it('normalizes AniList results with their anime IDs and titles', () => {
    const [anime] = normalizeAnimeSearchResults({
      data: [{
        anilistId: 123,
        title: { english: 'Love Unseen: Clear Blue Sky', romaji: 'Aozora' },
        poster: { large: 'https://images.example/poster.jpg' },
      }],
    });

    expect(anime).toMatchObject({
      id: 123,
      anilistId: 123,
      mediaType: 'anime',
      _type: 'anime',
      title: 'Love Unseen: Clear Blue Sky',
      poster: 'https://images.example/poster.jpg',
    });
  });

  it('prioritizes matching anime over TMDB movie or TV results', () => {
    const results = mergeAnimeAndMediaResults(
      [{
        id: 123,
        title: { english: 'Love Unseen: Clear Blue Sky' },
      }],
      [
        { id: 987, title: 'Love Unseen - Clear Blue Sky', mediaType: 'movie', genre_ids: [16] },
        { id: 654, title: 'Unrelated animated movie', mediaType: 'movie', genre_ids: [16] },
        { id: 321, title: 'Unrelated drama', mediaType: 'series' },
      ],
    );

    expect(results.map(item => item.id)).toEqual([123, 654, 321]);
    expect(results[0].mediaType).toBe('anime');
  });
});
