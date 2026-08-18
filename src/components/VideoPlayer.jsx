import { useEffect, useRef, useState, useCallback } from 'react';
import { MediaPlayer, MediaProvider, Poster, Controls, PlayButton, MuteButton, TimeSlider, VolumeSlider, FullscreenButton, Time, Gesture } from '@vidstack/react';
import { AlertTriangle, RefreshCw, SkipBack, SkipForward, ChevronLeft, ChevronRight, Volume2, Maximize, Minimize } from 'lucide-react';
import '@vidstack/react/player/styles/default/theme.css';
import electronBridge from '../utils/electronBridge';

let lastUpdateTime = 0;

function normalizeMediaUrl(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const parsed = new URL(url, window.location.origin);
    if (!['https:', 'http:'].includes(parsed.protocol)) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

function extractDirectSources(payload) {
  const candidates = [];
  const collect = (value) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(collect);
      return;
    }
    if (typeof value === 'string') {
      if (/^https?:\/\//i.test(value) && /\.(m3u8|mp4|webm)(\?|$)/i.test(value)) candidates.push({ url: value });
      return;
    }
    if (typeof value !== 'object') return;
    const url = value.url || value.file || value.src || value.source;
    if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
      const type = value.type || (/\.m3u8(\?|$)/i.test(url) ? 'application/x-mpegURL' : /\.mp4(\?|$)/i.test(url) ? 'video/mp4' : undefined);
      if (type || /\.(m3u8|mp4|webm)(\?|$)/i.test(url)) candidates.push({ url, type, serverName: value.server || value.name });
    }
    collect(value.sources);
    collect(value.data);
    collect(value.playlist);
    collect(value.files);
  };
  collect(payload);
  return candidates.filter((item, index, arr) => arr.findIndex(x => x.url === item.url) === index);
}

function streamApiUrl(url) {
  try {
    const parsed = new URL(url);
    if (!parsed.pathname.includes('/stream/')) return null;
    parsed.pathname = parsed.pathname.replace('/stream/', '/api/');
    return parsed.toString();
  } catch {
    return null;
  }
}

async function resolveSource(source, signal) {
  if (!source?.url) return [];
  const original = normalizeMediaUrl(source.url);
  if (!original) return [];

  const apiUrl = streamApiUrl(original);
  if (apiUrl) {
    try {
      const response = await fetch(apiUrl, { signal, headers: { Accept: 'application/json' } });
      if (response.ok) {
        const payload = await response.json();
        const direct = extractDirectSources(payload);
        if (direct.length) return direct.map(item => ({ ...item, serverName: source.serverName || item.serverName }));
      }
    } catch (error) {
      if (error?.name !== 'AbortError') console.warn('[AnimeVault Player] Direct source resolution failed:', error);
    }
  }

  if (/\.(m3u8|mp4|webm)(\?|$)/i.test(original)) return [{ ...source, url: original }];
  return [];
}

