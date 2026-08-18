import { buildAnimeStreamUrlFromAniList } from '../../utils/animeStreamingServer';

/**
 * Builds video player sources using the exact MegaFlix streaming setup as the web version.
 * @param {number|string} animeId - AniList anime ID
 * @param {number} episodeNumber - Episode number
 * @param {string} language - 'sub' or 'dub'
 */
export function getMobileStreamSources(animeId, episodeNumber, language = 'sub') {
  if (!animeId || !episodeNumber) return [];

  const url = buildAnimeStreamUrlFromAniList(animeId, episodeNumber, language);

  return [
    {
      url,
      type: 'hls',
      serverName: 'MegaFlix',
      priority: 1000,
    },
  ];
}
