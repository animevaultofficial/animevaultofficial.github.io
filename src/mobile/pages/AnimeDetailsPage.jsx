import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, CalendarClock, Check, Heart, Info, ListVideo, Play, Star, SkipBack, SkipForward, Maximize, Minimize, Shield, RefreshCw } from 'lucide-react';
import { useUser } from '../../api/UserContext';
import { fetchAnimeDetail, getImage, getTitle, stripHtml } from '../api/anilist';
import { addContinueWatching, isFavorite, toggleFavorite } from '../api/storage';
import { fetchStreamingEpisodes, fetchStreamingSources, findBestStreamingMatch, EMBED_SERVERS, extractNumericId, probeMirrors } from '../api/streaming';
import { stripAdParams, getProxiedEmbedUrl, isAdHeavyServer, isCleanServer } from '../api/adProxy';

const LANGUAGES = [
  { id: 'sub', label: 'Sub' },
  { id: 'dub', label: 'Dub' },
];

const SWIPE_THRESHOLD = 80;

function buildFallbackEpisodes(media) {
  let count = media?.episodes;
  if (media?.nextAiringEpisode?.episode) count = media.nextAiringEpisode.episode - 1;
  if (!count || count <= 0) count = media?.format === 'MOVIE' ? 1 : 12;
  return Array.from({ length: Math.min(count, 200) }, (_, index) => ({
    id: `ep-${media.id}-${index + 1}`,
    number: index + 1,
    title: `Episode ${index + 1}`,
  }));
}

function formatAiring(nextAiringEpisode) {
  if (!nextAiringEpisode?.timeUntilAiring) return null;
  const total = Math.max(0, nextAiringEpisode.timeUntilAiring);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  return `Episode ${nextAiringEpisode.episode} airs in ${days}d ${hours}h`;
}

