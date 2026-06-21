import React, { useState } from 'react';
import { getFavorites, getContinueWatching } from '../api/storage';
import { getTitle, getImage } from '../api/anilist';

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

export default function CollectionsPage({ navigate }) {
  const nav = (id) => navigate('anime-detail', { id });
  const [tab, setTab] = useState('favorites');
  const favorites = getFavorites();
  const continueWatching = getContinueWatching();

  return (
    <div className="mobile-content">
      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 4 }}>
        <button onClick={() => setTab('favorites')}
          style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
            background: tab === 'favorites' ? 'var(--brand-color)' : 'transparent', color: tab === 'favorites' ? '#fff' : '#94a3b8' }}>
          ❤️ Favorites
        </button>
        <button onClick={() => setTab('continue')}
          style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
            background: tab === 'continue' ? 'var(--brand-color)' : 'transparent', color: tab === 'continue' ? '#fff' : '#94a3b8' }}>
          ▶ Watching
        </button>
      </div>

      {tab === 'favorites' && (
        <>
          {favorites.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b' }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>💔</div>
              <p>No favorites yet</p>
              <p style={{ fontSize: '0.8rem', marginTop: 4 }}>Tap the heart on any anime to add it here</p>
            </div>
          ) : (
            <div className="section">
              <div className="section-header"><span className="section-title">{favorites.length} Favorites</span></div>
              <div className="grid-scroll">
                {favorites.map(item => (
                  <div key={item.id} className="grid-card" onClick={() => nav(item.id)}>
                    <AnilistImage src={item.image} alt={item.title} className="grid-card-image" />
                    <div className="grid-card-title">{item.title}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'continue' && (
        <>
          {continueWatching.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b' }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎬</div>
              <p>Nothing watched yet</p>
              <p style={{ fontSize: '0.8rem', marginTop: 4 }}>Start watching an anime to see it here</p>
            </div>
          ) : (
            <div className="section">
              <div className="section-header"><span className="section-title">Continue Watching</span></div>
              <div className="grid-scroll">
                {continueWatching.map(item => (
                  <div key={item.id} className="grid-card" onClick={() => nav(item.id)}>
                    <AnilistImage src={item.image} alt={item.title} className="grid-card-image" />
                    <div className="grid-card-title">{item.title}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}