import React, { useEffect, useState } from 'react';
import { Search, X, TrendingUp, Star, Sparkles, Film, Tv } from 'lucide-react';
import { fetchLatestMovies, fetchLatestTVShows, searchMoviesAndSeries } from '../api/movies';

function titleOf(item) {
  return item?.title || item?.name || 'Unknown';
}

function imageOf(item, size = 'w342') {
  return item?.poster_path ? `https://image.tmdb.org/t/p/${size}${item.poster_path}` : null;
}

function Poster({ item, onClick }) {
  const title = titleOf(item);
  const image = imageOf(item);
  const type = item?.media_type === 'movie' ? 'Movie' : 'Drama / Show';
  const date = item?.release_date || item?.first_air_date || '';
  const year = date ? date.slice(0, 4) : '';
  const score = Number(item?.vote_average);

  return (
    <button className="av-explore-card" type="button" onClick={() => onClick(item)} aria-label={`Open ${title}`}>
      <div className="av-explore-poster">
        {image ? <img src={image} alt={title} loading="lazy" /> : <div className="av-explore-fallback">AV</div>}
        {Number.isFinite(score) && score > 0 && <span className="av-explore-score"><Star size={9} fill="currentColor" />{score.toFixed(1)}</span>}
      </div>
      <strong>{title}</strong>
      <small>{type}{year ? ` · ${year}` : ''}</small>
    </button>
  );
}

export default function SearchPage({ navigate }) {
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [results, setResults] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [history, setHistory] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('av_media_search_history') || '[]');
      return Array.isArray(saved) ? saved.slice(0, 8) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [movies, tv] = await Promise.all([fetchLatestMovies(), fetchLatestTVShows()]);
        const movieItems = Array.isArray(movies?.results) ? movies.results.map(item => ({ ...item, media_type: 'movie' })) : [];
        const tvItems = Array.isArray(tv?.results) ? tv.results.map(item => ({ ...item, media_type: 'tv' })) : [];
        if (!cancelled) setTrending([...movieItems, ...tvItems]);
      } catch (error) {
        console.warn('[AnimeVault Mobile] search discovery failed:', error?.message || error);
        if (!cancelled) setTrending([]);
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const executeSearch = async (value = query) => {
    const q = String(value || '').trim();
    if (!q) {
      setSubmittedQuery('');
      setResults([]);
      return;
    }

    setSubmittedQuery(q);
    setLoading(true);
    try {
      const items = await searchMoviesAndSeries(q);
      setResults(Array.isArray(items) ? items.filter(Boolean) : []);
      setHistory(prev => {
        const next = [q, ...prev.filter(item => item.toLowerCase() !== q.toLowerCase())].slice(0, 8);
        try { localStorage.setItem('av_media_search_history', JSON.stringify(next)); } catch {}
        return next;
      });
    } catch (error) {
      console.warn('[AnimeVault Mobile] media search failed:', error?.message || error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = event => {
    event?.preventDefault?.();
    executeSearch();
  };

  const openMedia = item => {
    if (!item?.id) return;
    const mediaType = item.media_type === 'movie' ? 'movie' : 'tv';
    navigate('drama-detail', {
      id: item.id,
      mediaType,
      title: titleOf(item),
      poster: item.poster_path || null,
    });
  };

  const visibleResults = typeFilter === 'all'
    ? results
    : results.filter(item => item.media_type === typeFilter);

  const visibleTrending = typeFilter === 'all'
    ? trending
    : trending.filter(item => item.media_type === typeFilter);

  const clearSearch = () => {
    setQuery('');
    setSubmittedQuery('');
    setResults([]);
  };

  return (
    <div className="av-explore">
      <section className="av-explore-head">
        <div>
          <span className="av-explore-kicker"><Sparkles size={12} /> DISCOVER</span>
          <h1>Search</h1>
          <p>Find movies, dramas, and shows.</p>
        </div>
      </section>

      <form className="av-explore-search-wrap" onSubmit={handleSubmit} role="search">
        <Search size={19} />
        <input
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Search movies, dramas & shows..."
          aria-label="Search movies, dramas and shows"
          autoComplete="off"
        />
        {query && (
          <button type="button" onClick={clearSearch} aria-label="Clear search">
            <X size={17} />
          </button>
        )}
        <button
          type="submit"
          aria-label="Search"
          disabled={!query.trim() || loading}
          style={{
            minWidth: 42,
            height: 36,
            padding: '0 12px',
            border: 0,
            borderRadius: 9,
            background: query.trim() && !loading ? 'var(--brand, #ff1a75)' : 'rgba(255,255,255,.08)',
            color: '#fff',
            cursor: query.trim() && !loading ? 'pointer' : 'default',
            fontWeight: 800,
          }}
        >
          <Search size={16} />
        </button>
      </form>

      <div className="av-filter-scroll" style={{ margin: '14px 0' }}>
        <button className={typeFilter === 'all' ? 'active' : ''} onClick={() => setTypeFilter('all')} type="button">All</button>
        <button className={typeFilter === 'movie' ? 'active' : ''} onClick={() => setTypeFilter('movie')} type="button"><Film size={13} /> Movies</button>
        <button className={typeFilter === 'tv' ? 'active' : ''} onClick={() => setTypeFilter('tv')} type="button"><Tv size={13} /> Dramas & Shows</button>
      </div>

      {!submittedQuery && history.length > 0 && (
        <section className="av-explore-section av-history">
          <header>
            <h2>Recent searches</h2>
            <button type="button" onClick={() => { setHistory([]); localStorage.removeItem('av_media_search_history'); }}>Clear</button>
          </header>
          <div>{history.map(item => <button key={item} type="button" onClick={() => { setQuery(item); executeSearch(item); }}>{item}<Search size={12} /></button>)}</div>
        </section>
      )}

      {submittedQuery ? (
        <section className="av-explore-section">
          <header>
            <div>
              <h2>{loading ? 'Searching…' : `${visibleResults.length} results`}</h2>
              <p>{submittedQuery}</p>
            </div>
          </header>
          {loading ? (
            <div className="av-explore-grid">{Array.from({ length: 6 }, (_, i) => <div className="av-explore-skeleton" key={i} />)}</div>
          ) : visibleResults.length ? (
            <div className="av-explore-grid">{visibleResults.map((item, index) => <Poster key={`${item.media_type}-${item.id}-${index}`} item={item} onClick={openMedia} />)}</div>
          ) : (
            <div className="av-explore-empty"><Search size={34} /><h3>No results found</h3><p>Try another movie, drama, or show title.</p></div>
          )}
        </section>
      ) : (
        <section className="av-explore-section">
          <header>
            <div><h2><TrendingUp size={18} /> Trending now</h2><p>Movies and dramas people are watching</p></div>
          </header>
          {initialLoading ? (
            <div className="av-explore-grid">{Array.from({ length: 8 }, (_, i) => <div className="av-explore-skeleton" key={i} />)}</div>
          ) : visibleTrending.length ? (
            <div className="av-explore-grid">{visibleTrending.slice(0, 20).map((item, index) => <Poster key={`${item.media_type}-${item.id}-${index}`} item={item} onClick={openMedia} />)}</div>
          ) : (
            <div className="av-explore-empty"><Search size={34} /><h3>Nothing to show</h3><p>Try searching for a movie or drama.</p></div>
          )}
        </section>
      )}
    </div>
  );
}
