import fs from 'fs';

const filePath = 'src/components/VideoPlayer.jsx';

const content = `import { useEffect, useRef, useState } from 'react';
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
  Time
} from '@vidstack/react';
import { Settings, Play, Pause, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';

import '@vidstack/react/player/styles/default/theme.css';
import electronBridge from '../utils/electronBridge';
import { getProxiedEmbedUrl, stripAdParams, isCleanServer } from '../utils/adProxy';

// Check if we're in Electron environment
const isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined;

// Throttle updates so we don't spam Discord RPC (e.g. every 5 seconds)
let lastUpdateTime = 0;

function VideoPlayer({ sources, poster, title, embedUrl, isZen }) {
  const [videoUrl, setVideoUrl] = useState('');
  const [qualities, setQualities] = useState([]);
  const playerRef = useRef(null);
  const iframeRef = useRef(null);

  useEffect(() => {
    if (!sources || sources.length === 0) return;

    const sortedSources = [...sources].sort((a, b) => {
      const aQ = parseInt(a.quality) || 0;
      const bQ = parseInt(b.quality) || 0;
      return bQ - aQ;
    });

    setQualities(sortedSources);
    
    // Auto-select 1080p or 720p if available
    const preferred = sortedSources.find(s => s.quality === '1080p' || s.quality === '720p') || sortedSources[0];
    if (preferred) {
      setVideoUrl(preferred.url);
    }
  }, [sources]);

  useEffect(() => {
    // Attempt to catch cross-origin postMessages from embeds like megaplay
    const handleMessage = (event) => {
      if (event.data && typeof event.data === 'object') {
        const { type, currentTime, duration } = event.data;
        if ((type === 'timeupdate' || type === 'progress') && currentTime && duration) {
          const now = Date.now();
          if (now - lastUpdateTime > 5000) { // throttle
            electronBridge.updateAnimeActivityTime(currentTime, duration);
            lastUpdateTime = now;
          }
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

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

  if (embedUrl) {
    const isMiruro = embedUrl.includes('miruro.ro');

    // Zen Mode: strip ad params, optionally proxy
    let zenEmbedUrl = embedUrl;
    if (isZen) {
      zenEmbedUrl = stripAdParams(embedUrl);
    }

    return (
      <div 
        className={\`player-wrap video-player-wrapper-v2 embed-container \${isZen ? 'zen-active' : ''}\`}
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
          <div className="zen-mode-overlay-info" style={{
            position: 'absolute', bottom: '8px', right: '8px',
            background: 'rgba(0,0,0,0.7)', color: '#0f0',
            fontSize: '11px', padding: '4px 8px', borderRadius: '4px',
            zIndex: 10, pointerEvents: 'none', fontFamily: 'monospace'
          }}>
            🛡️
          </div>
        )}
      </div>
    );
  }

  if (!sources || sources.length === 0) {
    return (
      <div className="video-player-error">
        <Settings size={48} className="spin" />
        <p>Initializing high-quality stream...</p>
      </div>
    );
  }

  return (
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
          <Poster
            className="vds-poster"
            src={poster}
            alt={title}
          />
        </MediaProvider>

        {/* CUSTOM PLAYER UI */}
        <Controls.Root className="av-controls">
          <div className="av-controls-scrim" />
          
          <Controls.Group className="av-controls-top">
            <h3 className="av-player-title">{title}</h3>
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
              className={\`quality-badge \${videoUrl === q.url ? 'active' : ''}\`}
              onClick={() => setVideoUrl(q.url)}
            >
              {q.quality}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default VideoPlayer;
`;

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated VideoPlayer.jsx to use custom UI');
