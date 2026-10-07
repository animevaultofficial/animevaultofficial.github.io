import { useEffect, useMemo, useState } from 'react';
import { getAniPMSeries, getAniPMTitle } from '../api/anipm';
import { fetchAnimeEpisodeThumbnails, fetchTMDBBackdrop } from '../api/movies';
import { fetchEpisodeThumbnails } from '../api/jikan';
import { isBlockedForProfile } from '../utils/ageRating';
import { withTimeout } from '../utils/withTimeout';

export const firstValue = (...values) => values.find(value => value !== undefined && value !== null && value !== '');

export function numericValue(...values) {
  const value = firstValue(...values);
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  if (value && typeof value === 'object') {
    return numericValue(value.total, value.count, value.episodes);
  }
  return undefined;
}

export function textValue(value) {
  if (Array.isArray(value)) return value.map(item => textValue(item)).filter(Boolean);
  if (value && typeof value === 'object') return firstValue(value.name, value.title, value.label, value.value);
  return value;
}

export function normalizeList(value) {
  if (!Array.isArray(value)) return [];
  return value.map(textValue).filter(Boolean);
}

export function normalizeAnime(titleData, seriesData, id) {
  const episodeList = seriesData?.episodeList || titleData?.episodeList || [];
  const rawGenres = titleData?.genres || titleData?.genre || seriesData?.genres || seriesData?.genre || [];
  const related = titleData?.related || titleData?.relatedTitles || titleData?.relations || titleData?.recommendations
    || seriesData?.related || seriesData?.relatedTitles || [];

  return {
    id,
    title: firstValue(titleData?.title, seriesData?.title) || 'Anime',
    nativeTitle: firstValue(titleData?.nativeTitle, titleData?.native, titleData?.japaneseTitle, seriesData?.nativeTitle),
    poster: firstValue(titleData?.poster, titleData?.posterImage, titleData?.coverImage, titleData?.image, seriesData?.poster, seriesData?.posterImage),
    banner: firstValue(titleData?.banner, titleData?.bannerImage, titleData?.backdrop, titleData?.backdropImage, titleData?.coverImage?.extraLarge, seriesData?.banner, seriesData?.bannerImage, seriesData?.backdrop),
    synopsis: firstValue(titleData?.synopsis, titleData?.description, seriesData?.synopsis, seriesData?.description) || '',
    score: firstValue(titleData?.score, titleData?.rating, titleData?.averageScore, seriesData?.score, seriesData?.rating),
    year: firstValue(titleData?.year, titleData?.releaseYear, titleData?.seasonYear, seriesData?.year),
    type: firstValue(titleData?.type, titleData?.format, seriesData?.type) || 'TV',
    status: firstValue(titleData?.status, seriesData?.status),
    episodesCount: numericValue(titleData?.episodes, titleData?.episodeCount, seriesData?.episodes, seriesData?.episodeCount, episodeList.length),
    duration: firstValue(titleData?.duration, seriesData?.duration),
    genres: normalizeList(rawGenres),
    studio: firstValue(titleData?.studio, titleData?.studios?.[0]?.name, titleData?.studios?.[0], seriesData?.studio),
    aired: firstValue(titleData?.aired, titleData?.airing, seriesData?.aired),
    season: firstValue(titleData?.season, seriesData?.season),
    rating: firstValue(titleData?.contentRating, titleData?.ratingLabel, titleData?.rating_label, seriesData?.contentRating),
    views: firstValue(titleData?.views, titleData?.viewCount, seriesData?.views),
    anilistId: firstValue(titleData?.anilistId, seriesData?.anilistId, id),
    malId: firstValue(titleData?.malId, seriesData?.malId),
    episodeList,
    related: Array.isArray(related) ? related : [],
    titleData,
    seriesData,
  };
}

