import React, { useState, useEffect } from 'react';
import { TrendingUp, Flame, Clock, Sparkles } from 'lucide-react';
import { fetchHomeData, getTitle, getImage } from '../api/anilist';
import { getContinueWatching } from '../api/storage';

function AnilistImage({ src, alt, className, fallback = '🎬' }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  if (!src || failed) {
    return <div className={`${className} loading-shimmer`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>{fallback}</div>;
  }
  return (
    <>
      {!loaded && <div className={`${className} loading-shimmer`} />}
      <img src={src} alt={alt} className={className} onLoad={() => setLoaded(true)} onError={() => setFailed(true)} style={{ display: loaded ? 'block' : 'none' }} loading="lazy" />
    </>
  );
}

function AnimeCard({ media, onClick }) {
  const title = getTitle(media);
  const image = getImage(media, 'large');
  const score = media.averageScore;
  return (
    <div className="anime-card" onClick={() => onClick?.(media.id)}>
      <AnilistImage src={image} alt={title} className="anime-card-img" />
      <div className="anime-card-info">
        <div className="anime-card-title">{title}</div>
        <div className="anime-card-sub">{score ? `⭐ ${score}%` : media.format || ''}</div>
      </div>
    </div>
  );
}

function GridCard({ media, onClick }) {
  const title = getTitle(media);
  const image = getImage(media);
  return (
    <div className="grid-card" onClick={() => onClick?.(media.id)}>
      <AnilistImage src={image} alt={title} className="grid-card-img" fallback="🎬" />
      <div className="grid-card-title">{title}</div>
    </div>
  );
}

export default function HomePage({ navigate }) {
  const nav = (id) => navigate('anime-detail', { id });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const continueWatching = getContinueWatching();

  useEffect(() => {
    fetchHomeData()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mobile-content">
        <div className="section">
          <div className="section-header"><span className="section-title">Trending Now</span></div>
          <div className="h-scroll">
            {[1,2,3,4,5].map(i => <div key={i} className="skel-card loading-shimmer" />)}
          </div>
        </div>
        <div className="section">
          <div className="section-header"><span className="section-title">Most Popular</span></div>
          <div className="h-scroll">
            {[1,2,3,4,5].map(i => <div key={i} className="skel-card loading-shimmer" />)}
          </div>
        </div>
      </div>
    );
  }

  const trending = data?.trending?.media?.slice(0, 15) || [];
  const popular = data?.popular?.media || [];
  const upcoming = data?.upcoming?.media || [];
  const heroItem = trending[0];

  return (
    <div className="mobile-content">
      {/* Hero Banner */}
      {heroItem && (
        <div className="hero-banner" onClick={() => nav(heroItem.id)}>
          <div className="hero-banner-content">
            <div className="hero-badge"><TrendingUp size={10} /> Trending #1</div>
            <div className="hero-title">{getTitle(heroItem)}</div>
            <div className="hero-subtitle">
              {heroItem.averageScore ? `⭐ ${heroItem.averageScore}%` : ''}
              {heroItem.episodes ? ` · ${heroItem.episodes} eps` : ''}
              {heroItem.seasonYear ? ` · ${heroItem.seasonYear}` : ''}
            </div>
          </div>
        </div>
      )}

      {/* Continue Watching */}
      {continueWatching.length > 0 && (
        <div className="section">
          <div className="section-header">
            <span className="section-title"><Clock size={14} /> Continue Watching</span>
          </div>
          <div className="h-scroll">
            {continueWatching.map(item => (
              <div key={item.id} className="anime-card" onClick={() => nav(item.id)}>
                <AnilistImage src={item.image} alt={item.title} className="anime-card-img" />
                <div className="anime-card-info">
                  <div className="anime-card-title">{item.title}</div>
                  <div className="anime-card-sub" style={{ color: 'var(--brand)' }}>▶ Continue</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trending Now */}
      {trending.length > 0 && (
        <div className="section">
          <div className="section-header">
            <span className="section-title"><Flame size={14} /> Trending Now</span>
            <span className="section-link" onClick={() => navigate('search')}>See all</span>
          </div>
          <div className="h-scroll">
            {trending.map(media => <AnimeCard key={media.id} media={media} onClick={nav} />)}
          </div>
        </div>
      )}

      {/* Most Popular */}
      {popular.length > 0 && (
        <div className="section">
          <div className="section-header">
            <span className="section-title"><Sparkles size={14} /> Most Popular</span>
            <span className="section-link" onClick={() => navigate('search')}>See all</span>
          </div>
          <div className="h-scroll">
            {popular.map(media => <AnimeCard key={media.id} media={media} onClick={nav} />)}
          </div>
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="section">
          <div className="section-header">
            <span className="section-title">Upcoming</span>
          </div>
          <div className="grid-3">
            {upcoming.slice(0, 9).map(media => <GridCard key={media.id} media={media} onClick={nav} />)}
          </div>
        </div>
      )}
    </div>
  );
}