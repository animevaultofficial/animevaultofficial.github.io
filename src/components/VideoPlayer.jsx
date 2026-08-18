import { useEffect, useRef, useState, useCallback } from 'react';
import { MediaPlayer, MediaProvider, Poster, Controls, PlayButton, MuteButton, TimeSlider, VolumeSlider, FullscreenButton, Time, Gesture } from '@vidstack/react';
import { AlertTriangle, RefreshCw, SkipBack, SkipForward, ChevronLeft, ChevronRight, Volume2, Maximize, Minimize } from 'lucide-react';
import '@vidstack/react/player/styles/default/theme.css';
import electronBridge from '../utils/electronBridge';

const isBrowser = typeof window !== 'undefined';
let lastUpdateTime = 0;

function normalizeSource(source) {
  if (!source) return null;
  const url = typeof source === 'string' ? source : source.url || source.src || source.file;
  if (!url || typeof url !== 'string') return null;
  try {
    const parsed = new URL(url, window.location.origin);
    if (!['https:', 'http:'].includes(parsed.protocol)) return null;
    const lower = parsed.pathname.toLowerCase();
    const type = source.type || (lower.includes('.m3u8') ? 'application/x-mpegURL' : lower.includes('.mp4') ? 'video/mp4' : undefined);
    return { ...source, url: parsed.href, type };
  } catch {
    return null;
  }
}