export default function AnimeDetailsPage({ params, goBack }) {
  const { user, updateContinueWatching, addToHistory, toggleLike, isLiked } = useUser();
  const [media, setMedia] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [currentEpisode, setCurrentEpisode] = useState(null);
  const [streamingInfo, setStreamingInfo] = useState({ id: null, provider: 'gogoanime' });
  const [language, setLanguage] = useState('sub');
  const [activeTab, setActiveTab] = useState('episodes');
  const [showPlayer, setShowPlayer] = useState(false);
  const [playerLoading, setPlayerLoading] = useState(false);
  const [playerStatus, setPlayerStatus] = useState('');
  const [favorite, setFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [zenMode, setZenMode] = useState(true);
  const [isFs, setIsFs] = useState(false);
  const [swipeHint, setSwipeHint] = useState(null);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [serverIndex, setServerIndex] = useState(0);
  const [iframeError, setIframeError] = useState(false);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const playerWrapperRef = useRef(null);
  const enrichedRef = useRef(false);

  const id = params?.id;

  useEffect(() => { probeMirrors().catch(() => { }); }, []);

  const toggleFs = () => {
    if (!playerWrapperRef.current) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else playerWrapperRef.current.requestFullscreen();
  };

  useEffect(() => {
    const handler = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  useEffect(() => {
    if (!id) return;
    enrichedRef.current = false;
    setLoading(true);
    setError('');
    setMedia(null);
    setEpisodes([]);
    setCurrentEpisode(null);
    setLanguage('sub');

    async function load() {
      try {
        const data = await fetchAnimeDetail(id);
        const nextMedia = data?.Media;
        if (!nextMedia) throw new Error('Anime not found.');

        const fallbackEpisodes = buildFallbackEpisodes(nextMedia);
        setMedia(nextMedia);
        setEpisodes(fallbackEpisodes);
        setCurrentEpisode(fallbackEpisodes[0] || null);
        setFavorite(isLiked(nextMedia.id, 'anime') || isFavorite(nextMedia.id));
        setLoading(false);
        enrichEpisodes(nextMedia).catch(() => { });
      } catch (err) {
        setError(err.message || 'Failed to load anime.');
        setLoading(false);
      }
    }

    load();
  }, [id, isLiked]);

  async function enrichEpisodes(nextMedia) {
    if (enrichedRef.current) return;
    enrichedRef.current = true;
    const match = await findBestStreamingMatch(getTitle(nextMedia), nextMedia.seasonYear, nextMedia.title?.english);
    if (!match) return;
    setStreamingInfo(match);
    const richEpisodes = await fetchStreamingEpisodes(match.id, match.provider);
    if (!richEpisodes?.length) return;
    setEpisodes(richEpisodes.map((episode, index) => ({
      id: episode.id || `ep-${nextMedia.id}-${index + 1}`,
      number: episode.number || index + 1,
      title: episode.title || `Episode ${index + 1}`,
      image: episode.image || null,
      isFiller: episode.isFiller || false,
    })));
  }

  const handleWatch = useCallback((episode) => {
    if (!episode || !media) return;
    setCurrentEpisode(episode);
    setShowPlayer(true);
    setPlayerLoading(true);
    setPlayerStatus('Preparing stream');

    addContinueWatching({ id: media.id, title: getTitle(media), image: getImage(media), episode: episode.number });
    if (user) {
      updateContinueWatching(media.id, 'anime', getTitle(media), getImage(media), 1, episode.number, 0, media.duration || 0);
      addToHistory(media.id, 'anime', getTitle(media), getImage(media));
    }

    if (!streamingInfo.id) {
      setTimeout(() => {
        setPlayerLoading(false);
        setPlayerStatus('');
      }, 800);
      return;
    }

    fetchStreamingSources(episode.id, streamingInfo.provider)
      .then(sources => setPlayerStatus(sources?.length ? 'Stream ready' : 'Using embedded player'))
      .catch(() => setPlayerStatus('Using embedded player'))
      .finally(() => setPlayerLoading(false));
  }, [addToHistory, media, streamingInfo, updateContinueWatching, user]);

  const handleFavorite = useCallback(async () => {
    if (!media) return;
    const next = toggleFavorite({ id: media.id, title: getTitle(media), image: getImage(media) });
    setFavorite(next.some(item => String(item.id) === String(media.id)));
    if (user) {
      const result = await toggleLike(media.id, 'anime', getTitle(media), getImage(media));
      if (!result?.promptLogin) setFavorite(result?.action === 'liked' || isLiked(media.id, 'anime'));
    }
  }, [isLiked, media, toggleLike, user]);

  if (loading) {
    return (
      <div className="mobile-content">
        <div className="detail-skeleton hero-skeleton" />
        <div className="detail-skeleton title-skeleton" />
        <div className="detail-skeleton copy-skeleton" />
      </div>
    );
  }

  if (error || !media) {
    return (
      <div className="mobile-content">
        <div className="empty">
          <Info size={38} />
          <p>{error || 'Failed to load anime.'}</p>
          <button className="btn-primary wide" onClick={goBack}>Go Back</button>
        </div>
      </div>
    );
  }

  const title = getTitle(media);
  const poster = getImage(media, 'large');
  const backdrop = media.bannerImage || poster;
  const airingText = formatAiring(media.nextAiringEpisode);
  const currentNumber = currentEpisode?.number || 1;

  if (showPlayer && currentEpisode) {
    // Build embed URL using AniList ID (same as web version) from params or media
    const embedAnimeId = extractNumericId(id) || extractNumericId(media?.id);
    const activeServer = EMBED_SERVERS[serverIndex % EMBED_SERVERS.length];
    const rawUrl = activeServer.buildUrl({ animeId: embedAnimeId, episode: currentEpisode.number, lang: language });
    const embedUrl = zenMode ? stripAdParams(rawUrl) : rawUrl;

    const switchServer = () => {
      setServerIndex(prev => prev + 1);
      setIframeError(false);
      setPlayerLoading(true);
      setPlayerStatus('Switching server...');
    };

    const goPrev = () => {
      const idx = episodes.findIndex(e => e.number === currentEpisode.number);
      if (idx > 0) handleWatch(episodes[idx - 1]);
    };
    const goNext = () => {
      const idx = episodes.findIndex(e => e.number === currentEpisode.number);
      if (idx < episodes.length - 1) handleWatch(episodes[idx + 1]);
    };

    const onTouchStart = (e) => {
      const t = e.touches[0];
      touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now() };
      setSwipeProgress(0);
      setSwipeHint(null);
    };
    const onTouchMove = (e) => {
      const t = e.touches[0];
      const dx = t.clientX - touchStartRef.current.x;
      const dy = t.clientY - touchStartRef.current.y;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 20) {
        e.preventDefault();
        const p = Math.min(Math.abs(dx) / SWIPE_THRESHOLD, 1);
        setSwipeProgress(p);
        if (dx > 30) setSwipeHint('prev');
        else if (dx < -30) setSwipeHint('next');
        else setSwipeHint(null);
      }
    };
    const onTouchEnd = (e) => {
      const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
      const dt = Date.now() - touchStartRef.current.time;
      if (Math.abs(dx) > SWIPE_THRESHOLD || (Math.abs(dx) > 40 && dt < 300)) {
        if (dx > 0) goPrev();
        else goNext();
      }
      setSwipeHint(null);
      setSwipeProgress(0);
    };

    return (
      <div
        ref={playerWrapperRef}
        className="player-screen"
        style={isFs ? { padding: 0 } : {}}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Swipe Hints */}
        {swipeHint === 'prev' && (
          <div className="ply-swipe-hint ply-swipe-left" style={{ opacity: swipeProgress }}>
            <SkipBack size={28} />
            <span>Previous</span>
          </div>
        )}
        {swipeHint === 'next' && (
          <div className="ply-swipe-hint ply-swipe-right" style={{ opacity: swipeProgress }}>
            <SkipForward size={28} />
            <span>Next</span>
          </div>
        )}

        {/* Top Bar */}
        <div className="player-topbar">
          <button className="player-icon-btn" onClick={() => setShowPlayer(false)} aria-label="Back">
            <ArrowLeft size={20} />
          </button>
          <div className="player-title">
            <strong>{title}</strong>
            <span>Ep {currentEpisode.number} · {language.toUpperCase()}</span>
          </div>
          <div className="player-language">
            <button
              className={`ply-zen-btn ${zenMode ? 'active' : ''}`}
              onClick={() => setZenMode(!zenMode)}
              title={zenMode ? 'Zen mode (ad blocking) ON' : 'Zen mode OFF'}
            >
              <Shield size={16} />
            </button>
            <button onClick={() => setLanguage(language === 'sub' ? 'dub' : 'sub')} className="active">
              {language.toUpperCase()}
            </button>
          </div>
        </div>

        {/* Player Frame */}
        <div className="player-frame-wrap">
          {playerLoading && (
            <div className="player-loading">
              <div className="spinner" />
              <span>{playerStatus || 'Loading stream...'}</span>
            </div>
          )}
          {zenMode && (
            <div className="ply-zen-badge" title="Ad blocking active">
              <Shield size={14} /> Zen
            </div>
          )}
          <iframe
            key={`${currentEpisode.number}-${language}-${serverIndex}`}
            src={embedUrl}
            className="player-frame"
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            allowFullScreen
            title={`${title} Episode ${currentEpisode.number}`}
            onLoad={() => {
              setPlayerLoading(false);
              setPlayerStatus('');
            }}
            onError={() => {
              setIframeError(true);
              setPlayerStatus('Server failed to load. Try switching servers.');
            }}
          />

          {/* Server switch button */}
          <div className="ply-server-switch" style={{ position: 'absolute', top: 60, right: 12, zIndex: 10 }}>
            <button
              onClick={switchServer}
              style={{
                background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff', borderRadius: 8, padding: '6px 10px', fontSize: '.7rem',
                display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer',
              }}
              title="Switch to another embed server"
            >
              <RefreshCw size={14} /> Server {serverIndex + 1}
            </button>
          </div>

          {/* Center navigation overlay buttons (desktop-style) */}
          <div className="ply-center-nav">
            <button className="ply-nav-overlay" onClick={goPrev} aria-label="Previous episode">
              <SkipBack size={36} />
            </button>
            <button className="ply-nav-overlay" onClick={goNext} aria-label="Next episode">
              <SkipForward size={36} />
            </button>
            <button className="ply-fs-overlay" onClick={toggleFs} aria-label="Fullscreen">
              {isFs ? <Minimize size={22} /> : <Maximize size={22} />}
            </button>
          </div>
        </div>

        {/* Episode Rail with navigation arrows (horizontal) */}
        <div className="player-episode-rail">
          <button className="ply-rail-nav" onClick={goPrev} disabled={currentEpisode.number <= 1}>
            <SkipBack size={16} />
          </button>
          <div className="ply-rail-scroll">
            {episodes.slice(0, 200).map(episode => (
              <button
                key={`${episode.id}-${episode.number}`}
                className={episode.number === currentEpisode.number ? 'active' : ''}
                onClick={() => handleWatch(episode)}
              >
                {episode.number}
              </button>
            ))}
          </div>
          <button className="ply-rail-nav" onClick={goNext} disabled={currentEpisode.number >= episodes.length}>
            <SkipForward size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="detail-page">
      <button className="detail-back" onClick={goBack}><ArrowLeft size={18} /> Back</button>
      <section className="detail-hero" style={{ backgroundImage: `linear-gradient(180deg, rgba(3,15,22,.18), rgba(3,15,22,.96)), url(${backdrop})` }}>
        <div className="detail-poster">
          {poster ? <img src={poster} alt={title} /> : <span>AV</span>}
        </div>
        <div className="detail-copy">
          <h1>{title}</h1>
          {media.title?.native && <p className="native-title">{media.title.native}</p>}
          <div className="detail-meta">
            <span><Star size={13} /> {media.averageScore ? `${media.averageScore}%` : 'N/A'}</span>
            {media.format && <span>{media.format}</span>}
            {media.seasonYear && <span>{media.seasonYear}</span>}
            {media.episodes && <span>{media.episodes} eps</span>}
          </div>
        </div>
      </section>

      <div className="mobile-content detail-content">
        {airingText && <div className="airing-banner"><CalendarClock size={16} /> {airingText}</div>}

        <div className="detail-actions">
          <button className="btn-primary" onClick={() => handleWatch(currentEpisode)}>
            <Play size={17} fill="currentColor" /> Watch Ep {currentNumber}
          </button>
          <button className={`icon-action ${favorite ? 'active' : ''}`} onClick={handleFavorite} aria-label="Favorite">
            <Heart size={19} fill={favorite ? 'currentColor' : 'none'} />
          </button>
        </div>

        <div className="language-row">
          {LANGUAGES.map(item => (
            <button key={item.id} className={language === item.id ? 'active' : ''} onClick={() => setLanguage(item.id)}>
              {item.label}
            </button>
          ))}
        </div>

        {!!media.genres?.length && (
          <div className="tag-row">
            {media.genres.slice(0, 6).map(genre => <span key={genre}>{genre}</span>)}
          </div>
        )}

        <p className="synopsis">{stripHtml(media.description || 'No description available.')}</p>

        <div className="tab-bar">
          <button className={`tab-item ${activeTab === 'episodes' ? 'active' : ''}`} onClick={() => setActiveTab('episodes')}>
            <ListVideo size={14} /> Episodes
          </button>
          <button className={`tab-item ${activeTab === 'info' ? 'active' : ''}`} onClick={() => setActiveTab('info')}>
            <Info size={14} /> Info
          </button>
        </div>

        {activeTab === 'episodes' ? (
          <div className="episode-grid">
            {episodes.map(episode => (
              <button
                key={`${episode.id}-${episode.number}`}
                className={episode.number === currentNumber ? 'active' : ''}
                onClick={() => handleWatch(episode)}
              >
                <span>{episode.number}</span>
                {episode.isFiller && <small>Filler</small>}
              </button>
            ))}
          </div>
        ) : (
          <div className="info-list">
            {media.studios?.nodes?.length > 0 && <InfoRow label="Studio" value={media.studios.nodes.map(studio => studio.name).join(', ')} />}
            {media.status && <InfoRow label="Status" value={media.status.replaceAll('_', ' ')} />}
            {media.duration && <InfoRow label="Duration" value={`${media.duration} min per episode`} />}
            {media.season && <InfoRow label="Season" value={media.season} />}
            {media.externalLinks?.find(link => link.site === 'MyAnimeList') && (
              <a className="external-link" href={media.externalLinks.find(link => link.site === 'MyAnimeList').url} target="_blank" rel="noopener noreferrer">
                <Check size={15} /> View on MyAnimeList
              </a>
            )}
          </div>
        )}

        {!!media.recommendations?.nodes?.length && (
          <section className="section">
            <div className="section-header"><span className="section-title">Recommendations</span></div>
            <div className="horizontal-scroll">
              {media.recommendations.nodes.map(node => {
                const rec = node.mediaRecommendation;
                if (!rec) return null;
                return (
                  <button key={rec.id} className="anime-card" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                    <img src={getImage(rec) || '/logo.png'} alt={getTitle(rec)} className="anime-card-image" />
                    <span className="anime-card-title">{getTitle(rec)}</span>
                    <span className="anime-card-sub">{rec.averageScore ? `${rec.averageScore}%` : 'Recommended'}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="info-card info-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
