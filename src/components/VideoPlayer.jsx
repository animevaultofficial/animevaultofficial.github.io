import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  MediaPlayer, 
  MediaProvider, 
  Poster,
  Controls,
  PlayButton,
  MuteButton,
  TimeSlider,
  VolumeSlider,
  FullscreenButton,
  Time,
  Gesture
} from '@vidstack/react';
import { 
  Settings, Play, Pause, Volume2, VolumeX, Maximize, Minimize, 
  SkipForward, SkipBack, ChevronLeft, ChevronRight, AlertTriangle, RefreshCw, ExternalLink
} from 'lucide-react';

import '@vidstack/react/player/styles/default/theme.css';
import electronBridge from '../utils/electronBridge';
import { stripAdParams } from '../utils/adProxy';
import { MEGAPLAY_ORIGIN } from '../utils/animeStreamingServer';

const isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined;

let lastUpdateTime = 0;

function parsePlayerMessage(data) {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return data && typeof data === 'object' ? data : null;
}

function getPlayerProgress(data) {
  if (!data) return null;
  if (data.channel === 'megacloud' && data.type === 'time') {
    return { currentTime: data.currentTime ?? data.current_time ?? data.time, duration: data.duration };
  }
  if (data.type === 'watching-log') {
    return { currentTime: data.currentTime ?? data.current_time ?? data.time, duration: data.duration };
  }
  if (data.type === 'timeupdate' || data.type === 'progress') {
    return { currentTime: data.currentTime, duration: data.duration };
  }
  return null;
}

function getSafeEmbedUrl(url) {
  if (!url) return '';
  try {
    const parsed = new URL(url, window.location.origin);
    if (!['https:', 'http:'].includes(parsed.protocol)) return '';
    return parsed.href;
  } catch {
    return '';
  }
}