function VideoPlayer({ sources = [], poster, title, onNextEpisode, onPrevEpisode }) {
  const [activeSourceIndex, setActiveSourceIndex] = useState(0);
  const [resolvedSources, setResolvedSources] = useState([]);
  const [isResolving, setIsResolving] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [failoverMsg, setFailoverMsg] = useState('');
  const [showSwipeHint, setShowSwipeHint] = useState(null);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const playerRef = useRef(null);
  const wrapperRef = useRef(null);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });

  useEffect(() => {
    const controller = new AbortController();
    setResolvedSources([]);
    setActiveSourceIndex(0);
    setFailoverMsg('');
    setIsResolving(true);

    (async () => {
      const resolved = [];
      for (const source of sources) {
        const items = await resolveSource(source, controller.signal);
        resolved.push(...items);
        if (resolved.length >= 4) break;
      }
      if (!controller.signal.aborted) {
        setResolvedSources(resolved.filter((item, index, arr) => arr.findIndex(x => x.url === item.url) === index));
        setIsResolving(false);
      }
    })();

    return () => controller.abort();
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
    if (resolvedSources.length <= 1) {
      setFailoverMsg('No additional direct stream source is available.');
      return;
    }
    const next = (activeSourceIndex + 1) % resolvedSources.length;
    setFailoverMsg(`Switching to ${resolvedSources[next]?.serverName || 'fallback source'}…`);
    setActiveSourceIndex(next);
    window.setTimeout(() => setFailoverMsg(''), 2500);
  }, [activeSourceIndex, resolvedSources]);

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
    if (duration > 0) {
      const now = Date.now();
      if (now - lastUpdateTime > 5000) {
        electronBridge.updateAnimeActivityTime(currentTime, duration);
        lastUpdateTime = now;
      }
    }
  }, []);

  if (isResolving) {
    return <div className="video-player-error"><RefreshCw size={38} className="spin" /><p>Preparing direct stream…</p></div>;
  }

  if (!resolvedSources.length) {
    return (
      <div className="video-player-error" role="alert">
        <AlertTriangle size={42} />
        <p>No direct browser-compatible stream is available for this episode.</p>
        <small>AnimeVault no longer loads third-party iframe players in the browser.</small>
      </div>
    );
  }

  const activeSource = resolvedSources[Math.min(activeSourceIndex, resolvedSources.length - 1)];
  const playerSrc = activeSource.type ? { src: activeSource.url, type: activeSource.type } : activeSource.url;

  return (
    <div ref={wrapperRef} className={`av-player-shell ${isFullscreen ? 'av-fullscreen' : ''}`} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      {showSwipeHint && <div className={`av-swipe-hint av-swipe-${showSwipeHint}`} style={{ opacity: swipeProgress }}>{showSwipeHint === 'prev' ? <SkipBack size={30} /> : <SkipForward size={30} />}<span>{showSwipeHint === 'prev' ? 'Previous Episode' : 'Next Episode'}</span></div>}
      {failoverMsg && <div className="av-player-status">{failoverMsg}</div>}

      <div className="video-player-wrapper-v2">
        <MediaPlayer ref={playerRef} title={title} src={playerSrc} playsInline aspectRatio="16/9" crossOrigin="anonymous" autoPlay onTimeUpdate={handleTimeUpdate} onError={failover} className="av-custom-player">
          <MediaProvider>{poster && <Poster className="vds-poster" src={poster} alt={title} />}</MediaProvider>
          <Gesture className="vds-gesture" event="dblpointerup" action="seek:-10" />
          <Gesture className="vds-gesture" event="dblpointerup" action="seek:10" />
          <Controls.Root className="av-controls">
            <Controls.Group className="av-controls-top"><h3 className="av-player-title">{title}</h3></Controls.Group>
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
                {resolvedSources.length > 1 && <button className="av-control-btn" onClick={failover} title="Switch direct source"><RefreshCw size={18} /></button>}
                <button className="av-control-btn" onClick={toggleFullscreen} title="Fullscreen">{isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}</button>
              </div>
            </Controls.Group>
          </Controls.Root>
        </MediaPlayer>
      </div>

      {resolvedSources.length > 1 && <div className="av-source-bar" role="list" aria-label="Direct stream sources">{resolvedSources.map((source, index) => <button key={`${source.url}-${index}`} className={index === activeSourceIndex ? 'active' : ''} onClick={() => setActiveSourceIndex(index)}>{source.serverName || `Source ${index + 1}`}</button>)}</div>}

      <div className="av-embed-bottombar">
        {onPrevEpisode && <button className="av-embed-nav-btn" onClick={onPrevEpisode}><ChevronLeft size={16} /> Prev</button>}
        <span className="av-swipe-instruction">Swipe to change episode</span>
        {onNextEpisode && <button className="av-embed-nav-btn" onClick={onNextEpisode}>Next <ChevronRight size={16} /></button>}
      </div>
    </div>
  );
}

export default VideoPlayer;
