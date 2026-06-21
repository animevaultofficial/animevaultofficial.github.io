import React, { useState, useEffect, useRef } from 'react';
import { searchAnime, getTitle, getImage } from '../api/anilist';

function AnilistImage({ src, alt, className, fallback = '🎬' }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  if (!src || failed) {
    return <div className={`${className} loading-shimmer`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>{fallback}</div>;
  }
  return (
    <>
      {!loaded && <div className={`${className} loading-shimmer`} />}
      <img src={src} alt={alt} className={className} onLoad={() => setLoaded(true)} onError={() => setFailed(true)} style={{ display: loaded ? 'block' : 'none' }} loading="lazy" />
    </>
  );
}

export default function SearchPage({ navigate }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchAnime(query);
        setResults(data?.Page?.media || []);
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
          ref={inputRef}
          type="text"
          placeholder="Search anime..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {query && (
          <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
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
          <div className="section-header">
            <span className="section-title">Results ({results.length})</span>
          </div>
          <div className="grid-scroll">
            {results.map(media => (
              <div key={media.id} className="grid-card" onClick={() => navigate('detail', { id: media.id })}>
                <AnilistImage src={getImage(media)} alt={getTitle(media)} className="grid-card-image" />
                <div className="grid-card-title">{getTitle(media)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && query && results.length === 0 && (
        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
          No results found for "{query}"
        </div>
      )}

      {!query && !loading && (
        <div style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
          <p>Search thousands of anime</p>
        </div>
      )}
    </div>
  );
}