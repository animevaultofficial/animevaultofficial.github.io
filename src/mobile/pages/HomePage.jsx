import React, { useState, useEffect } from 'react';
import { TrendingUp, Flame, Clock, Sparkles, Star, Play, Heart, ChevronRight, Calendar } from 'lucide-react';
import { fetchHomeData, getTitle, getImage } from '../api/anilist';

const ANILIST_URL = 'https://graphql.anilist.co';
const SEASONAL_QUERY = `
  query ($season: MediaSeason, $year: Int) {
    Page(page: 1, perPage: 20) {
      media(season: $season, seasonYear: $year, type: ANIME, isAdult: false, sort: POPULARITY_DESC) {
        id
        title { romaji english }
        coverImage { large extraLarge }
        averageScore
        format
        episodes
        seasonYear
      }
    }
  }
`;
async function fetchAnimeBySeason(season, year) {
  try {
    const res = await fetch(ANILIST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: SEASONAL_QUERY, variables: { season, year } })
    });
    const json = await res.json();
    return json.data?.Page?.media || [];
  } catch { return []; }
}
import { getContinueWatching, isFavorite, toggleFavorite } from '../api/storage';

const SEASONS = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];
const CURRENT_YEAR = new Date().getFullYear();

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
  const fav = isFavorite(media.id);
  return (
    <div className="anime-card" onClick={() => onClick?.(media.id)}>
      <div style={{ position: 'relative' }}>
        <AnilistImage src={image} alt={title} className="anime-card-img" />
        {score && <span className="stat-pill" style={{ position: 'absolute', top: 4, left: 4, fontSize: '0.55rem', padding: '2px 6px' }}>⭐ {score}%</span>}
        {media.episodes && <span style={{ position: 'absolute', bottom: 4, right: 4, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: '0.55rem', padding: '1px 6px', borderRadius: 4 }}>{media.episodes}EP</span>}
      </div>
      <div className="anime-card-info">
        <div className="anime-card-title">{title}</div>
        <div className="anime-card-sub">{media.format || ''}</div>
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
  const [seasonal, setSeasonal] = useState([]);
  const [seasonalLoading, setSeasonalLoading] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState('SPRING');
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [activeSlide, setActiveSlide] = useState(0);
  const continueWatching = getContinueWatching();

  useEffect(() => {
    fetchHomeData()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!data) return;
    const interval = setInterval(() => {
      const trending = data?.trending?.media || [];
      setActiveSlide((prev) => (prev + 1) % Math.min(5, trending.length));
    }, 6000);
    return () => clearInterval(interval);
  }, [data]);

  useEffect(() => {
    async function loadSeasonal() {
      setSeasonalLoading(true);
      try {
        const data = await fetchAnimeBySeason(selectedSeason, selectedYear);
        setSeasonal(data || []);
      } catch {}
      setSeasonalLoading(false);
    }
    loadSeasonal();
  }, [selectedSeason, selectedYear]);

  if (loading) {
    return (
      <div className="mobile-content">
        <div className="loading-shimmer" style={{ width: '100%', height: 200, borderRadius: 16, marginBottom: 16 }} />
        <div className="section"><div className="section-header"><span className="section-title">Trending Now</span></div><div className="h-scroll">{[1,2,3,4,5].map(i => <div key={i} className="skel-card loading-shimmer" />)}</div></div>
        <div className="section"><div className="section-header"><span className="section-title">Most Popular</span></div><div className="h-scroll">{[1,2,3,4,5].map(i => <div key={i} className="skel-card loading-shimmer" />)}</div></div>
      </div>
    );
  }

  const trending = data?.trending?.media?.slice(0, 15) || [];
  const popular = data?.popular?.media || [];
  const upcoming = data?.upcoming?.media || [];
  const featuredSlides = trending.slice(0, 5);

  return (
    <div className="mobile-content">
      {/* Hero Carousel */}
      {featuredSlides.length > 0 && (
        <div className="hero-banner" onClick={() => nav(featuredSlides[activeSlide]?.id)}>
          <div className="hero-banner-content">
            <div className="hero-badge"><TrendingUp size={10} /> #{activeSlide + 1} Trending</div>
            <div className="hero-title">{getTitle(featuredSlides[activeSlide])}</div>
            <div className="hero-subtitle">
              {featuredSlides[activeSlide]?.averageScore ? `⭐ ${featuredSlides[activeSlide].averageScore}%` : ''}
              {featuredSlides[activeSlide]?.episodes ? ` · ${featuredSlides[activeSlide].episodes} eps` : ''}
              {featuredSlides[activeSlide]?.seasonYear ? ` · ${featuredSlides[activeSlide].seasonYear}` : ''}
            </div>
          </div>
          {/* Slide dots */}
          <div style={{ position: 'absolute', bottom: 8, right: 12, zIndex: 3, display: 'flex', gap: 4 }}>
            {featuredSlides.map((_, i) => (
              <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i === activeSlide ? 'var(--brand)' : 'rgba(255,255,255,0.3)' }} />
            ))}
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

      {/* Seasonal */}
      <div className="section">
        <div className="section-header">
          <span className="section-title"><Calendar size={14} /> Seasonal</span>
        </div>
        <div className="h-scroll" style={{ marginBottom: 8 }}>
          {SEASONS.map(s => (
            <button key={s} onClick={() => setSelectedSeason(s)}
              style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem',
                background: selectedSeason === s ? 'var(--brand)' : 'var(--border)', color: selectedSeason === s ? '#fff' : 'var(--text3)', border: 'none', fontFamily: 'var(--font)' }}>
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
          <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}
            style={{ flexShrink: 0, padding: '6px 10px', borderRadius: 20, background: 'var(--border)', color: 'var(--text)', border: 'none', fontSize: '0.75rem', fontWeight: 600, fontFamily: 'var(--font)' }}>
            {[CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2, CURRENT_YEAR - 3].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        {seasonalLoading ? (
          <div className="h-scroll">{[1,2,3,4,5].map(i => <div key={i} className="skel-card loading-shimmer" />)}</div>
        ) : seasonal.length > 0 ? (
          <div className="h-scroll">
            {seasonal.map(media => <AnimeCard key={media.id} media={media} onClick={nav} />)}
          </div>
        ) : null}
      </div>

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