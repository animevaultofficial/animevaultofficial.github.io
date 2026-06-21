import React, { useState, useEffect, useRef } from 'react';
import './mobile.css';

const ANILIST_API = 'https://graphql.anilist.co';

const TRENDING_QUERY = `
  query ($page: Int, $perPage: Int) {
    trending: Page(page: $page, perPage: $perPage) {
      media(sort: TRENDING_DESC, type: ANIME, isAdult: false) {
        id
        title { romaji english }
        coverImage { large extraLarge }
        episodes
        format
        averageScore
        seasonYear
      }
    }
    popular: Page(page: 1, perPage: 20) {
      media(sort: POPULARITY_DESC, type: ANIME, isAdult: false) {
        id
        title { romaji english }
        coverImage { large }
        episodes
        format
        averageScore
      }
    }
    upcoming: Page(page: 1, perPage: 20) {
      media(sort: POPULARITY_DESC, type: ANIME, status: NOT_YET_RELEASED, isAdult: false) {
        id
        title { romaji english }
        coverImage { large }
        format
        seasonYear
      }
    }
  }
`;

function AnilistImage({ src, alt, className, fallback = '🎬' }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (!src || failed) {
    return (
      <div className={`${className} loading-shimmer`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
        {fallback}
      </div>
    );
  }

  return (
    <>
      {!loaded && <div className={`${className} loading-shimmer`} />}
      <img
        src={src}
        alt={alt}
        className={className}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        style={{ display: loaded ? 'block' : 'none' }}
        loading="lazy"
      />
    </>
  );
}

function SplashScreen() {
  return (
    <div className="splash-screen">
      <img src="/logo.png" alt="AnimeVault" className="splash-logo" />
      <div className="splash-title">AnimeVault</div>
      <div className="splash-subtitle">Your ultimate anime hub</div>
    </div>
  );
}

function AnimeCard({ media, index }) {
  const title = media.title?.english || media.title?.romaji || 'Untitled';
  const image = media.coverImage?.extraLarge || media.coverImage?.large;
  const subtitle = media.averageScore ? `${media.averageScore}%` : media.format || '';

  return (
    <div className="anime-card scroll-item">
      <AnilistImage src={image} alt={title} className="anime-card-image" />
      <div className="anime-card-info">
        <div className="anime-card-title">{title}</div>
        <div className="anime-card-sub">{subtitle}</div>
      </div>
    </div>
  );
}

function GridCard({ media }) {
  const title = media.title?.english || media.title?.romaji || 'Untitled';
  const image = media.coverImage?.large;

  return (
    <div className="grid-card">
      <AnilistImage src={image} alt={title} className="grid-card-image" fallback="🎬" />
      <div className="grid-card-title">{title}</div>
    </div>
  );
}

function HomePage({ data }) {
  if (!data) {
    return (
      <div className="mobile-content">
        <div className="section">
          <div className="section-header"><span className="section-title">Trending Now</span></div>
          <div className="horizontal-scroll">
            {[1,2,3,4,5].map(i => <div key={i} className="skeleton-card loading-shimmer" />)}
          </div>
        </div>
        <div className="section">
          <div className="section-header"><span className="section-title">Popular</span></div>
          <div className="horizontal-scroll">
            {[1,2,3,4,5].map(i => <div key={i} className="skeleton-card loading-shimmer" />)}
          </div>
        </div>
      </div>
    );
  }

  const trending = data.trending?.media?.slice(0, 15) || [];
  const popular = data.popular?.media || [];
  const upcoming = data.upcoming?.media || [];
  const heroItem = trending[0];

  return (
    <div className="mobile-content">
      {/* Hero Banner */}
      {heroItem && (
        <div className="hero-banner">
          <div className="hero-banner-content">
            <div className="hero-badge">Trending #1</div>
            <div className="hero-title">
              {heroItem.title?.english || heroItem.title?.romaji || 'Top Anime'}
            </div>
            <div className="hero-subtitle">
              {heroItem.averageScore ? `${heroItem.averageScore}% Score` : ''}
              {heroItem.episodes ? ` · ${heroItem.episodes} eps` : ''}
              {heroItem.seasonYear ? ` · ${heroItem.seasonYear}` : ''}
            </div>
          </div>
        </div>
      )}

      {/* Trending Now */}
      {trending.length > 0 && (
        <div className="section">
          <div className="section-header">
            <span className="section-title">Trending Now</span>
          </div>
          <div className="horizontal-scroll">
            {trending.map((media, i) => (
              <AnimeCard key={media.id} media={media} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Popular Anime */}
      {popular.length > 0 && (
        <div className="section">
          <div className="section-header">
            <span className="section-title">Most Popular</span>
          </div>
          <div className="horizontal-scroll">
            {popular.map(media => (
              <AnimeCard key={media.id} media={media} />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="section">
          <div className="section-header">
            <span className="section-title">Upcoming</span>
          </div>
          <div className="grid-scroll">
            {upcoming.slice(0, 9).map(media => (
              <GridCard key={media.id} media={media} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(ANILIST_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              query ($search: String) {
                Page(page: 1, perPage: 20) {
                  media(search: $search, type: ANIME, isAdult: false) {
                    id
                    title { romaji english }
                    coverImage { large }
                    format
                    episodes
                    averageScore
                  }
                }
              }
            `,
            variables: { search: query }
          })
        });
        const json = await res.json();
        setResults(json.data?.Page?.media || []);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  return (
    <div className="mobile-content">
      <div className="search-bar">
        <span>🔍</span>
        <input
          type="text"
          placeholder="Search anime..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            ✕
          </button>
        )}
      </div>

      {loading && (
        <div className="section">
          <div className="horizontal-scroll">
            {[1,2,3,4,5].map(i => <div key={i} className="skeleton-card loading-shimmer" />)}
          </div>
        </div>
      )}

      {results.length > 0 && !loading && (
        <div className="section">
          <div className="grid-scroll">
            {results.map(media => (
              <GridCard key={media.id} media={media} />
            ))}
          </div>
        </div>
      )}

      {!loading && query && results.length === 0 && (
        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
          No results found for "{query}"
        </div>
      )}
    </div>
  );
}

function ProfilePage() {
  return (
    <div className="mobile-content">
      <div style={{ textAlign: 'center', padding: '2rem 0' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎬</div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>AnimeVault</h2>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          Your ultimate anime streaming experience
        </p>
        <div style={{
          background: 'rgba(255,26,117,0.1)',
          border: '1px solid rgba(255,26,117,0.3)',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '1rem',
          textAlign: 'left'
        }}>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.75rem' }}>⚡ Features</div>
          <div style={{ fontSize: '0.8rem', marginBottom: '0.5rem' }}>• 10,000+ Anime & Dramas</div>
          <div style={{ fontSize: '0.8rem', marginBottom: '0.5rem' }}>• HD Streaming</div>
          <div style={{ fontSize: '0.8rem', marginBottom: '0.5rem' }}>• Weekly Schedule</div>
          <div style={{ fontSize: '0.8rem', marginBottom: '0.5rem' }}>• Personal Collections</div>
          <div style={{ fontSize: '0.8rem' }}>• Community Features</div>
        </div>
        <p style={{ color: '#64748b', fontSize: '0.75rem' }}>
          Sign in to sync your collections across devices
        </p>
      </div>
    </div>
  );
}

export default function AppMobile() {
  const [page, setPage] = useState('home');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(ANILIST_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: TRENDING_QUERY,
            variables: { page: 1, perPage: 15 }
          })
        });
        const json = await res.json();
        setData(json.data);
      } catch (err) {
        console.error('Failed to fetch anime data:', err);
      } finally {
        setTimeout(() => setLoading(false), 1200);
      }
    }
    fetchData();
  }, []);

  const navItems = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'search', label: 'Search', icon: '🔍' },
    { id: 'profile', label: 'About', icon: '👤' },
  ];

  return (
    <>
      {loading && <SplashScreen />}
      <div className="mobile-app" style={{ opacity: loading ? 0 : 1, transition: 'opacity 0.3s ease' }}>
        {/* Header */}
        <header className="mobile-header">
          <div className="mobile-header-left">
            <img src="/logo.png" alt="AnimeVault" className="mobile-logo" />
            <span className="mobile-brand">AnimeVault</span>
          </div>
          <div className="mobile-header-right">
            <button className="header-icon-btn" onClick={() => setPage('search')}>
              🔍
            </button>
          </div>
        </header>

        {/* Page Content */}
        {page === 'home' && <HomePage data={data} />}
        {page === 'search' && <SearchPage />}
        {page === 'profile' && <ProfilePage />}

        {/* Bottom Navigation */}
        <nav className="bottom-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`bottom-nav-item ${page === item.id ? 'active' : ''}`}
              onClick={() => setPage(item.id)}
            >
              <span className="bottom-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}