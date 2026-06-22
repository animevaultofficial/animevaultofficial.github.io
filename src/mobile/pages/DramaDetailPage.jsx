import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, SkipBack, SkipForward, Maximize, Minimize, Shield } from 'lucide-react';
import { fetchMovieDetails, fetchTVDetails, fetchTVSeasonDetails, EMBED_SERVERS, getPlayerUrl } from '../api/movies';
import { stripAdParams } from '../api/adProxy';

export default function DramaDetailPage({ params, goBack }) {
  const { id, mediaType, title: initialTitle } = params;
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPlayer, setShowPlayer] = useState(false);
  const [embedServer, setEmbedServer] = useState(0);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [episodes, setEpisodes] = useState([]);
  const [zenMode, setZenMode] = useState(true);
  const [isFs, setIsFs] = useState(false);
  const playerWrapperRef = useRef(null);

  useEffect(() => {
    const handler = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

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
  }, [id, mediaType, details?.seasons, selectedSeason]);

  const toggleFs = () => {
    if (!playerWrapperRef.current) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else playerWrapperRef.current.requestFullscreen();
  };

  const goNextEp = () => {
    const idx = episodes.findIndex(e => e.episode_number === selectedEpisode);
    if (idx < episodes.length - 1) {
      setSelectedEpisode(episodes[idx + 1].episode_number);
    }
  };

  const goPrevEp = () => {
    const idx = episodes.findIndex(e => e.episode_number === selectedEpisode);
    if (idx > 0) {
      setSelectedEpisode(episodes[idx - 1].episode_number);
    }
  };

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
    const rawUrl = mediaType === 'movie'
      ? EMBED_SERVERS[embedServer].movie(id)
      : EMBED_SERVERS[embedServer].tv(id, selectedSeason, selectedEpisode);
    const embedUrl = zenMode ? stripAdParams(rawUrl) : rawUrl;

    return (
      <div ref={playerWrapperRef} className="player-screen" style={isFs ? { padding: 0 } : {}}>
        {/* Top bar */}
        <div className="player-topbar">
          <button className="player-icon-btn" onClick={() => setShowPlayer(false)} aria-label="Back">
            <ArrowLeft size={20} />
          </button>
          <div className="player-title">
            <strong>{title}</strong>
            <span>{mediaType === 'movie' ? 'Movie' : `S${selectedSeason} E${selectedEpisode}`}</span>
          </div>
          <div className="player-language">
            <button
              className={`ply-zen-btn ${zenMode ? 'active' : ''}`}
              onClick={() => setZenMode(!zenMode)}
              title={zenMode ? 'Zen mode ON' : 'Zen mode OFF'}
            >
              <Shield size={16} />
            </button>
          </div>
        </div>

        {/* Frame */}
        <div className="player-frame-wrap">
          {zenMode && (
            <div className="ply-zen-badge"><Shield size={14} /> Zen</div>
          )}
          {mediaType !== 'movie' && (
            <div className="ply-center-nav">
              <button className="ply-nav-overlay" onClick={goPrevEp} aria-label="Previous episode">
                <SkipBack size={36} />
              </button>
              <button className="ply-nav-overlay" onClick={goNextEp} aria-label="Next episode">
                <SkipForward size={36} />
              </button>
              <button className="ply-fs-overlay" onClick={toggleFs} aria-label="Fullscreen">
                {isFs ? <Minimize size={22} /> : <Maximize size={22} />}
              </button>
            </div>
          )}
          <iframe
            key={`${selectedEpisode}-${embedServer}`}
            src={embedUrl}
            className="player-frame"
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            allowFullScreen
            title={title}
          />
        </div>

        {/* Episode rail + server selector */}
        <div className="player-episode-rail">
          {mediaType !== 'movie' && (
            <>
              <button className="ply-rail-nav" onClick={goPrevEp} disabled={selectedEpisode <= 1}>
                <SkipBack size={16} />
              </button>
              <div className="ply-rail-scroll">
                {episodes.slice(0, 100).map(ep => (
                  <button
                    key={ep.episode_number}
                    className={ep.episode_number === selectedEpisode ? 'active' : ''}
                    onClick={() => setSelectedEpisode(ep.episode_number)}
                  >
                    {ep.episode_number}
                  </button>
                ))}
              </div>
              <button className="ply-rail-nav" onClick={goNextEp} disabled={selectedEpisode >= episodes.length}>
                <SkipForward size={16} />
              </button>
            </>
          )}
          <div style={{ display: 'flex', gap: 4, marginLeft: mediaType === 'movie' ? 0 : 'auto', flexShrink: 0 }}>
            {EMBED_SERVERS.map((s, i) => (
              <button key={s.name} onClick={() => setEmbedServer(i)}
                style={{
                  height: 30, padding: '0 10px', borderRadius: 999,
                  border: '1px solid rgba(255,255,255,.12)',
                  background: i === embedServer ? 'var(--brand)' : 'rgba(255,255,255,.08)',
                  color: i === embedServer ? '#fff' : '#d1d5db',
                  fontSize: '.65rem', fontWeight: 800, cursor: 'pointer',
                  flexShrink: 0,
                }}>
                {s.name}
              </button>
            ))}
          </div>
        </div>
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
