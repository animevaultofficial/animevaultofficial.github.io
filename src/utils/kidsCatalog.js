export const KIDS_APPROVED_ANIME_IDS = new Set(['20', '21', '527']);
export const KIDS_APPROVED_TMDB_IDS = new Set(['12', '862', '508943', '14160', '92685']);

export function isKidsCatalogApproved(media) {
  const animeId = media?.anilistId;
  if (animeId !== undefined && KIDS_APPROVED_ANIME_IDS.has(String(animeId))) return true;

  const tmdbId = media?.tmdbId
    ?? (['movie', 'tv'].includes(String(media?.type || media?.media_type || '').toLowerCase()) ? media.id : undefined);
  return tmdbId !== undefined && KIDS_APPROVED_TMDB_IDS.has(String(tmdbId));
}

export const KIDS_ANIME_FEATURES = [
  {
    id: 21,
    anilistId: 21,
    title: { english: 'One Piece' },
    description: 'A pirate adventure about friendship, courage, and big dreams.',
    seasonYear: 1999,
    averageScore: 89,
    format: 'TV',
    coverImage: { extraLarge: 'https://cdn.myanimelist.net/images/anime/6/73245.jpg' }
  },
  {
    id: 20,
    anilistId: 20,
    title: { english: 'Naruto' },
    description: 'A young ninja trains with friends and works toward becoming Hokage.',
    seasonYear: 2002,
    averageScore: 79,
    format: 'TV',
    coverImage: { extraLarge: 'https://cdn.myanimelist.net/images/anime/13/17405.jpg' }
  },
  {
    id: 527,
    anilistId: 527,
    title: { english: 'Pokémon' },
    description: 'Ash and Pikachu travel, meet friends, and discover new Pokémon.',
    seasonYear: 1997,
    averageScore: 72,
    format: 'TV',
    coverImage: { extraLarge: 'https://cdn.myanimelist.net/images/anime/13/73834.jpg' }
  }
];

export const KIDS_FAMILY_MEDIA = [
  { id: '12', name: 'Finding Nemo', type: 'movie', year: '2003', rating: '8.2', poster: 'https://image.tmdb.org/t/p/w500/eHuGQ10FUzK1mdOY69wF5pGgEf5.jpg', banner: 'https://image.tmdb.org/t/p/original/h3b6pzm7tpomYz2ZVD4Rgoz5EEP.jpg', description: 'A little clownfish gets lost, and his dad crosses the ocean with new friends to bring him home.', genre: 'Animation, Family, Adventure' },
  { id: '862', name: 'Toy Story', type: 'movie', year: '1995', rating: '8.3', poster: 'https://image.tmdb.org/t/p/w500/uXDfjJbdP4ijW5hWSBrPrlKpxab.jpg', banner: 'https://image.tmdb.org/t/p/original/3Rfvhy1Nl6sSGJwyjb0QiZzZYlB.jpg', description: 'Woody, Buzz, and a bedroom full of toys learn about friendship, teamwork, and imagination.', genre: 'Animation, Family, Comedy' },
  { id: '508943', name: 'Luca', type: 'movie', year: '2021', rating: '7.4', poster: 'https://image.tmdb.org/t/p/w500/jTswp6KyDYKtvC52GbHagrZbGvD.jpg', banner: 'https://image.tmdb.org/t/p/original/620hnMVLu6RSZW6a5rwO8gqpt0t.jpg', description: 'Two young sea monsters enjoy a summer of discovery, scooters, and friendship on the Italian Riviera.', genre: 'Animation, Family, Fantasy' },
  { id: '14160', name: 'Up', type: 'movie', year: '2009', rating: '8.0', poster: 'https://image.tmdb.org/t/p/w500/mFvoEwSfLqbcWwFsDjQebn9bzFe.jpg', banner: 'https://image.tmdb.org/t/p/original/hGGC9gKo7CFE3fW07RA587e5kol.jpg', description: 'A balloon-powered house carries an unlikely duo into a colorful wilderness adventure.', genre: 'Animation, Family, Adventure' },
  { id: '92685', name: 'The Owl House', type: 'tv', year: '2020', rating: '8.6', poster: 'https://image.tmdb.org/t/p/w500/zhdy3PcNVE15wj1wrxn45ARZBnx.jpg', banner: 'https://image.tmdb.org/t/p/original/4tS0iyKQBDFqVpVcH21MSJwXZdq.jpg', description: 'A creative teen discovers a magical realm filled with odd creatures, big lessons, and found family.', genre: 'Animation, Family, Fantasy' }
];
