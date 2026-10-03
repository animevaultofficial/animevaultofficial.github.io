import { useEffect, useState } from 'react';
import { fetchTMDBPoster } from '../api/movies';

const NO_ALTERNATE_TITLES = Object.freeze([]);

export default function TMDBPoster({
  title,
  year,
  mediaType = 'movie',
  requireAnimation = false,
  alternateTitles = NO_ALTERNATE_TITLES,
  fallbackSrc = '',
  ...imageProps
}) {
  const [poster, setPoster] = useState(fallbackSrc);
  const alternateTitleKey = JSON.stringify(alternateTitles);

  useEffect(() => {
    let cancelled = false;
    setPoster(fallbackSrc);
    if (!requireAnimation && fallbackSrc?.includes('image.tmdb.org/t/p/')) {
      return () => { cancelled = true; };
    }
    fetchTMDBPoster(title, year, mediaType, requireAnimation, JSON.parse(alternateTitleKey))
      .then(image => {
        if (!cancelled && image) setPoster(image);
      })
      .catch(error => {
        if (!cancelled) console.warn(`[AnimeVault] TMDB poster unavailable for "${title}":`, error);
      });
    return () => { cancelled = true; };
  }, [title, year, mediaType, requireAnimation, alternateTitleKey, fallbackSrc]);

  return <img {...imageProps} src={poster || fallbackSrc || undefined} />;
}
