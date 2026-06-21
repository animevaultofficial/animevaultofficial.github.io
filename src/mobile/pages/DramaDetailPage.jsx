import React, { useState, useEffect } from 'react';
import { fetchMovieDetails, fetchTVDetails, fetchTVSeasonDetails } from '../api/movies';

const EMBED_SERVERS = [
  { name: 'VidSrc', movie: (id) => `https://vidsrc.to/embed/movie/${id}`, tv: (id, s, e) => `https://vidsrc.to/embed/tv/${id}/${s}/${e}` },
  { name: '2Embed', movie: (id) => `https://www.2embed.cc/embed/${id}`, tv: (id, s, e) => `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}` },
  { name: 'SuperEmbed', movie: (id) => `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1`, tv: (id, s, e) => `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1&s=${s}&e=${e}` },
  { name: 'VidKing', movie: (id) => `https://vidking.ru/embed/movie/${id}`, tv: (id, s, e) => `https://vidking.ru/embed/tv/${id}/${s}/${e}` },
];

export default function DramaDetailPage({ params, goBack }) {
  const { id, mediaType, title: initialTitle } = params;
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPlayer, setShowPlayer] = useState(false);
  const [embedServer, setEmbedServer] = useState(0);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [episodes, setEpisodes] = useState([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = mediaType === 'movie' ? await fetchMovieDetails(id) : await fetchTVDetails(id);
      setDetails(data);
      if (mediaType !== 'movie' && data?.seasons) {
        const seasonData = await fetchTVSeasonDetails(id, selectedSeason);
        setEpisodes(seasonData?.episodes || []);
      }
      setLoading(false);
    }
    load();
  }, [id, mediaType]);

  useEffect(() => {
    if (mediaType !== 'movie' && details?.seasons) {
      fetchTVSeasonDetails(id, selectedSeason).then(d => setEpisodes(d?.episodes || [])).catch(() => {});
    }
  }, [selectedSeason]);

  if (loading) {
    return (
      <div className="mobile-content">
        <div className="loading-shimmer" style={{ width: '100%', height: 250, borderRadius: 12, marginBottom: 16 }} />
        <div className="loading-shimmer" style={{ width: '60%', height: 28, borderRadius: 8, marginBottom: 12 }} />
      </div>
    );
  }

  if (!details) {
    return (
      <div className="mobile-content" style={{ textAlign: 'center', padding: '3rem 0' }}>
        <p style={{ color: '#94a3b8' }}>Failed to load details</p>
        <button onClick={goBack} style={{ marginTop: 12, background: 'var(--brand-color)', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: 8 }}>Go Back</button>
      </div>
    );
  }

  const title = details.title || details.name || initialTitle || 'Unknown';
  const poster = details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : null;
  const backdrop = details.backdrop_path ? `https://image.tmdb.org/t/p/w780${details.backdrop_path}` : null;
  const year = (details.release_date || details.first_air_date || '').split('-')[0];
  const rating = details.vote_average ? details.vote_average.toFixed(1) : 'N/A';
  const runtime = details.runtime ? `${details.runtime} min` : '';
  const overview = details.overview || 'No description available.';
  const genres = details.genres?.map(g => g.name) || [];
  const seasons = details.seasons?.filter(s => s.season_number > 0) || [];

  if (showPlayer) {
    const embedUrl = mediaType === 'movie'
      ? EMBED_SERVERS[embedServer].movie(id)
      : EMBED_SERVERS[embedServer].tv(id, selectedSeason, selectedEpisode);

    return (
      <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#111' }}>
          <button onClick={() => setShowPlayer(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>← Back</button>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{EMBED_SERVERS[embedServer].name}</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {EMBED_SERVERS.map((s, i) => (
              <button key={s.name} onClick={() => setEmbedServer(i)}
                style={{ background: i === embedServer ? 'var(--brand-color)' : '#333', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 4, fontSize: '0.7rem', cursor: 'pointer' }}>
                {s.name}
              </button>
            ))}
          </div>
        </div>
        <iframe src={embedUrl} style={{ flex: 1, border: 'none', width: '100%' }} allow="autoplay; fullscreen" allowFullScreen title={title} />
        {mediaType !== 'movie' && (
          <div style={{ display: 'flex', gap: 6, padding: '8px 12px', overflowX: 'auto', background: '#111', scrollbarWidth: 'none' }}>
            {episodes.slice(0, 30).map(ep => (
              <button key={ep.episode_number} onClick={() => setSelectedEpisode(ep.episode_number)}
                style={{ background: ep.episode_number === selectedEpisode ? 'var(--brand-color)' : '#333', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: '0.8rem', cursor: 'pointer', flexShrink: 0 }}>
                {ep.episode_number}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mobile-content" style={{ padding: 0 }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, padding: '12px 16px', background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(10px)' }}>
        <button onClick={goBack} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>← Back</button>
      </div>

      {/* Backdrop */}
      <div style={{ width: '100%', height: 250, overflow: 'hidden', background: '#1e293b' }}>
        {backdrop && <img src={backdrop} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
      </div>

      <div style={{ padding: '16px' }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 4 }}>{title}</h1>

        <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <span style={{ background: 'rgba(255,26,117,0.15)', color: 'var(--brand-color)', padding: '3px 10px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 700 }}>⭐ {rating}</span>
          {year && <span style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', padding: '3px 10px', borderRadius: 6, fontSize: '0.8rem' }}>{year}</span>}
          {runtime && <span style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', padding: '3px 10px', borderRadius: 6, fontSize: '0.8rem' }}>{runtime}</span>}
          <span style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', padding: '3px 10px', borderRadius: 6, fontSize: '0.8rem' }}>{mediaType === 'movie' ? '🎬 Movie' : '📺 TV'}</span>
        </div>

        {genres.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {genres.map(g => <span key={g} style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', padding: '2px 10px', borderRadius: 12, fontSize: '0.75rem' }}>{g}</span>)}
          </div>
        )}

        <button onClick={() => setShowPlayer(true)}
          style={{ width: '100%', background: 'var(--brand-color)', color: '#fff', border: 'none', padding: '14px', borderRadius: 10, fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', marginBottom: 16 }}>
          ▶ {mediaType === 'movie' ? 'Watch Now' : 'Watch'}
        </button>

        <div className="section" style={{ marginBottom: 0 }}>
          <div className="section-header"><span className="section-title">Overview</span></div>
          <p style={{ color: '#cbd5e1', fontSize: '0.85rem', lineHeight: 1.6 }}>{overview}</p>
        </div>

        {/* Seasons for TV */}
        {mediaType !== 'movie' && seasons.length > 0 && (
          <div className="section" style={{ marginTop: 16 }}>
            <div className="section-header"><span className="section-title">Seasons</span></div>
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12, scrollbarWidth: 'none' }}>
              {seasons.map(s => (
                <button key={s.season_number} onClick={() => { setSelectedSeason(s.season_number); setSelectedEpisode(1); }}
                  style={{ flexShrink: 0, padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem',
                    background: s.season_number === selectedSeason ? 'var(--brand-color)' : 'rgba(255,255,255,0.05)', color: s.season_number === selectedSeason ? '#fff' : '#94a3b8' }}>
                  Season {s.season_number}
                </button>
              ))}
            </div>
            {episodes.length > 0 && (
              <>
                <div className="section-header"><span className="section-title">Episodes</span></div>
                <div className="grid-scroll" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {episodes.map(ep => (
                    <button key={ep.episode_number} onClick={() => { setSelectedEpisode(ep.episode_number); setShowPlayer(true); }}
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#cbd5e1', padding: '10px 0', borderRadius: 8, fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
                      {ep.episode_number}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}