export function getEpisodeImage(ep, thumbnails, poster) {
  const tmdbImage = thumbnails[Number(ep?.number)];
  if (tmdbImage) return tmdbImage;
  const posterUrl = typeof poster === 'string' ? poster.split('?')[0].toLowerCase() : '';
  return [ep?.image, ep?.thumbnail, ep?.thumbnailUrl, ep?.imageUrl]
    .find(image => typeof image === 'string' && image && image.split('?')[0].toLowerCase() !== posterUrl);
}

export function formatScore(score) {
  if (score === undefined || score === null || score === '') return null;
  const n = Number(score);
  return Number.isFinite(n) ? (n > 10 ? (n / 10).toFixed(1) : n.toFixed(1)) : String(score);
}

export function useAnimeDetails(id, activeSubAccount) {
  const [titleData, setTitleData] = useState(null);
  const [seriesData, setSeriesData] = useState(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState('');
  const [tmdbBackdrop, setTmdbBackdrop] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!id) {
        setError('Anime ID is missing.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const [titleResult, seriesResult] = await withTimeout(
          Promise.allSettled([getAniPMTitle(id), getAniPMSeries(id)]),
          6000,
          'Anime details did not load within 6 seconds.'
        );

        if (cancelled) return;

        const title = titleResult?.status === 'fulfilled' ? titleResult.value : null;
        const series = seriesResult?.status === 'fulfilled' ? seriesResult.value : null;

        if (!title && !series) {
          setError('Unable to load this anime right now.');
          setLoading(false);
          return;
        }

        const normalized = normalizeAnime(title, series, id);
        if (isBlockedForProfile(normalized.seriesData || normalized.titleData || normalized, activeSubAccount)) {
          setError('This title is blocked for Kids profiles.');
          setLoading(false);
          return;
        }

        setTitleData(title);
        setSeriesData(series);
        setTmdbBackdrop('');
        setLoading(false);
        window.scrollTo({ top: 0, behavior: 'instant' });

        void fetchTMDBBackdrop(
          normalized.title,
          normalized.year,
          normalized.type === 'MOVIE' ? 'movie' : 'tv',
          true,
          [normalized.nativeTitle]
        ).then(backdrop => {
          if (!cancelled && backdrop) setTmdbBackdrop(backdrop);
        }).catch(backdropError => {
          if (!cancelled) console.warn('[AnimeVault] Anime backdrop unavailable:', backdropError);
        });

        if (normalized.episodeList.length) {
          const applyThumbnails = thumbnails => {
            if (cancelled || !Object.keys(thumbnails).length) return;
            const enrich = source => source ? {
              ...source,
              episodeList: (source.episodeList || []).map(ep => {
                const image = getEpisodeImage(ep, thumbnails, normalized.poster);
                return image ? { ...ep, image, thumbnail: image } : ep;
              }),
            } : source;
            setTitleData(enrich(title));
            setSeriesData(enrich(series));
          };

          void fetchAnimeEpisodeThumbnails(
            normalized.title,
            normalized.year,
            normalized.episodeList.length,
            [normalized.nativeTitle],
            applyThumbnails
          ).catch(thumbnailError => {
            if (!cancelled) console.warn('[AnimeVault] TMDB episode thumbnails unavailable:', thumbnailError?.message || thumbnailError);
          });

          if (normalized.malId) {
            void fetchEpisodeThumbnails(normalized.malId).then(applyThumbnails).catch(thumbnailError => {
              if (!cancelled) console.warn('[AnimeVault] MyAnimeList episode thumbnails unavailable:', thumbnailError?.message || thumbnailError);
            });
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError?.message || 'Unable to load this anime right now.');
          setLoading(false);
        }
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [activeSubAccount, id, reloadKey]);

  const anime = useMemo(() => normalizeAnime(titleData, seriesData, id), [titleData, seriesData, id]);
  const firstPlayableEpisode = useMemo(
    () => anime.episodeList.find(ep => ep?.available?.sub || ep?.available?.dub) || anime.episodeList[0],
    [anime.episodeList]
  );

  return {
    anime,
    titleData,
    seriesData,
    loading,
    error,
    retry: () => setReloadKey(value => value + 1),
    tmdbBackdrop,
    firstPlayableEpisode,
  };
}
