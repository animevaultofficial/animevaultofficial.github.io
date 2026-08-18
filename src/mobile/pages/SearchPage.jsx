import React, { useState, useEffect } from 'react';
import { Search, X, TrendingUp, Filter } from 'lucide-react';
import { fetchHomeData, searchAnime as searchAnimeApi, getTitle, getImage } from '../api/anilist';

const GENRES = ['Action','Adventure','Comedy','Drama','Fantasy','Horror','Mystery','Romance','Sci-Fi','Slice of Life','Sports','Supernatural','Thriller','Psychological'];
const SORT_OPTIONS = [
  { value: 'TRENDING_DESC', label: 'Trending' },
  { value: 'POPULARITY_DESC', label: 'Popular' },
  { value: 'SCORE_DESC', label: 'Score' },
  { value: 'FAVOURITES_DESC', label: 'Favorites' },
];
const STATUS_OPTIONS = ['All','RELEASING','FINISHED','NOT_YET_RELEASED'];
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = ['All', ...Array.from({ length: 20 }, (_, i) => CURRENT_YEAR - i)];

function normalizeResults(data) {
  if (Array.isArray(data)) return data.filter(Boolean);
  if (Array.isArray(data?.Page?.media)) return data.Page.media.filter(Boolean);
  if (Array.isArray(data?.media)) return data.media.filter(Boolean);
  if (Array.isArray(data?.results)) return data.results.filter(Boolean);
  return [];
}

async function searchAnime(query, genre, sort, status, year) {
  try {
    return normalizeResults(await searchAnimeApi(query, genre, sort, status, year));
  } catch (error) {
    console.warn('[AnimeVault Mobile] search failed:', error?.message || error);
    return [];
  }
}

async function fetchTrending(sort = 'TRENDING_DESC') {
  try {
    if (sort === 'TRENDING_DESC') {
      const data = await fetchHomeData();
      return normalizeResults(data?.trending?.media || data?.trending);
    }
    return await searchAnime('', null, sort, 'All', 'All');
  } catch (error) {
    console.warn('[AnimeVault Mobile] trending fetch failed:', error?.message || error);
    return [];
  }
}

