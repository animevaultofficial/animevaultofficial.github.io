import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fetchAnimeDetail, getTitle, getImage, stripHtml } from '../api/anilist';
import { addContinueWatching, isFavorite, toggleFavorite } from '../api/storage';
import { findBestStreamingMatch, fetchStreamingEpisodes, fetchStreamingSources, probeMirrors, getAnimePlayUrl } from '../api/streaming';

const LANGUAGES = [
  { id: 'sub', label: 'SUB' },
  { id: 'dub', label: 'DUB' },
];

export default function AnimeDetailsPage({ params, goBack }) {
  const [media, setMedia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [episodes, setEpisodes] = useState([]);
  const [currentEpisode, setCurrentEpisode] = useState(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [language, setLanguage] = useState('sub');
  const [playerLoading, setPlayerLoading] = useState(false);
  const [playerStatus, setPlayerStatus] = useState('');
  const [fav, setFav] = useState(false);
  const [activeTab, setActiveTab] = useState('episodes');
  const [streamingInfo, setStreamingInfo] = useState({ id: null, provider: 'gogoanime' });
  const consumetLoadedRef = useRef(false);

  const id = params?.id;

  // Probe mirrors once
  useEffect(() => { probeMirrors().catch(() => {}); }, []);

  useEffect(() => {
    if (!id) return;
    consumetLoadedRef.current = false;
    setMedia(null);
    setEpisodes([]);
    setCurrentEpisode(null);
    setPlayerStatus('');
    setLanguage('sub');
    setLoading(true);
    setError('');

    async function load() {
      const safetyTimer = setTimeout(() => setLoading(false), 12000);
      try {
        const data = await fetchAnimeDetail(id);
        const m = data?.Media;
        if (!m) { setError('Anime not found.'); clearTimeout(safetyTimer); setLoading(false); return; }
        setMedia(m);
        setFav(isFavorite(m.id));

        // Build episode list from AniList metadata
        let count = m.episodes;
        if (m.nextAiringEpisode?.episode) count = m.nextAiringEpisode.episode - 1;
        if (!count || count <= 0) count = m.format === 'MOVIE' ? 1 : 12;
        const epList = Array.from({ length: Math.min(count, 200) }, (_, i) => ({
          id: `ep-${m.id}-${i + 1}`,
          number: i + 1,
          title: `Episode ${i + 1}`,
        }));
        setEpisodes(epList);
        setCurrentEpisode(epList[0] || null);
        setLoading(false);
        clearTimeout(safetyTimer);

        // Background: Consumet enrichment
        enrichWithConsumet(m, epList).catch(() => {});
      } catch (err) {
        setError(err.message || 'Failed to load.');
        setLoading(false);
        clearTimeout(safetyTimer);
      }
    }
    load();
  }, [id]);

  async function enrichWithConsumet(media, fallbackEps) {
    if (consumetLoadedRef.current) return;
    consumetLoadedRef.current = true;
    const titleStr = getTitle(media);
    try {
      const match = await findBestStreamingMatch(titleStr, media.seasonYear, media.title?.english);
      if (!match) return;
      setStreamingInfo(match);
      const richEps = await fetchStreamingEpisodes(match.id, match.provider);
      if (!richEps || richEps.length === 0) return;
      const merged = richEps.map((re, i) => ({
        id: re.id || `ep-${media.id}-${i + 1}`,
        number: re.number || i + 1,
        title: re.title || `Episode ${i + 1}`,
        image: re.image || null,
        isFiller: re.isFiller || false,
      }));
      setEpisodes(merged);
    } catch {}
  }

  const handleWatch = useCallback((ep) => {
    if (!ep) return;
    setCurrentEpisode(ep);
    setShowPlayer(true);
    setPlayerLoading(true);
    setPlayerStatus('Loading stream...');
    if (media) {
      addContinueWatching({ id: media.id, title: getTitle(media), image: getImage(media) });
    }
    // Try to get direct sources
    if (streamingInfo.id) {
      fetchStreamingSources(ep.id, streamingInfo.provider)
        .then(sources => {
          if (sources && sources.length > 0) {
            setPlayerStatus('Stream ready');
          } else {
            setPlayerStatus('Using embed player');
          }
        })
        .catch(() => setPlayerStatus('Using embed player'))
        .finally(() => setPlayerLoading(false));
    } else {
      setTimeout(() => { setPlayerLoading(false); setPlayerStatus('Using embed player'); }, 1000);
    }
  }, [media, streamingInfo]);

  const handleToggleFav = useCallback(() => {
    if (!media) return;
    const newFav = toggleFavorite({ id: media.id, title: getTitle(media), image: getImage(media) });
    setFav(newFav.some(a => a.id === media.id));
  }, [media]);

  if (loading) {
    return (
      <div className="mobile-content">
        <div className="loading-shimmer" style={{ width: '100%', height: 250, borderRadius: 12, marginBottom: 16 }} />
        <div className="loading-shimmer" style={{ width: '60%', height: 28, borderRadius: 8, marginBottom: 12 }} />
        <div className="loading-shimmer" style={{ width: '100%', height: 100, borderRadius: 8 }} />
      </div>
    );
  }

  if (error || !media) {
    return (
      <div className="mobile-content" style={{ textAlign: 'center', padding: '3rem 0' }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>😵</div>
        <p style={{ color: '#94a3b8' }}>{error || 'Failed to load'}</p>
        <button onClick={goBack} style={{ marginTop: 12, background: 'var(--brand-color)', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: 8 }}>Go Back</button>
      </div>
    );
  }

  const title = getTitle(media);
  const image = getImage(media, 'large');
  const desc = stripHtml(media.description || 'No description available.');
  const score = media.averageScore ? `${media.averageScore}%` : 'N/A';
  const year = media.seasonYear || '';
  const genres = media.genres?.slice(0, 5) || [];
  const malLink = media.externalLinks?.find(l => l.site === 'MyAnimeList');

  // PLAYER VIEW
  if (showPlayer && currentEpisode) {
    const embedUrl = getAnimePlayUrl(id, currentEpisode.number, language);
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
        {/* Player Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#111', zIndex: 10 }}>
          <button onClick={() => setShowPlayer(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>← Back</button>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Ep {currentEpisode.number}</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {LANGUAGES.map(l => (
              <button key={l.id} onClick={() => setLanguage(l.id)}
                style={{ background: language === l.id ? 'var(--brand-color)' : '#333', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Player Status */}
        {playerLoading && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#94a3b8', zIndex: 5, textAlign: 'center' }}>
            <div className="loading-shimmer" style={{ width: 40, height: 40, borderRadius: '50%', margin: '0 auto 12px' }} />
            <div style={{ fontSize: '0.85rem' }}>{playerStatus}</div>
          </div>
        )}

        {/* Embed iframe - same as web version uses animeplay.cfd */}
        <iframe
          key={`${currentEpisode.number}-${language}`}
          src={embedUrl}
          style={{ flex: 1, border: 'none', width: '100%' }}
          allow="autoplay; fullscreen"
          allowFullScreen
          title={`Episode ${currentEpisode.number}`}
          onLoad={() => { setPlayerLoading(false); setPlayerStatus(''); }}
        />

        {/* Episode selector */}
        <div style={{ display: 'flex', gap: 6, padding: '8px 12px', overflowX: 'auto', background: '#111', scrollbarWidth: 'none' }}>
          {episodes.slice(0, 50).map(ep => (
            <button key={ep.number} onClick={() => handleWatch(ep)}
              style={{ background: ep.number === currentEpisode.number ? 'var(--brand-color)' : '#333', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 6, fontSize: '0.8rem', cursor: 'pointer', flexShrink: 0 }}>
              {ep.number}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // DETAIL VIEW
  return (
    <div className="mobile-content" style={{ padding: 0 }}>
      {/* Back button */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, padding: '12px 16px', background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(10px)' }}>
        <button onClick={goBack} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>← Back</button>
      </div>

      {/* Cover Image */}
      <div style={{ width: '100%', height: 280, overflow: 'hidden', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {image && <img src={image} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        {!image && <span style={{ fontSize: '4rem' }}>🎬</span>}
      </div>

      <div style={{ padding: '16px' }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 4, lineHeight: 1.2 }}>{title}</h1>
        {media.title?.native && <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: 12 }}>{media.title.native}</p>}

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <span style={{ background: 'rgba(255,26,117,0.15)', color: 'var(--brand-color)', padding: '3px 10px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 700 }}>⭐ {score}</span>
          {media.format && <span style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', padding: '3px 10px', borderRadius: 6, fontSize: '0.8rem' }}>{media.format}</span>}
          {year && <span style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', padding: '3px 10px', borderRadius: 6, fontSize: '0.8rem' }}>{year}</span>}
          {media.episodes && <span style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', padding: '3px 10px', borderRadius: 6, fontSize: '0.8rem' }}>{media.episodes} eps</span>}
          {media.season && <span style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', padding: '3px 10px', borderRadius: 6, fontSize: '0.8rem' }}>{media.season}</span>}
        </div>

        {/* Genres */}
        {genres.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {genres.map(g => <span key={g} style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', padding: '2px 10px', borderRadius: 12, fontSize: '0.75rem' }}>{g}</span>)}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button onClick={() => currentEpisode && handleWatch(currentEpisode)}
            style={{ flex: 1, background: 'var(--brand-color)', color: '#fff', border: 'none', padding: '12px', borderRadius: 10, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
            ▶ {media.format === 'MOVIE' ? 'Watch Now' : `Watch Ep ${currentEpisode?.number || 1}`}
          </button>
          <button onClick={handleToggleFav}
            style={{ background: fav ? 'rgba(255,26,117,0.2)' : 'rgba(255,255,255,0.05)', color: fav ? 'var(--brand-color)' : '#94a3b8', border: fav ? '1px solid rgba(255,26,117,0.3)' : '1px solid rgba(255,255,255,0.1)', padding: '12px 16px', borderRadius: 10, fontSize: '1.2rem', cursor: 'pointer' }}>
            {fav ? '❤️' : '🤍'}
          </button>
        </div>

        {/* Language selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {LANGUAGES.map(l => (
            <button key={l.id} onClick={() => setLanguage(l.id)}
              style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                background: language === l.id ? 'var(--brand-color)' : 'rgba(255,255,255,0.05)', color: language === l.id ? '#fff' : '#94a3b8' }}>
              {l.label}
            </button>
          ))}
        </div>

        {/* Synopsis */}
        <div className="section" style={{ marginBottom: 0 }}>
          <div className="section-header"><span className="section-title">Synopsis</span></div>
          <p style={{ color: '#cbd5e1', fontSize: '0.85rem', lineHeight: 1.6 }}>{desc}</p>
        </div>

        {/* Next airing */}
        {media.nextAiringEpisode && (
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '12px', marginTop: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              📅 Ep {media.nextAiringEpisode.episode} airs in {
                media.nextAiringEpisode.timeUntilAiring
                  ? `${Math.floor(media.nextAiringEpisode.timeUntilAiring / 86400)}d ${Math.floor((media.nextAiringEpisode.timeUntilAiring % 86400) / 3600)}h`
                  : 'soon'
              }
            </span>
          </div>
        )}

        {/* Tabs: Episodes / Info */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16, marginBottom: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 4 }}>
          {['episodes', 'info'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', textTransform: 'capitalize',
                background: activeTab === tab ? 'var(--brand-color)' : 'transparent', color: activeTab === tab ? '#fff' : '#94a3b8' }}>
              {tab === 'episodes' ? `📺 Episodes (${episodes.length})` : 'ℹ️ Info'}
            </button>
          ))}
        </div>

        {activeTab === 'episodes' && (
          <div className="grid-scroll" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {episodes.map(ep => (
              <button key={ep.number} onClick={() => handleWatch(ep)}
                style={{
                  background: ep.number === currentEpisode?.number ? 'rgba(255,26,117,0.2)' : 'rgba(255,255,255,0.05)',
                  border: ep.number === currentEpisode?.number ? '1px solid rgba(255,26,117,0.3)' : '1px solid rgba(255,255,255,0.08)',
                  color: ep.number === currentEpisode?.number ? 'var(--brand-color)' : '#cbd5e1',
                  padding: '10px 0', borderRadius: 8, fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
                  position: 'relative',
                }}>
                {ep.number}
                {ep.isFiller && <span style={{ position: 'absolute', top: -2, right: -2, fontSize: '0.5rem', color: '#f59e0b' }}>●</span>}
              </button>
            ))}
          </div>
        )}

        {activeTab === 'info' && (
          <div>
            {media.studios?.nodes?.length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '12px', marginBottom: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 2 }}>Studio</p>
                <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>{media.studios.nodes.map(s => s.name).join(', ')}</p>
              </div>
            )}
            {media.duration && (
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '12px', marginBottom: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 2 }}>Duration</p>
                <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>{media.duration} min per ep</p>
              </div>
            )}
            {media.status && (
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '12px', marginBottom: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 2 }}>Status</p>
                <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>{media.status}</p>
              </div>
            )}
            {malLink && (
              <div style={{ textAlign: 'center', marginTop: 8 }}>
                <a href={malLink.url} target="_blank" rel="noopener noreferrer" style={{ color: '#94a3b8', fontSize: '0.8rem', textDecoration: 'underline' }}>View on MyAnimeList ↗</a>
              </div>
            )}
          </div>
        )}

        {/* Recommendations */}
        {media.recommendations?.nodes?.length > 0 && (
          <div className="section" style={{ marginTop: 16 }}>
            <div className="section-header"><span className="section-title">Recommendations</span></div>
            <div className="horizontal-scroll">
              {media.recommendations.nodes.map(node => {
                const rec = node.mediaRecommendation;
                if (!rec) return null;
                return (
                  <div key={rec.id} className="anime-card scroll-item" onClick={() => window.location.reload()}>
                    <img src={getImage(rec)} alt={getTitle(rec)} className="anime-card-image" style={{ objectFit: 'cover' }} />
                    <div className="anime-card-info">
                      <div className="anime-card-title">{getTitle(rec)}</div>
                      <div className="anime-card-sub">{rec.averageScore ? `${rec.averageScore}%` : ''}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}