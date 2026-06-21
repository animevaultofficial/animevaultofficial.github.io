import React, { useState } from 'react';
import { Heart, Clock, Bookmark } from 'lucide-react';
import { getFavorites, getContinueWatching } from '../api/storage';

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
      <div className="tab-bar">
        <button className={`tab-item ${tab === 'favorites' ? 'active' : ''}`} onClick={() => setTab('favorites')}>
          <Heart size={14} /> Favorites
        </button>
        <button className={`tab-item ${tab === 'continue' ? 'active' : ''}`} onClick={() => setTab('continue')}>
          <Clock size={14} /> Watching
        </button>
      </div>

      {tab === 'favorites' && (
        favorites.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text3)' }}>
            <Heart size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
            <p>No favorites yet</p>
            <p style={{ fontSize: '0.8rem', marginTop: 4 }}>Tap the heart on any anime to add it here</p>
          </div>
        ) : (
          <div className="section">
            <div className="section-header"><span className="section-title">{favorites.length} Favorites</span></div>
            <div className="grid-3">
              {favorites.map(item => (
                <div key={item.id} className="grid-card" onClick={() => nav(item.id)}>
                  <AnilistImage src={item.image} alt={item.title} className="grid-card-img" />
                  <div className="grid-card-title">{item.title}</div>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {tab === 'continue' && (
        continueWatching.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text3)' }}>
            <Clock size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
            <p>Nothing watched yet</p>
            <p style={{ fontSize: '0.8rem', marginTop: 4 }}>Start watching an anime to see it here</p>
          </div>
        ) : (
          <div className="section">
            <div className="section-header"><span className="section-title">Continue Watching</span></div>
            <div className="grid-3">
              {continueWatching.map(item => (
                <div key={item.id} className="grid-card" onClick={() => nav(item.id)}>
                  <AnilistImage src={item.image} alt={item.title} className="grid-card-img" />
                  <div className="grid-card-title">{item.title}</div>
                </div>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
}