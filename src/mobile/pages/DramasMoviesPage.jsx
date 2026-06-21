import React, { useState, useEffect } from 'react';
import { fetchLatestMovies, fetchLatestTVShows, searchMoviesAndSeries } from '../api/movies';

const GENRES = ['Action', 'Romance', 'Thriller', 'Horror', 'Comedy', 'Drama', 'Sci-Fi', 'Crime', 'Fantasy', 'Mystery'];

function MediaCard({ item, onClick }) {
  const title = item.title || item.name || 'Unknown';
  const image = item.poster_path ? `https://image.tmdb.org/t/p/w342${item.poster_path}` : null;
  const year = (item.release_date || item.first_air_date || '').split('-')[0];
  const type = item.media_type === 'movie' ? '🎬' : '📺';

  return (
    <div className="grid-card" onClick={() => onClick?.(item)}>
      {image ? (
        <img src={image} alt={title} className="grid-card-image" style={{ objectFit: 'cover' }} />
      ) : (
        <div className="grid-card-image loading-shimmer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>{type}</div>
      )}
      <div className="grid-card-title">{title}</div>
      <div style={{ padding: '0 0.5rem 0.4rem', fontSize: '0.65rem', color: '#64748b' }}>{year} {item.vote_average ? `· ⭐ ${item.vote_average.toFixed(1)}` : ''}</div>
    </div>
  );
}

export default function DramasMoviesPage({ navigate }) {
  const [tab, setTab] = useState('movies');
  const [movies, setMovies] = useState([]);
  const [tvShows, setTvShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    async function load() {
      const [movieData, tvData] = await Promise.all([
        fetchLatestMovies(),
        fetchLatestTVShows()
      ]);
      setMovies(movieData?.results || []);
      setTvShows(tvData?.results || []);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      const results = await searchMoviesAndSeries(searchQuery);
      setSearchResults(results);
      setSearching(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleMediaClick = (item) => {
    const mediaType = item.media_type === 'movie' ? 'movie' : 'tv';
    navigate('drama-detail', { id: item.id, mediaType, title: item.title || item.name, poster: item.poster_path });
  };

  return (
    <div className="mobile-content">
      {/* Search */}
      <div className="search-bar">
        <span>🔍</span>
        <input type="text" placeholder="Search movies & shows..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ flex: 1, background: 'none', border: 'none', color: '#fff', fontSize: '0.9rem', outline: 'none' }} />
        {searchQuery && <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>✕</button>}
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 4 }}>
        {[
          { id: 'movies', label: '🎬 Movies' },
          { id: 'tv', label: '📺 TV Shows' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
              background: tab === t.id ? 'var(--brand-color)' : 'transparent', color: tab === t.id ? '#fff' : '#94a3b8' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Search Results */}
      {searchQuery && (
        <div className="section">
          <div className="section-header"><span className="section-title">Results ({searchResults.length})</span></div>
          {searching ? (
            <div style={{ textAlign: 'center', padding: '1rem', color: '#64748b' }}>Searching...</div>
          ) : (
            <div className="grid-scroll">
              {searchResults.map(item => <MediaCard key={`${item.media_type}-${item.id}`} item={item} onClick={handleMediaClick} />)}
            </div>
          )}
        </div>
      )}

      {/* Movies */}
      {!searchQuery && tab === 'movies' && (
        <div className="section">
          <div className="section-header"><span className="section-title">Trending Movies</span></div>
          {loading ? (
            <div className="grid-scroll">
              {[1,2,3,4,5,6].map(i => <div key={i} className="grid-card"><div className="grid-card-image loading-shimmer" /></div>)}
            </div>
          ) : (
            <div className="grid-scroll">
              {movies.map(item => <MediaCard key={item.id} item={{ ...item, media_type: 'movie' }} onClick={handleMediaClick} />)}
            </div>
          )}
        </div>
      )}

      {/* TV Shows */}
      {!searchQuery && tab === 'tv' && (
        <div className="section">
          <div className="section-header"><span className="section-title">Trending TV Shows</span></div>
          {loading ? (
            <div className="grid-scroll">
              {[1,2,3,4,5,6].map(i => <div key={i} className="grid-card"><div className="grid-card-image loading-shimmer" /></div>)}
            </div>
          ) : (
            <div className="grid-scroll">
              {tvShows.map(item => <MediaCard key={item.id} item={{ ...item, media_type: 'tv' }} onClick={handleMediaClick} />)}
            </div>
          )}
        </div>
      )}

      {/* Genre tags */}
      {!searchQuery && (
        <div className="section">
          <div className="section-header"><span className="section-title">Browse by Genre</span></div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {GENRES.map(g => (
              <span key={g} style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', padding: '6px 14px', borderRadius: 20, fontSize: '0.8rem', border: '1px solid rgba(255,255,255,0.08)' }}>{g}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}