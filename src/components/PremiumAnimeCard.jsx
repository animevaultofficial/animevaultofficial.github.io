import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, BookOpen, Bell, Share2, PlayCircle } from 'lucide-react';

export default function PremiumAnimeCard({ anime, isFavorite, onToggleFavorite, linkPrefix = '/anime/' }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  const title = anime?.title?.english || anime?.title?.romaji || anime?.title || anime?.name || 'Unknown';
  const image = anime?.coverImage?.extraLarge || anime?.coverImage?.large || anime?.poster || '';
  const banner = anime?.bannerImage || anime?.banner || '';
  const score = anime?.averageScore || anime?.meanScore || 0;
  const genres = anime?.genres || [];
  const trailer = anime?.trailer || null;
  
  // Determine trailer URL
  let trailerUrl = null;
  if (trailer?.site === 'youtube' && trailer?.id) {
    trailerUrl = `https://www.youtube.com/embed/${trailer.id}?autoplay=1&mute=1`;
  }

  return (
    <Link
      to={`${linkPrefix}${anime?.id || anime?.imdb_id}`}
      className="premium-anime-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPlayingPreview(false);
      }}
      onClick={(e) => {
        // Don't navigate if clicking a button inside the card
        if (e.target.closest('button') || e.target.closest('.premium-card-actions')) {
          e.preventDefault();
        }
      }}
    >
      {/* Card Thumbnail */}
      <div className="premium-card-thumbnail">
        {!isPlayingPreview ? (
          <img
            src={image}
            alt={title}
            className="premium-card-image"
          />
        ) : (
          trailerUrl ? (
            <iframe
              src={trailerUrl}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={`${title} trailer`}
              className="premium-card-trailer"
            ></iframe>
          ) : (
            <img
              src={banner || image}
              alt={`${title} preview`}
              className="premium-card-banner"
            />
          )
        )}

        {/* Play Button Overlay */}
        {!isPlayingPreview && (
          <div className="premium-card-overlay">
            <button
              className="premium-play-btn"
              onClick={(e) => {
                e.stopPropagation();
                setIsPlayingPreview(true);
              }}
            >
              <PlayCircle size={48} />
            </button>
          </div>
        )}

        {/* Quick Actions */}
        <div className="premium-card-actions">
          <button
            className={`premium-action-btn ${isFavorite ? 'favorited' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(anime);
            }}
          >
            <Heart size={18} />
          </button>
          <button className="premium-action-btn">
            <BookOpen size={18} />
          </button>
          <button className="premium-action-btn">
            <Bell size={18} />
          </button>
          <button className="premium-action-btn">
            <Share2 size={18} />
          </button>
        </div>

        {/* Score Badge */}
        {score > 0 && (
          <div className="premium-card-score">
            {score}%
          </div>
        )}

        {/* Episode Progress */}
        {anime?.progress > 0 && (
          <div className="premium-card-progress">
            <div
              className="premium-progress-bar"
              style={{ width: `${Math.min(anime.progress, 100)}%` }}
            ></div>
          </div>
        )}
      </div>

      {/* Card Details */}
      <div className="premium-card-details">
        <h3 className="premium-card-title" title={title}>
          {title}
        </h3>
        {genres.length > 0 && (
          <div className="premium-card-genres">
            {genres.slice(0, 3).map((genre, idx) => (
              <span key={idx} className="premium-genre-tag">
                {genre}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Hover Preview Panel */}
      {isHovered && (
        <div className="premium-card-hover-preview">
          <div className="hover-preview-header">
            <h4>{title}</h4>
            <div className="hover-rating">
              {score > 0 && <span className="rating-star">★</span>}
              {score > 0 && <span>{score}%</span>}
            </div>
          </div>

          <p className="hover-synopsis">
            {anime?.description?.replace(/<[^>]*>/g, '').slice(0, 150)}...
          </p>

          {genres.length > 0 && (
            <div className="hover-genres">
              {genres.map((genre, idx) => (
                <span key={idx} className="hover-genre-pill">
                  {genre}
                </span>
              ))}
            </div>
          )}

          <div className="hover-actions-bottom">
            <span className="hover-watch-btn" style={{ pointerEvents: 'none' }}>
              {anime?.progress > 0 ? 'Continue' : 'Watch Now'}
            </span>
            <button
              className="hover-collect-btn"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(anime);
              }}
            >
              {isFavorite ? 'Unsave' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </Link>
  );
}