function VideoPlayer({ sources = [], poster, title, onNextEpisode, onPrevEpisode }) {
  const [activeSourceIndex, setActiveSourceIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [failoverMsg, setFailoverMsg] = useState('');
  const [showSwipeHint, setShowSwipeHint] = useState(null);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const playerRef = useRef(null);
  const wrapperRef = useRef(null);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });

  const usableSources = sources.map(normalizeSource).filter(Boolean);

  useEffect(() => {
    setActiveSourceIndex(0);
    setFailoverMsg('');
  }, [sources]);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await wrapperRef.current?.requestFullscreen();
    } catch (error) {
      console.warn('[AnimeVault Player] Fullscreen unavailable:', error);
    }
  }, []);

  const failover = useCallback(() => {
    if (usableSources.length <= 1) {
      setFailoverMsg('This stream has no additional direct fallback source.');
      return;
    }
    const next = (activeSourceIndex + 1) % usableSources.length;
    setFailoverMsg(`Switching from ${usableSources[activeSourceIndex]?.serverName || 'current server'}…`);
    setActiveSourceIndex(next);
    window.setTimeout(() => setFailoverMsg(''), 2500);
  }, [activeSourceIndex, usableSources]);

  const handleTouchStart = useCallback((event) => {
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    setSwipeProgress(0);
    setShowSwipeHint(null);
  }, []);

  const handleTouchMove = useCallback((event) => {
    const touch = event.touches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 20) {
      event.preventDefault();
      setSwipeProgress(Math.min(Math.abs(dx) / 80, 1));
      setShowSwipeHint(dx > 0 ? (onPrevEpisode ? 'prev' : null) : (onNextEpisode ? 'next' : null));
    }
  }, [onNextEpisode, onPrevEpisode]);

  const handleTouchEnd = useCallback((event) => {
    const dx = event.changedTouches[0].clientX - touchStartRef.current.x;
    const elapsed = Date.now() - touchStartRef.current.time;
    if (Math.abs(dx) > 80 || (Math.abs(dx) > 40 && elapsed < 300)) {
      if (dx > 0) onPrevEpisode?.();
      else onNextEpisode?.();
    }
    setShowSwipeHint(null);
    setSwipeProgress(0);
  }, [onNextEpisode, onPrevEpisode]);

  const handleTimeUpdate = useCallback((event) => {
    const detail = event.detail || {};
    const currentTime = Number(detail.currentTime || 0);
    const duration = Number(detail.duration || 0);
    if (duration > 0 && currentTime >= 0) {
      const now = Date.now();
      if (now - lastUpdateTime > 5000) {
        electronBridge.updateAnimeActivityTime(currentTime, duration);
        lastUpdateTime = now;
      }
    }
  }, []);

  if (!usableSources.length) {
    return (
      <div className="video-player-error" role="alert">
        <AlertTriangle size={42} />
        <p>No direct browser-compatible stream is available for this episode.</p>
        <small>AnimeVault no longer loads third-party iframe players in the browser.</small>
      </div>
    );
  }

  const activeSource = usableSources[Math.min(activeSourceIndex, usableSources.length - 1)];
  const playerSrc = activeSource.type ? { src: activeSource.url, type: activeSource.type } : activeSource.url;

  return (
    <div
      ref={wrapperRef}
      className={`av-player-shell ${isFullscreen ? 'av-fullscreen' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {showSwipeHint && (
        <div className={`av-swipe-hint av-swipe-${showSwipeHint}`} style={{ opacity: swipeProgress }}>
          {showSwipeHint === 'prev' ? <SkipBack size={30} /> : <SkipForward size={30} />}
          <span>{showSwipeHint === 'prev' ? 'Previous Episode' : 'Next Episode'}</span>
        </div>
      )}

      {failoverMsg && <div className="av-player-status">{failoverMsg}</div>}

      <div className="video-player-wrapper-v2">
        <MediaPlayer
          ref={playerRef}
          title={title}
          src={playerSrc}
          playsInline
          aspectRatio="16/9"
          crossOrigin="anonymous"
          autoPlay
          onTimeUpdate={handleTimeUpdate}
          onError={failover}
          className="av-custom-player"
        >
          <MediaProvider>
            {poster && <Poster className="vds-poster" src={poster} alt={title} />}
          </MediaProvider>

          <Gesture className="vds-gesture" event="dblpointerup" action="seek:-10" />
          <Gesture className="vds-gesture" event="dblpointerup" action="seek:10" />

          <Controls.Root className="av-controls">
            <Controls.Group className="av-controls-top">
              <h3 className="av-player-title">{title}</h3>
            </Controls.Group>
            <Controls.Group className="av-controls-center">
              {onPrevEpisode && <button className="av-center-btn" onClick={onPrevEpisode} aria-label="Previous episode"><SkipBack size={28} /></button>}
              <PlayButton className="av-center-btn av-play-center" />
              {onNextEpisode && <button className="av-center-btn" onClick={onNextEpisode} aria-label="Next episode"><SkipForward size={28} /></button>}
            </Controls.Group>
            <Controls.Group className="av-controls-bottom">
              <TimeSlider className="av-time-slider" />
              <div className="av-controls-row">
                <MuteButton className="av-control-btn"><Volume2 /></MuteButton>
                <VolumeSlider className="av-volume-slider" />
                <Time className="av-time" />
                <div className="av-controls-spacer" />
                {usableSources.length > 1 && <button className="av-control-btn" onClick={failover} title="Switch direct source"><RefreshCw size={18} /></button>}
                <button className="av-control-btn" onClick={toggleFullscreen} title="Fullscreen">{isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}</button>
              </div>
            </Controls.Group>
          </Controls.Root>
        </MediaPlayer>
      </div>

      {usableSources.length > 1 && (
        <div className="av-source-bar" role="list" aria-label="Direct stream sources">
          {usableSources.map((source, index) => (
            <button key={`${source.url}-${index}`} className={index === activeSourceIndex ? 'active' : ''} onClick={() => setActiveSourceIndex(index)}>
              {source.serverName || `Source ${index + 1}`}
            </button>
          ))}
        </div>
      )}

      <div className="av-embed-bottombar">
        {onPrevEpisode && <button className="av-embed-nav-btn" onClick={onPrevEpisode}><ChevronLeft size={16} /> Prev</button>}
        <span className="av-swipe-instruction">Swipe to change episode</span>
        {onNextEpisode && <button className="av-embed-nav-btn" onClick={onNextEpisode}>Next <ChevronRight size={16} /></button>}
      </div>
    </div>
  );
}

export default VideoPlayer;