function AnilistImage({ src, alt, className, fallback = '🎬' }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <div className={`${className} loading-shimmer`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>{fallback}</div>;
  return <img src={src} alt={alt || 'Anime poster'} className={className} onError={() => setFailed(true)} loading="lazy" />;
}

export default function SearchPage({ navigate }) {
  const nav = (id) => id != null && navigate('anime-detail', { id });
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [sort, setSort] = useState('TRENDING_DESC');
  const [genre, setGenre] = useState('');
  const [status, setStatus] = useState('All');
  const [year, setYear] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [history, setHistory] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('av_search_history') || '[]');
      return Array.isArray(saved) ? saved.filter(v => typeof v === 'string') : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    let cancelled = false;
    fetchTrending(sort).then(data => {
      if (!cancelled) setTrending(normalizeResults(data));
    });
    return () => { cancelled = true; };
  }, [sort]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      setSearched(true);
      const data = await searchAnime(trimmed, genre, sort, status, year);
      if (cancelled) return;
      setResults(normalizeResults(data));
      setLoading(false);

      setHistory(prev => {
        const next = [trimmed, ...prev.filter(h => h.toLowerCase() !== trimmed.toLowerCase())].slice(0, 8);
        try { localStorage.setItem('av_search_history', JSON.stringify(next)); } catch (_) {}
        return next;
      });
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, genre, sort, status, year]);

  const handleSearch = (q) => setQuery(q);

  return (
    <div className="mobile-content">
      <div className="search-bar">
        <Search size={18} color="var(--text3)" />
        <input type="text" placeholder="Search anime..." value={query} onChange={e => handleSearch(e.target.value)} autoFocus />
        {query && <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 2 }}><X size={16} /></button>}
        <button onClick={() => setShowFilters(!showFilters)} style={{ background: showFilters ? 'var(--brand-dim)' : 'none', border: 'none', color: showFilters ? 'var(--brand)' : 'var(--text3)', cursor: 'pointer', padding: 4, borderRadius: 6 }}><Filter size={16} /></button>
      </div>

      {showFilters && (
        <div style={{ marginBottom: 12, padding: '0.75rem', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <div className="setting-row">
            <div className="setting-label">Sort</div>
            <select className="select-input" style={{ width: 'auto' }} value={sort} onChange={e => setSort(e.target.value)}>
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="setting-row">
            <div className="setting-label">Status</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {STATUS_OPTIONS.map(s => (
                <button key={s} onClick={() => setStatus(s)} style={{ padding: '4px 10px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600, background: status === s ? 'var(--brand)' : 'var(--border)', color: status === s ? '#fff' : 'var(--text3)' }}>
                  {s === 'All' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase().replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
          <div className="setting-row">
            <div className="setting-label">Year</div>
            <select className="select-input" style={{ width: 'auto' }} value={year} onChange={e => setYear(e.target.value)}>
              {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div style={{ marginTop: 8 }}>
            <div className="setting-label" style={{ marginBottom: 6 }}>Genres</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {GENRES.map(g => (
                <button key={g} onClick={() => setGenre(genre === g ? '' : g)} style={{ padding: '4px 10px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600, background: genre === g ? 'var(--brand)' : 'var(--border)', color: genre === g ? '#fff' : 'var(--text3)' }}>
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {!query && history.length > 0 && !showFilters && (
        <div className="section">
          <div className="section-header"><span className="section-title">Recent</span></div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {history.map(h => <button key={h} onClick={() => setQuery(h)} style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text2)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500 }}>{h}</button>)}
          </div>
        </div>
      )}

      {searched && (
        <div className="section">
          <div className="section-header">
            <span className="section-title">{loading ? 'Searching...' : `${results.length} results`}</span>
            {results.length > 0 && <span className="section-link" onClick={() => setShowFilters(!showFilters)}><Filter size={12} /> Filter</span>}
          </div>
          {loading ? (
            <div className="grid-3">{[1,2,3,4,5,6].map(i => <div key={i} style={{ aspectRatio: '2/3' }} className="loading-shimmer" />)}</div>
          ) : results.length > 0 ? (
            <div className="grid-3">
              {results.map(item => {
                const title = getTitle(item);
                const image = getImage(item);
                return (
                  <div key={item.id ?? title} className="grid-card" onClick={() => nav(item.id)}>
                    <div style={{ position: 'relative' }}>
                      <AnilistImage src={image} alt={title} className="grid-card-img" />
                      {item.averageScore != null && <span className="stat-pill" style={{ position: 'absolute', top: 4, left: 4, fontSize: '0.5rem', padding: '2px 5px' }}>⭐ {item.averageScore}%</span>}
                    </div>
                    <div className="grid-card-title">{title}</div>
                    <div style={{ padding: '0 0.4rem 0.4rem', fontSize: '0.6rem', color: 'var(--text3)' }}>{item.format || 'Anime'} {item.seasonYear ? `· ${item.seasonYear}` : ''}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state"><Search size={36} style={{ opacity: 0.3, marginBottom: 8 }} /><p>No results found</p></div>
          )}
        </div>
      )}

      {!searched && !showFilters && trending.length > 0 && (
        <div className="section">
          <div className="section-header">
            <span className="section-title"><TrendingUp size={14} /> Trending</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {SORT_OPTIONS.slice(0, 3).map(o => <button key={o.value} onClick={() => setSort(o.value)} style={{ padding: '3px 8px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: '0.6rem', fontWeight: 600, background: sort === o.value ? 'var(--brand)' : 'var(--border)', color: sort === o.value ? '#fff' : 'var(--text3)' }}>{o.label}</button>)}
            </div>
          </div>
          <div className="grid-3">
            {trending.map(item => {
              const title = getTitle(item);
              return <div key={item.id ?? title} className="grid-card" onClick={() => nav(item.id)}><AnilistImage src={getImage(item)} alt={title} className="grid-card-img" /><div className="grid-card-title">{title}</div></div>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
