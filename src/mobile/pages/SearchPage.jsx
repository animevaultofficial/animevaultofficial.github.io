import React, { useState, useEffect } from 'react';
import { Search, X, TrendingUp } from 'lucide-react';
import { getTitle, getImage } from '../api/anilist';

const API_URL = 'https://graphql.anilist.co';

const TRENDING_QUERY = `
  query ($page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media(sort: TRENDING_DESC, type: ANIME, isAdult: false) {
        id
        title { romaji english }
        coverImage { large }
        averageScore
        format
      }
    }
  }
`;

const SEARCH_QUERY = `
  query ($search: String) {
    Page(page: 1, perPage: 30) {
      media(search: $search, type: ANIME, isAdult: false) {
        id
        title { romaji english }
        coverImage { large extraLarge }
        averageScore
        format
        episodes
      }
    }
  }
`;

async function searchAnime(query) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ query: SEARCH_QUERY, variables: { search: query } })
    });
    const json = await res.json();
    return json.data?.Page?.media || [];
  } catch { return []; }
}

async function fetchTrending() {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ query: TRENDING_QUERY, variables: { page: 1, perPage: 10 } })
    });
    const json = await res.json();
    return json.data?.Page?.media || [];
  } catch { return []; }
}

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

export default function SearchPage({ navigate }) {
  const nav = (id) => navigate('anime-detail', { id });
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    fetchTrending().then(d => setTrending(d)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); setSearched(false); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      setSearched(true);
      try {
        const data = await searchAnime(query);
        setResults(data || []);
      } catch { setResults([]); }
      setLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="mobile-content">
      {/* Search Bar */}
      <div className="search-bar">
        <Search size={18} color="var(--text3)" />
        <input
          type="text"
          placeholder="Search anime..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />
        {query && (
          <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 2 }}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* Search Results */}
      {searched && (
        <div className="section">
          <div className="section-header">
            <span className="section-title">{loading ? 'Searching...' : `${results.length} results`}</span>
          </div>
          {loading ? (
            <div className="grid-3">
              {[1,2,3,4,5,6].map(i => <div key={i} style={{ aspectRatio: '2/3' }} className="loading-shimmer" />)}
            </div>
          ) : results.length > 0 ? (
            <div className="grid-3">
              {results.map(item => (
                <div key={item.id} className="grid-card" onClick={() => nav(item.id)}>
                  <AnilistImage src={getImage(item)} alt={getTitle(item)} className="grid-card-img" />
                  <div className="grid-card-title">{getTitle(item)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text3)' }}>
              <p>No results found</p>
            </div>
          )}
        </div>
      )}

      {/* Trending (default view) */}
      {!searched && trending.length > 0 && (
        <div className="section">
          <div className="section-header">
            <span className="section-title"><TrendingUp size={14} /> Trending</span>
          </div>
          <div className="grid-3">
            {trending.map(item => (
              <div key={item.id} className="grid-card" onClick={() => nav(item.id)}>
                <AnilistImage src={getImage(item)} alt={getTitle(item)} className="grid-card-img" />
                <div className="grid-card-title">{getTitle(item)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}