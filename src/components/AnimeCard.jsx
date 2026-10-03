import { Play, Star, Heart } from 'lucide-react';
import { FocusableLink } from './FocusableWrapper';
import TMDBPoster from './TMDBPoster';

function AnimeCard({ anime, isFavorite, onToggleFavorite, linkPrefix = '/anime/' }) {
  const title = anime.title?.english || anime.title?.romaji || anime.title?.native || 'Unknown Title';
  const score = anime.averageScore || anime.meanScore;
  const year = anime.seasonYear;
  const episodes = anime.episodes;
  const chapters = anime.chapters;
  const coverImage = anime.coverImage?.extraLarge || anime.coverImage?.large || anime.coverImage?.medium || anime.coverImage?.original || '';

  function handleFavoriteClick(e) { e.preventDefault(); e.stopPropagation(); onToggleFavorite(anime); }
  function handleImageError(e) { e.currentTarget.hidden = true; }

  return (
    <FocusableLink to={`${linkPrefix}${anime.id}`} className="anime-card-v2" title={title}>
      <div className="card-media">
        <TMDBPoster
          src={coverImage}
          alt={title}
          title={title}
          year={year}
          mediaType={anime.format === 'MOVIE' ? 'movie' : 'tv'}
          requireAnimation
          alternateTitles={[anime.title?.romaji, anime.title?.native, anime.title?.english]}
          fallbackSrc={coverImage}
          loading="lazy"
          decoding="async"
          onError={handleImageError}
        />
        <div className="card-overlay"><div className="play-icon-wrapper"><Play fill="white" size={24} /></div></div>
        <button className={`card-favorite-btn-v2 ${isFavorite ? 'active' : ''}`} onClick={handleFavoriteClick} aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}><Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} /></button>
        <div className="card-badges">
          {score && <span className="badge-score"><Star size={12} fill="currentColor" /> {score}%</span>}
          {episodes && <span className="badge-ep">{episodes} EP</span>}
          {!episodes && chapters && <span className="badge-ep" style={{ background: 'rgba(0, 255, 136, 0.2)', color: '#00ff88' }}>{chapters} CH</span>}
        </div>
      </div>
      <div className="card-info"><h3 className="card-title">{title}</h3><div className="card-meta"><span>{anime.format || 'Anime'}</span>{year && <><span className="dot">•</span><span>{year}</span></>}</div></div>
    </FocusableLink>
  );
}
export default AnimeCard;