function VideoPlayer({ sources = [], poster, title, embedUrl, isZen, onNextEpisode, onPrevEpisode }) {
  const [activeSourceIndex, setActiveSourceIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(null); // 'next' | 'prev' | null
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [failoverMsg, setFailoverMsg] = useState('');

  const playerRef = useRef(null);
  const wrapperRef = useRef(null);
  const trustedEmbedOriginRef = useRef(MEGAPLAY_ORIGIN);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const swipeThreshold = 80;

  // Reset active source when sources prop changes
  useEffect(() => {
    setActiveSourceIndex(0);
    setFailoverMsg('');
  }, [sources]);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.origin !== trustedEmbedOriginRef.current) return;
      const progressData = getPlayerProgress(parsePlayerMessage(event.data));
      const currentTime = Number(progressData?.currentTime || 0);
      const duration = Number(progressData?.duration || 0);
      if (currentTime > 0 && duration > 0) {
        const now = Date.now();
        if (now - lastUpdateTime > 5000) {
          electronBridge.updateAnimeActivityTime(currentTime, duration);
          lastUpdateTime = now;
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Fullscreen change listener
  useEffect(() => {
    const handleFSChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFSChange);
    return () => document.removeEventListener('fullscreenchange', handleFSChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!wrapperRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      wrapperRef.current.requestFullscreen();
    }
  }, []);

  // Automatic failover logic to next working source
  const handleFailover = useCallback(() => {
    if (!sources || sources.length <= 1) {
      setFailoverMsg('All available stream sources exhausted.');
      return;
    }

    const nextIdx = (activeSourceIndex + 1) % sources.length;
    const failedServer = sources[activeSourceIndex]?.serverName || `Server ${activeSourceIndex + 1}`;
    const nextServer = sources[nextIdx]?.serverName || `Server ${nextIdx + 1}`;

    console.warn(`[AllAnime Player] ${failedServer} failed. Failing over to ${nextServer}...`);
    setFailoverMsg(`Stream error on ${failedServer}. Auto-switching to ${nextServer}...`);
    setActiveSourceIndex(nextIdx);

    setTimeout(() => {
      setFailoverMsg('');
    }, 4000);
  }, [activeSourceIndex, sources]);

  // Touch / Swipe Gesture Handling
  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    setSwipeProgress(0);
    setShowSwipeHint(null);
  }, []);

  const handleTouchMove = useCallback((e) => {
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 20) {
      e.preventDefault();
      const progress = Math.min(Math.abs(deltaX) / swipeThreshold, 1);
      setSwipeProgress(progress);
      
      if (deltaX > 30 && onPrevEpisode) {
        setShowSwipeHint('prev');
      } else if (deltaX < -30 && onNextEpisode) {
        setShowSwipeHint('next');
      } else {
        setShowSwipeHint(null);
      }
    }
  }, [onNextEpisode, onPrevEpisode]);

  const handleTouchEnd = useCallback((e) => {
    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const deltaTime = Date.now() - touchStartRef.current.time;
    
    if (Math.abs(deltaX) > swipeThreshold || (Math.abs(deltaX) > 40 && deltaTime < 300)) {
      if (deltaX > 0 && onPrevEpisode) {
        onPrevEpisode();
      } else if (deltaX < 0 && onNextEpisode) {
        onNextEpisode();
      }
    }

    setShowSwipeHint(null);
    setSwipeProgress(0);
  }, [onNextEpisode, onPrevEpisode]);

  const handleTimeUpdate = (event) => {
    const { currentTime, duration } = event.detail;
    if (duration > 0) {
      const now = Date.now();
      if (now - lastUpdateTime > 5000) {
        electronBridge.updateAnimeActivityTime(currentTime, duration);
        lastUpdateTime = now;
      }
    }
  };

  // Determine active source object or fallback
  const activeSource = sources[activeSourceIndex] || (embedUrl ? { url: embedUrl, type: 'iframe', serverName: 'AllAnime Direct' } : null);

  // ── LOADING STATE ──
  if (!activeSource && (!sources || sources.length === 0)) {
    return (
      <div className="video-player-error">
        <Settings size={48} className="spin" />
        <p>Fetching AllAnime video streams...</p>
      </div>
    );
  }

  const isIframeSource = activeSource?.type === 'iframe' || (!activeSource?.url.includes('.m3u8') && activeSource?.type !== 'hls');
  const targetUrl = activeSource?.url || embedUrl;
  const cleanUrl = getSafeEmbedUrl(isZen ? stripAdParams(targetUrl) : targetUrl);
  if (cleanUrl) trustedEmbedOriginRef.current = new URL(cleanUrl).origin;

  // ── EXTERNAL EMBED PLAYER (Fallback/Mirror) ──
  if (isIframeSource && !cleanUrl) {
    return (
      <div className="video-player-error">
        <AlertTriangle size={48} />
        <p>Blocked an unsafe stream URL.</p>
      </div>
    );
  }

  if (isIframeSource) {
    return (
      <div 
        ref={wrapperRef}
        className={`av-player-shell ${isFullscreen ? 'av-fullscreen' : ''}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Swipe Hint Overlays */}
        {showSwipeHint === 'prev' && (
          <div className="av-swipe-hint av-swipe-left" style={{ opacity: swipeProgress }}>
            <SkipBack size={32} />
            <span>Previous Episode</span>
          </div>
        )}
        {showSwipeHint === 'next' && (
          <div className="av-swipe-hint av-swipe-right" style={{ opacity: swipeProgress }}>
            <SkipForward size={32} />
            <span>Next Episode</span>
          </div>
        )}

        {/* Title Bar */}
        <div className="av-embed-topbar">
          <span className="av-embed-title">{title}</span>
          <div className="av-embed-actions">
            {sources.length > 1 && (
              <button className="av-embed-btn" onClick={handleFailover} title="Switch/Failover Server">
                <RefreshCw size={18} /> Switch Server
              </button>
            )}
            {onPrevEpisode && (
              <button className="av-embed-btn" onClick={onPrevEpisode} title="Previous Episode">
                <SkipBack size={18} />
              </button>
            )}
            {onNextEpisode && (
              <button className="av-embed-btn" onClick={onNextEpisode} title="Next Episode">
                <SkipForward size={18} />
              </button>
            )}
            <button className="av-embed-btn" onClick={toggleFullscreen} title="Fullscreen">
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>
        </div>

        {failoverMsg && (
          <div style={{ background: '#e53e3e', color: '#fff', padding: '6px 12px', fontSize: '0.85rem', textAlign: 'center' }}>
            {failoverMsg}
          </div>
        )}

        {/* External embed launcher */}
        <div className={`player-wrap embed-container ${isZen ? 'zen-active' : ''}`}>
          {isElectron ? (
            <webview
              src={cleanUrl}
              className="embed-webview"
              style={{ width: '100%', height: '100%', border: 'none' }}
              partition="persist:player"
              allowpopups="false"
              allowfullscreen
              title={title}
            />
          ) : (
            <iframe
              src={cleanUrl}
              className="embed-iframe"
              allow={isZen ? "autoplay; fullscreen; picture-in-picture; encrypted-media" : "autoplay; fullscreen; picture-in-picture; encrypted-media; clipboard-write"}
              title={title}
              referrerPolicy="no-referrer"
              loading="lazy"
              onError={handleIframeError}
            />
          )}
          {isZen && (
            <div className="zen-mode-badge">🛡️</div>
          )}
        </div>

        {/* Server selector pill bar */}
        {sources.length > 1 && (
          <div style={{ display: 'flex', gap: '8px', padding: '8px 12px', background: 'rgba(0,0,0,0.8)', overflowX: 'auto' }}>
            {sources.map((s, idx) => (
              <button
                key={idx}
                className={`quality-badge ${idx === activeSourceIndex ? 'active' : ''}`}
                onClick={() => setActiveSourceIndex(idx)}
                style={{ whiteSpace: 'nowrap', cursor: 'pointer' }}
              >
                {s.serverName || `Server ${idx + 1}`}
              </button>
            ))}
          </div>
        )}

        {/* Bottom Bar */}
        <div className="av-embed-bottombar">
          {onPrevEpisode && (
            <button className="av-embed-nav-btn" onClick={onPrevEpisode}>
              <ChevronLeft size={16} /> Prev
            </button>
          )}
          <div className="av-embed-bottombar-center">
            <span className="av-swipe-instruction">Swipe to change episode</span>
          </div>
          {onNextEpisode && (
            <button className="av-embed-nav-btn" onClick={onNextEpisode}>
              Next <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── DIRECT HLS STREAM PLAYER (Vidstack / HLS.js) ──
  return (
    <div 
      ref={wrapperRef}
      className="av-player-shell"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Swipe Hints */}
      {showSwipeHint === 'prev' && (
        <div className="av-swipe-hint av-swipe-left" style={{ opacity: swipeProgress }}>
          <SkipBack size={32} />
          <span>Previous Episode</span>
        </div>
      )}
      {showSwipeHint === 'next' && (
        <div className="av-swipe-hint av-swipe-right" style={{ opacity: swipeProgress }}>
          <SkipForward size={32} />
          <span>Next Episode</span>
        </div>
      )}

      {failoverMsg && (
        <div style={{ background: 'var(--brand-color, #ff4757)', color: '#fff', padding: '6px 12px', fontSize: '0.85rem', textAlign: 'center' }}>
          {failoverMsg}
        </div>
      )}

      <div className="video-player-wrapper-v2">
        <MediaPlayer
          ref={playerRef}
          title={title}
          src={activeSource.url}
          playsInline
          aspectRatio="16/9"
          crossOrigin
          autoPlay
          onTimeUpdate={handleTimeUpdate}
          onError={handleFailover}
          className="av-custom-player"
        >
          <MediaProvider>
            <Poster className="vds-poster" src={poster} alt={title} />
          </MediaProvider>

          {/* Gestures */}
          <Gesture className="vds-gesture" event="dblpointerup" action="seek:-10" />
          <Gesture className="vds-gesture" event="dblpointerup" action="seek:10" />
          <Gesture className="vds-gesture" event="pointerup" action="toggle:paused" />
          <Gesture className="vds-gesture" event="dblpointerup" action="toggle:fullscreen" />

          {/* Custom Controls UI */}
          <Controls.Root className="av-controls">
            <div className="av-controls-scrim" />
            
            <Controls.Group className="av-controls-top">
              <h3 className="av-player-title">{title}</h3>
            </Controls.Group>

            <Controls.Group className="av-controls-center">
              {onPrevEpisode && (
                <button className="av-center-btn" onClick={onPrevEpisode}>
                  <SkipBack size={28} />
                </button>
              )}
              <PlayButton className="av-center-btn av-play-center">
                <Play className="vds-icon-play" fill="currentColor" size={36} />
                <Pause className="vds-icon-pause" fill="currentColor" size={36} />
              </PlayButton>
              {onNextEpisode && (
                <button className="av-center-btn" onClick={onNextEpisode}>
                  <SkipForward size={28} />
                </button>
              )}
            </Controls.Group>

            <Controls.Group className="av-controls-bottom">
              <TimeSlider.Root className="av-slider">
                <TimeSlider.Track className="av-slider-track">
                  <TimeSlider.TrackFill className="av-slider-fill" />
                  <TimeSlider.Progress className="av-slider-progress" />
                </TimeSlider.Track>
                <TimeSlider.Thumb className="av-slider-thumb" />
              </TimeSlider.Root>

              <div className="av-controls-toolbar">
                <div className="av-toolbar-left">
                  <PlayButton className="av-btn">
                    <Play className="vds-icon-play" fill="currentColor" size={24} />
                    <Pause className="vds-icon-pause" fill="currentColor" size={24} />
                  </PlayButton>
                  
                  <MuteButton className="av-btn">
                    <Volume2 className="vds-icon-volume" size={20} />
                    <VolumeX className="vds-icon-mute" size={20} />
                  </MuteButton>

                  <VolumeSlider.Root className="av-slider av-volume-slider">
                    <VolumeSlider.Track className="av-slider-track">
                      <VolumeSlider.TrackFill className="av-slider-fill" />
                    </VolumeSlider.Track>
                    <VolumeSlider.Thumb className="av-slider-thumb" />
                  </VolumeSlider.Root>

                  <div className="av-time-display">
                    <Time type="current" className="av-time" />
                    <span className="av-time-sep">/</span>
                    <Time type="duration" className="av-time" />
                  </div>
                </div>

                <div className="av-toolbar-right">
                  <FullscreenButton className="av-btn">
                    <Maximize className="vds-icon-enter" size={20} />
                    <Minimize className="vds-icon-exit" size={20} />
                  </FullscreenButton>
                </div>
              </div>
            </Controls.Group>
          </Controls.Root>
        </MediaPlayer>
        
        {/* Server & Quality selector overlay */}
        {sources.length > 0 && (
          <div className="quality-overlay custom-quality">
            {sources.map((s, i) => (
              <button
                key={i}
                className={`quality-badge ${i === activeSourceIndex ? 'active' : ''}`}
                onClick={() => setActiveSourceIndex(i)}
              >
                {s.serverName || s.quality || `Server ${i + 1}`}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default VideoPlayer;
