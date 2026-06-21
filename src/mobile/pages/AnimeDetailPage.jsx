import React, { useState, useEffect, useCallback } from 'react';
import { fetchAnimeDetail, getTitle, getImage, stripHtml } from '../api/anilist';
import { addContinueWatching, isFavorite, toggleFavorite } from '../api/storage';

const EMBED_SERVERS = [
  { name: 'VidSrc', url: (id, ep) => `https://vidsrc.to/embed/tv/${id}/${ep}` },
  { name: '2Embed', url: (id, ep) => `https://www.2embed.cc/embedtv/${id}&ep=${ep}` },
  { name: 'SuperEmbed', url: (id, ep) => `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1&s=anime&ep=${ep}` },
];

export default function AnimeDetailPage({ params, goBack }) {
  const [media, setMedia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedEp, setSelectedEp] = useState(1);
  const [showPlayer, setShowPlayer] = useState(false);
  const [embedServer, setEmbedServer] = useState(0);
  const [fav, setFav] = useState(false);

  const id = params?.id;

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchAnimeDetail(id)
      .then(d => {
        const m = d?.Media;
        setMedia(m);
        if (m) setFav(isFavorite(m.id));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleWatch = useCallback((ep) => {
    const epNum = ep || 1;
    setSelectedEp(epNum);
    setShowPlayer(true);
    if (media) {
      addContinueWatching({ id: media.id, title: getTitle(media), image: getImage(media) });
    }
  }, [media]);

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

  if (!media) {
    return (
      <div className="mobile-content" style={{ textAlign: 'center', padding: '3rem 0' }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>😵</div>
        <p style={{ color: '#94a3b8' }}>Failed to load anime details</p>
        <button onClick={goBack} style={{ marginTop: 12, background: 'var(--brand-color)', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: 8 }}>Go Back</button>
      </div>
    );
  }

  const episodes = media.episodes || (media.format === 'MOVIE' ? 1 : 12);
  const epList = Array.from({ length: Math.min(episodes, 50) }, (_, i) => i + 1);
  const malLink = media.externalLinks?.find(l => l.site === 'MyAnimeList');

  if (showPlayer) {
    const embedUrl = EMBED_SERVERS[embedServer].url(id, selectedEp);
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#111', zIndex: 10 }}>
          <button onClick={() => setShowPlayer(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>← Back</button>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Ep {selectedEp} · {EMBED_SERVERS[embedServer].name}</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {EMBED_SERVERS.map((s, i) => (
              <button key={s.name} onClick={() => setEmbedServer(i)}
                style={{ background: i === embedServer ? 'var(--brand-color)' : '#333', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 4, fontSize: '0.7rem', cursor: 'pointer' }}>
                {s.name}
              </button>
            ))}
          </div>
        </div>
        <iframe src={embedUrl} style={{ flex: 1, border: 'none', width: '100%' }} allow="autoplay; fullscreen" allowFullScreen title={`Episode ${selectedEp}`} />
        <div style={{ display: 'flex', gap: 6, padding: '8px 12px', overflowX: 'auto', background: '#111', scrollbarWidth: 'none' }}>
          {epList.slice(0, 30).map(ep => (
            <button key={ep} onClick={() => setSelectedEp(ep)}
              style={{ background: ep === selectedEp ? 'var(--brand-color)' : '#333', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: '0.8rem', cursor: 'pointer', flexShrink: 0 }}>
              {ep}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const title = getTitle(media);
  const image = getImage(media, 'large');
  const desc = stripHtml(media.description || 'No description available.');
  const score = media.averageScore ? `${media.averageScore}%` : 'N/A';
  const year = media.seasonYear || '';
  const genres = media.genres?.slice(0, 5) || [];

  return (
    <div className="mobile-content" style={{ padding: 0 }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, padding: '12px 16px', background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(10px)' }}>
        <button onClick={goBack} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>← Back</button>
      </div>

      <div style={{ width: '100%', height: 280, overflow: 'hidden', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {image && <img src={image} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        {!image && <span style={{ fontSize: '4rem' }}>🎬</span>}
      </div>

      <div style={{ padding: '16px' }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 4, lineHeight: 1.2 }}>{title}</h1>
        {media.title?.native && <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: 12 }}>{media.title.native}</p>}

        <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <span style={{ background: 'rgba(255,26,117,0.15)', color: 'var(--brand-color)', padding: '3px 10px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 700 }}>⭐ {score}</span>
          {media.format && <span style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', padding: '3px 10px', borderRadius: 6, fontSize: '0.8rem' }}>{media.format}</span>}
          {year && <span style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', padding: '3px 10px', borderRadius: 6, fontSize: '0.8rem' }}>{year}</span>}
          {media.episodes && <span style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', padding: '3px 10px', borderRadius: 6, fontSize: '0.8rem' }}>{media.episodes} eps</span>}
        </div>

        {genres.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {genres.map(g => <span key={g} style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', padding: '2px 10px', borderRadius: 12, fontSize: '0.75rem' }}>{g}</span>)}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button onClick={() => handleWatch(1)}
            style={{ flex: 1, background: 'var(--brand-color)', color: '#fff', border: 'none', padding: '12px', borderRadius: 10, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
            ▶ {media.format === 'MOVIE' ? 'Watch Now' : 'Watch Ep 1'}
          </button>
          <button onClick={handleToggleFav}
            style={{ background: fav ? 'rgba(255,26,117,0.2)' : 'rgba(255,255,255,0.05)', color: fav ? 'var(--brand-color)' : '#94a3b8', border: fav ? '1px solid rgba(255,26,117,0.3)' : '1px solid rgba(255,255,255,0.1)', padding: '12px 16px', borderRadius: 10, fontSize: '1.2rem', cursor: 'pointer' }}>
            {fav ? '❤️' : '🤍'}
          </button>
        </div>

        <div className="section" style={{ marginBottom: 0 }}>
          <div className="section-header"><span className="section-title">Synopsis</span></div>
          <p style={{ color: '#cbd5e1', fontSize: '0.85rem', lineHeight: 1.6 }}>{desc}</p>
        </div>

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

        <div className="section" style={{ marginTop: 16 }}>
          <div className="section-header"><span className="section-title">Episodes</span></div>
          <div className="grid-scroll" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {epList.map(ep => (
              <button key={ep} onClick={() => handleWatch(ep)}
                style={{
                  background: ep === selectedEp ? 'rgba(255,26,117,0.2)' : 'rgba(255,255,255,0.05)',
                  border: ep === selectedEp ? '1px solid rgba(255,26,117,0.3)' : '1px solid rgba(255,255,255,0.08)',
                  color: ep === selectedEp ? 'var(--brand-color)' : '#cbd5e1',
                  padding: '10px 0', borderRadius: 8, fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer'
                }}>
                {ep}
              </button>
            ))}
          </div>
        </div>

        {malLink && (
          <div style={{ textAlign: 'center', marginTop: 16, marginBottom: 24 }}>
            <a href={malLink.url} target="_blank" rel="noopener noreferrer" style={{ color: '#94a3b8', fontSize: '0.8rem', textDecoration: 'underline' }}>View on MyAnimeList ↗</a>
          </div>
        )}

        {media.studios?.nodes?.length > 0 && (
          <p style={{ color: '#64748b', fontSize: '0.75rem', textAlign: 'center', marginBottom: 16 }}>
            Studio: {media.studios.nodes.map(s => s.name).join(', ')}
          </p>
        )}
      </div>
    </div>
  );
}