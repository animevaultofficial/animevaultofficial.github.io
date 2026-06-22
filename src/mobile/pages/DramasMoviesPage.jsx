import React, { useState, useEffect } from 'react';
import { Film, Tv, TrendingUp, Star, Search, X } from 'lucide-react';
import { fetchLatestMovies, fetchLatestTVShows, searchMoviesAndSeries } from '../api/movies';

const GENRES = ['Action', 'Romance', 'Thriller', 'Horror', 'Comedy', 'Drama', 'Sci-Fi', 'Crime', 'Fantasy', 'Mystery', 'Adventure', 'Animation'];

function MediaCard({ item, onClick }) {
  const title = item.title || item.name || 'Unknown';
  const image = item.poster_path ? `https://image.tmdb.org/t/p/w342${item.poster_path}` : null;
  const year = (item.release_date || item.first_air_date || '').split('-')[0];
  const type = item.media_type === 'movie' ? '🎬' : '📺';

  return (
    <div className="gcard" onClick={() => onClick?.(item)}>
      {image ? (
        <img src={image} alt={title} className="gcard-img" />
      ) : (
        <div className="gcard-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', background: 'var(--surface2)' }}>{type}</div>
      )}
      <div className="gcard-title">{title}</div>
      <div style={{ padding: '0 0.5rem 0.5rem', fontSize: '0.62rem', color: 'var(--text3)', display: 'flex', gap: '.35rem', alignItems: 'center' }}>
        <span>{year}</span>
        {item.vote_average ? <span>⭐ {item.vote_average.toFixed(1)}</span> : null}
      </div>
    </div>
  );
}

function HeroCard({ item, onClick }) {
  const title = item.title || item.name || 'Unknown';
  const backdrop = item.backdrop_path ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}` : null;
  return (
    <div className="hero" onClick={() => onClick?.(item)} style={{ background: backdrop ? `linear-gradient(180deg, rgba(3,15,22,.18), rgba(3,15,22,.96)), url(${backdrop}) center/cover` : 'var(--surface2)' }}>
      <div className="hc">
        <div className="hbadge"><TrendingUp size={10} /> Trending</div>
        <div className="htitle">{title}</div>
        <div className="hsub">
          {item.vote_average ? `⭐ ${item.vote_average.toFixed(1)}` : ''}
          {item.release_date ? ` · ${item.release_date.split('-')[0]}` : ''}
          {item.media_type === 'movie' ? ' · Movie' : ' · TV'}
        </div>
      </div>
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
  const [slide, setSlide] = useState(0);

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

  // Auto-slide carousel
  useEffect(() => {
    if (movies.length === 0) return;
    const i = setInterval(() => setSlide(p => (p + 1) % Math.min(5, movies.length)), 6000);
    return () => clearInterval(i);
  }, [movies]);

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

  const displayItems = tab === 'movies' ? movies : tvShows;
  const slides = displayItems.slice(0, 5);

  return (
    <div className="page">
      {/* Hero Carousel */}
      {slides.length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <HeroCard item={slides[slide]} onClick={handleMediaClick} />
          <div className="hdots" style={{ marginTop: '-1.5rem', position: 'relative', zIndex: 3, display: 'flex', gap: 4, justifyContent: 'flex-end', padding: '0 1rem' }}>
            {slides.map((_, i) => (
              <div key={i} className={`hdot ${i === slide ? 'active' : 'inactive'}`} style={{ cursor: 'pointer' }} onClick={() => setSlide(i)} />
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="sec">
        <div className="search-bar" style={{ marginBottom: 0 }}>
          <Search size={16} color="var(--text3)" />
          <input type="text" placeholder="Search movies & shows..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          {searchQuery && <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer' }}><X size={16} /></button>}
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="tbar" style={{ margin: '0 .75rem .75rem' }}>
        {[
          { id: 'movies', label: '🎬 Movies' },
          { id: 'tv', label: '📺 TV Shows' },
        ].map(t => (
          <button key={t.id} className={`titem ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Search Results */}
      {searchQuery ? (
        <div className="sec" style={{ padding: '0 .75rem' }}>
          <div className="shdr"><span className="sttl"><Search size={14} /> Results ({searchResults.length})</span></div>
          {searching ? (
            <div className="hscroll">{[1,2,3,4,5,6].map(i => <div key={i} className="skel shimmer" />)}</div>
          ) : searchResults.length > 0 ? (
            <div className="g3">{searchResults.map(item => <MediaCard key={`${item.media_type}-${item.id}`} item={item} onClick={handleMediaClick} />)}</div>
          ) : (
            <div className="empty compact" style={{ minHeight: 80 }}><p>No results found</p></div>
          )}
        </div>
      ) : (
        <>
          {/* Trending Content */}
          <div className="sec" style={{ padding: '0 .75rem' }}>
            <div className="shdr">
              <span className="sttl"><TrendingUp size={14} /> Trending {tab === 'movies' ? 'Movies' : 'TV Shows'}</span>
            </div>
            {loading ? (
              <div className="hscroll">{[1,2,3,4,5,6].map(i => <div key={i} className="skel shimmer" />)}</div>
            ) : (
              <div className="hscroll">
                {displayItems.map(item => (
                  <div key={item.id} className="card" onClick={() => handleMediaClick(item)}>
                    <img src={item.poster_path ? `https://image.tmdb.org/t/p/w342${item.poster_path}` : '/logo.png'} alt={item.title || item.name} className="card-img" />
                    <div className="card-body">
                      <div className="card-title">{item.title || item.name}</div>
                      <div className="card-sub">{item.vote_average ? `⭐ ${item.vote_average.toFixed(1)}` : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Grid - All items */}
          <div className="sec" style={{ padding: '0 .75rem' }}>
            <div className="shdr">
              <span className="sttl"><Film size={14} /> All {tab === 'movies' ? 'Movies' : 'Shows'}</span>
            </div>
            {loading ? (
              <div className="g3">{[1,2,3,4,5,6].map(i => <div key={i} className="shimmer" style={{ aspectRatio: '2/3', borderRadius: 'var(--radius)' }} />)}</div>
            ) : (
              <div className="g3">
                {displayItems.slice(0, 30).map(item => (
                  <MediaCard key={item.id} item={{ ...item, media_type: tab === 'movies' ? 'movie' : 'tv' }} onClick={handleMediaClick} />
                ))}
              </div>
            )}
          </div>

          {/* Browse by Genre */}
          <div className="sec" style={{ padding: '0 .75rem' }}>
            <div className="shdr"><span className="sttl"><Tv size={14} /> Browse by Genre</span></div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {GENRES.map(g => (
                <span key={g} style={{ background: 'var(--surface)', color: 'var(--text3)', padding: '6px 14px', borderRadius: 20, fontSize: '0.78rem', border: '1px solid var(--border)', fontWeight: 600 }}>{g}</span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}