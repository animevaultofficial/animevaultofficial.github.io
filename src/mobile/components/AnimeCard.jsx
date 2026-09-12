import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { getImage, getTitle } from '../api/anilist';

export default function AnimeCard({ anime, onClick, loading = false, showEpisodes = true, showRating = true }) {
  const [failed, setFailed] = useState(false);
  if (loading) return <div className="av-anime-card av-skeleton" aria-hidden="true"><div className="av-anime-media" /></div>;
  const title = getTitle(anime) || 'Untitled';
  const image = getImage(anime, 'large');
  return <button type="button" className="av-anime-card av-tap" onClick={() => onClick?.(anime?.id)} aria-label={`Open ${title}`}>
    <span className="av-anime-media">
      {image && !failed ? <img src={image} alt="" loading="lazy" onError={() => setFailed(true)} /> : <span className="av-anime-fallback">🎬</span>}
      {showRating && anime?.averageScore != null && <span className="av-anime-rating"><Star size={9} fill="currentColor" /> {anime.averageScore}%</span>}
      {showEpisodes && anime?.episodes && <span className="av-anime-episodes">{anime.episodes} EP</span>}
    </span>
    <span className="av-anime-info"><strong>{title}</strong><small>{anime?.format || 'Anime'}</small></span>
  </button>;
}
