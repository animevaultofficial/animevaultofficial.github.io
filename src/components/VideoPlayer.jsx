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
  SkipForward, SkipBack, ChevronLeft, ChevronRight, Expand
} from 'lucide-react';

import '@vidstack/react/player/styles/default/theme.css';
import electronBridge from '../utils/electronBridge';
import { getProxiedEmbedUrl, stripAdParams, isCleanServer } from '../utils/adProxy';

const isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined;

let lastUpdateTime = 0;

function VideoPlayer({ sources, poster, title, embedUrl, isZen, onNextEpisode, onPrevEpisode }) {
  const [videoUrl, setVideoUrl] = useState('');
  const [qualities, setQualities] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(null); // 'next' | 'prev' | null
  const [swipeProgress, setSwipeProgress] = useState(0);
  const playerRef = useRef(null);
  const iframeRef = useRef(null);
  const wrapperRef = useRef(null);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const swipeThreshold = 80;

  useEffect(() => {
    if (!sources || sources.length === 0) return;
    const sortedSources = [...sources].sort((a, b) => {
      const aQ = parseInt(a.quality) || 0;
      const bQ = parseInt(b.quality) || 0;
      return bQ - aQ;
    });
    setQualities(sortedSources);
    const preferred = sortedSources.find(s => s.quality === '1080p' || s.quality === '720p') || sortedSources[0];
    if (preferred) setVideoUrl(preferred.url);
  }, [sources]);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && typeof event.data === 'object') {
        const { type, currentTime, duration } = event.data;
        if ((type === 'timeupdate' || type === 'progress') && currentTime && duration) {
          const now = Date.now();
          if (now - lastUpdateTime > 5000) {
            electronBridge.updateAnimeActivityTime(currentTime, duration);
            lastUpdateTime = now;
          }
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

  // ── Touch / Swipe Gesture Handling ──
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

    // Only register horizontal swipes (not vertical scrolls)
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
    
    // Quick swipe or threshold crossed
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

  // ── EMBED PLAYER (MegaPlay etc.) ──
  if (embedUrl) {
    const isMiruro = embedUrl.includes('miruro.ro');
    let zenEmbedUrl = embedUrl;
    if (isZen) {
      zenEmbedUrl = stripAdParams(embedUrl);
    }

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

        {/* Embed iframe */}
        <div 
          className={`player-wrap embed-container ${isZen ? 'zen-active' : ''}`}
          style={isMiruro ? { overflow: 'hidden', position: 'relative' } : {}}
        >
          {isElectron ? (
            <webview
              src={zenEmbedUrl}
              className="embed-iframe"
              style={isMiruro ? { marginTop: '-100px', height: 'calc(100% + 100px)' } : {
                width: '100%',
                height: '100%',
                border: 'none'
              }}
              partition="persist:player"
              allowpopups="false"
              allowfullscreen
              title={title}
            />
          ) : (
            <iframe
              ref={iframeRef}
              src={zenEmbedUrl}
              className="embed-iframe"
              style={isMiruro ? { marginTop: '-100px', height: 'calc(100% + 100px)' } : {}}
              allow={isZen ? "autoplay; fullscreen; picture-in-picture; encrypted-media" : "autoplay; fullscreen; picture-in-picture; encrypted-media; clipboard-write"}
              title={title}
              referrerPolicy={isZen ? "no-referrer" : "no-referrer-when-downgrade"}
              loading="lazy"
            />
          )}
          {isZen && (
            <div className="zen-mode-badge">🛡️</div>
          )}
        </div>

        {/* Bottom Bar with episode navigation */}
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

  // ── LOADING STATE ──
  if (!sources || sources.length === 0) {
    return (
      <div className="video-player-error">
        <Settings size={48} className="spin" />
        <p>Initializing high-quality stream...</p>
      </div>
    );
  }

  // ── DIRECT SOURCE PLAYER (Vidstack) ──
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

      <div className="video-player-wrapper-v2">
        <MediaPlayer
          ref={playerRef}
          title={title}
          src={videoUrl}
          playsInline
          aspectRatio="16/9"
          crossOrigin
          autoPlay
          onTimeUpdate={handleTimeUpdate}
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
        
        {qualities.length > 1 && (
          <div className="quality-overlay custom-quality">
            {qualities.map((q, i) => (
              <button
                key={i}
                className={`quality-badge ${videoUrl === q.url ? 'active' : ''}`}
                onClick={() => setVideoUrl(q.url)}
              >
                {q.quality}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default VideoPlayer;
