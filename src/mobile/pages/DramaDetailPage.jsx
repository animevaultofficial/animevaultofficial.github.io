import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, SkipBack, SkipForward, Maximize, Minimize } from 'lucide-react';
import { fetchMovieDetails, fetchTVDetails, fetchTVSeasonDetails, findMediaByTitle, resolveDirectMediaSource, MEDIA_SOURCE_PROVIDERS, DEFAULT_MEDIA_SOURCE_PROVIDER } from '../api/movies';
import AndroidVideoPlayer from '../components/AndroidVideoPlayer';
import { useUser } from '../../api/UserContext';

export default function DramaDetailPage({ params = {}, goBack, navigate }) {
  const { user, setAuthTab } = useUser();
  const id = params?.id;
  const mediaType = String(params?.mediaType || params?.type || 'tv').toLowerCase() === 'movie' ? 'movie' : 'tv';
  const initialTitle = params?.title;
  const routeSourceUrl = params?.sourceUrl || params?.videoUrl || params?.streamUrl || '';
  const [details, setDetails] = useState(null);
  const [resolvedId, setResolvedId] = useState(String(id || '').replace(/^tmdb-/i, '').trim());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPlayer, setShowPlayer] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [episodes, setEpisodes] = useState([]);
  const [mediaSource, setMediaSource] = useState(routeSourceUrl);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [sourceError, setSourceError] = useState('');
  const [selectedProvider, setSelectedProvider] = useState(DEFAULT_MEDIA_SOURCE_PROVIDER);
  const [isFs, setIsFs] = useState(false);
  const playerWrapperRef = useRef(null);

  useEffect(() => {
    const handler = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const rawId = String(id || '').replace(/^tmdb-/i, '').trim();
      if (!rawId) {
        if (!cancelled) { setError('Missing movie or TV show ID.'); setLoading(false); }
        return;
      }

      setLoading(true);
      setError('');
      setDetails(null);
      setEpisodes([]);
      setResolvedId(rawId);

      try {
        let data = mediaType === 'movie' ? await fetchMovieDetails(rawId) : await fetchTVDetails(rawId);
        let actualId = rawId;

        // Some cards/providers can hand us a stale or non-TMDB ID. If the
        // route also has a title, resolve the title through TMDB and retry.
        if (!data && initialTitle) {
          const match = await findMediaByTitle(initialTitle, mediaType);
          if (match?.id != null) {
            actualId = String(match.id);
            data = mediaType === 'movie' ? await fetchMovieDetails(actualId) : await fetchTVDetails(actualId);
          }
        }

        if (cancelled) return;
        if (!data) throw new Error(`Movie/TV show not found. ID ${rawId} is not a valid TMDB ${mediaType} ID.`);

        setResolvedId(actualId);
        setDetails(data);

        if (mediaType !== 'movie' && data.seasons?.length) {
          const firstSeason = data.seasons.find(s => s.season_number > 0)?.season_number || 1;
          setSelectedSeason(firstSeason);
          try {
            const seasonData = await fetchTVSeasonDetails(actualId, firstSeason);
            if (!cancelled) setEpisodes(seasonData?.episodes || []);
          } catch (seasonErr) {
            console.warn('[AnimeVault Mobile] TV season load failed:', seasonErr?.message || seasonErr);
          }
        }
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Failed to load details.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id, mediaType, initialTitle]);

  useEffect(() => {
    let cancelled = false;
    if (mediaType !== 'movie' && details?.seasons && resolvedId) {
      fetchTVSeasonDetails(resolvedId, selectedSeason)
        .then(d => { if (!cancelled) setEpisodes(d?.episodes || []); })
        .catch(err => console.warn('[AnimeVault Mobile] season fetch failed:', err?.message || err));
    }
    return () => { cancelled = true; };
  }, [resolvedId, mediaType, details?.seasons, selectedSeason]);

  const loadSource = async (season = selectedSeason, episode = selectedEpisode, provider = selectedProvider) => {
    if (!resolvedId) return;
    setSourceLoading(true);
    setSourceError('');
    const resolved = await resolveDirectMediaSource(mediaType, resolvedId, season, episode, provider);
    if (resolved) setMediaSource(resolved);
    else if (!routeSourceUrl) {
      setMediaSource('');
      setSourceError(`No direct media source is available from ${provider}.`);
    }
    setSourceLoading(false);
  };

  const selectProvider = async (provider) => {
    setSelectedProvider(provider);
    if (showPlayer) await loadSource(selectedSeason, selectedEpisode, provider);
  };

  const toggleFs = () => {
    if (!playerWrapperRef.current) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else playerWrapperRef.current.requestFullscreen?.();
  };

  const requireWatch = async () => {
    if (!user) { setAuthTab('login'); navigate?.('profile'); return; }
    setShowPlayer(true);
    await loadSource();
  };

  const changeEpisode = async (episode) => {
    setSelectedEpisode(episode);
    if (showPlayer) await loadSource(selectedSeason, episode);
  };

  const goNextEp = () => {
    const idx = episodes.findIndex(e => e.episode_number === selectedEpisode);
    if (idx < episodes.length - 1) changeEpisode(episodes[idx + 1].episode_number);
  };
  const goPrevEp = () => {
    const idx = episodes.findIndex(e => e.episode_number === selectedEpisode);
    if (idx > 0) changeEpisode(episodes[idx - 1].episode_number);
  };

  if (loading) return <div className="mobile-content"><div className="loading-shimmer" style={{ width: '100%', height: 250, borderRadius: 12, marginBottom: 16 }} /><div style={{ color: '#94a3b8', padding: '8px 0' }}>Loading details…</div><div className="loading-shimmer" style={{ width: '60%', height: 28, borderRadius: 8, marginBottom: 12 }} /></div>;
  if (error || !details) return <div className="mobile-content" style={{ textAlign: 'center', padding: '3rem 1rem' }}><p style={{ color: '#94a3b8' }}>{error || 'Failed to load details'}</p><button onClick={goBack} style={{ marginTop: 12, background: 'var(--brand-color)', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: 8 }}>Go Back</button></div>;

  const title = details.title || details.name || initialTitle || 'Unknown';
  const poster = details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : null;
  const backdrop = details.backdrop_path ? `https://image.tmdb.org/t/p/w780${details.backdrop_path}` : null;
  const year = (details.release_date || details.first_air_date || '').split('-')[0];
  const rating = Number.isFinite(Number(details.vote_average)) && Number(details.vote_average) > 0 ? Number(details.vote_average).toFixed(1) : 'N/A';
  const runtime = details.runtime ? `${details.runtime} min` : '';
  const overview = details.overview || 'No description available.';
  const genres = Array.isArray(details.genres) ? details.genres.map(g => g?.name).filter(Boolean) : [];
  const seasons = Array.isArray(details.seasons) ? details.seasons.filter(s => Number(s?.season_number) > 0) : [];

  if (showPlayer) {
    return (
      <div ref={playerWrapperRef} className="player-screen player-screen-v2" style={isFs ? { padding: 0 } : {}}>
        <div className="player-topbar player-topbar-v2">
          <button className="player-icon-btn" onClick={() => setShowPlayer(false)} aria-label="Back"><ArrowLeft size={20} /></button>
          <div className="player-title"><strong>{title}</strong><span>{mediaType === 'movie' ? 'Movie' : `S${selectedSeason} E${selectedEpisode}`}</span></div>
          <button className="player-icon-btn" onClick={toggleFs} aria-label="Fullscreen">{isFs ? <Minimize size={20} /> : <Maximize size={20} />}</button>
        </div>
        <div className="player-source-bar" style={{ display: 'flex', gap: 8, padding: '8px 12px', overflowX: 'auto', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
          {MEDIA_SOURCE_PROVIDERS.map(provider => (
            <button key={provider.id} onClick={() => selectProvider(provider.id)} style={{ flexShrink: 0, border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', background: provider.id === selectedProvider ? 'var(--brand-color)' : 'rgba(255,255,255,.05)', color: '#fff', fontWeight: provider.id === selectedProvider ? 700 : 500 }}>
              {provider.name}{provider.id === DEFAULT_MEDIA_SOURCE_PROVIDER ? ' · Default' : ''}
            </button>
          ))}
        </div>
        <div className="player-frame-wrap player-frame-wrap-v2">
          {sourceLoading && <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Preparing {selectedProvider}…</div>}
          {sourceError && !sourceLoading && <div style={{ padding: 24, textAlign: 'center', color: '#fca5a5' }}>{sourceError}</div>}
          {!sourceLoading && !sourceError && <AndroidVideoPlayer sourceUrl={mediaSource} poster={poster} title={title} onPrevEpisode={mediaType !== 'movie' ? goPrevEp : undefined} onNextEpisode={mediaType !== 'movie' ? goNextEp : undefined} />}
        </div>
        {mediaType !== 'movie' && <div className="player-episode-rail">
          <button className="ply-rail-nav" onClick={goPrevEp} disabled={selectedEpisode <= 1}><SkipBack size={16} /></button>
          <div className="ply-rail-scroll">{episodes.slice(0, 100).map(ep => <button key={ep.episode_number} className={ep.episode_number === selectedEpisode ? 'active' : ''} onClick={() => changeEpisode(ep.episode_number)}>{ep.episode_number}</button>)}</div>
          <button className="ply-rail-nav" onClick={goNextEp} disabled={selectedEpisode >= episodes.length}><SkipForward size={16} /></button>
        </div>}
      </div>
    );
  }

  return (
    <div className="mobile-content" style={{ padding: 0 }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, padding: '12px 16px', background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(10px)' }}><button onClick={goBack} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>← Back</button></div>
      <div style={{ width: '100%', height: 250, overflow: 'hidden', background: '#1e293b' }}>{backdrop && <img src={backdrop} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}</div>
      <div style={{ padding: '16px' }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 4 }}>{title}</h1>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}><span style={{ background: 'rgba(255,26,117,0.15)', color: 'var(--brand-color)', padding: '3px 10px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 700 }}>⭐ {rating}</span>{year && <span style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', padding: '3px 10px', borderRadius: 6, fontSize: '0.8rem' }}>{year}</span>}{runtime && <span style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', padding: '3px 10px', borderRadius: 6, fontSize: '0.8rem' }}>{runtime}</span>}<span style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', padding: '3px 10px', borderRadius: 6, fontSize: '0.8rem' }}>{mediaType === 'movie' ? '🎬 Movie' : '📺 TV'}</span></div>
        {genres.length > 0 && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>{genres.map(g => <span key={g} style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', padding: '2px 10px', borderRadius: 12, fontSize: '0.75rem' }}>{g}</span>)}</div>}
        <button onClick={requireWatch} style={{ width: '100%', background: 'var(--brand-color)', color: '#fff', border: 'none', padding: '14px', borderRadius: 10, fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', marginBottom: 16 }}>▶ {mediaType === 'movie' ? 'Watch Now' : 'Watch'}</button>
        <div className="section" style={{ marginBottom: 0 }}><div className="section-header"><span className="section-title">Overview</span></div><p style={{ color: '#cbd5e1', fontSize: '0.85rem', lineHeight: 1.6 }}>{overview}</p></div>
        {mediaType !== 'movie' && seasons.length > 0 && <div className="section" style={{ marginTop: 16 }}><div className="section-header"><span className="section-title">Seasons</span></div><div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12, scrollbarWidth: 'none' }}>{seasons.map(s => <button key={s.season_number} onClick={() => { setSelectedSeason(s.season_number); setSelectedEpisode(1); }} style={{ flexShrink: 0, padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', background: s.season_number === selectedSeason ? 'var(--brand-color)' : 'rgba(255,255,255,0.05)', color: s.season_number === selectedSeason ? '#fff' : '#94a3b8' }}>Season {s.season_number}</button>)}</div>{episodes.length > 0 && <><div className="section-header"><span className="section-title">Episodes</span></div><div className="grid-scroll" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>{episodes.map(ep => <button key={ep.episode_number} onClick={() => { setSelectedEpisode(ep.episode_number); requireWatch(); }} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#cbd5e1', padding: '10px 0', borderRadius: 8, fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>{ep.episode_number}</button>)}</div></>}</div>}
      </div>
    </div>
  );
}
