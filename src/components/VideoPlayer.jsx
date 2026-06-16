import { useEffect, useRef, useState } from 'react';
import { MediaPlayer, MediaProvider, Poster } from '@vidstack/react';
import { defaultLayoutIcons, DefaultVideoLayout } from '@vidstack/react/player/layouts/default';
import { Settings } from 'lucide-react';

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

    // Zen Mode: strip ad params, use sandboxed iframe, and optionally proxy
    let zenEmbedUrl = embedUrl;
    if (isZen) {
      zenEmbedUrl = stripAdParams(embedUrl);
      // For known ad-heavy servers, route through CORS proxy
      // (disabled by default - enable via useProxy=true if corsproxy.io is up)
      // zenEmbedUrl = getProxiedEmbedUrl(embedUrl, true);
    }

    return (
      <div 
        className={`player-wrap video-player-wrapper-v2 embed-container ${isZen ? 'zen-active' : ''}`}
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
              sandbox="allow-scripts allow-same-origin allow-forms"
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
            // Zen Mode: restrict what the iframe can do to block ads but allow video playback features
            sandbox={isZen ? "allow-scripts allow-same-origin allow-forms allow-popups allow-presentation" : undefined}
          />
        )}
        {isZen && (
          <div className="zen-mode-overlay-info" style={{
            position: 'absolute', bottom: '8px', right: '8px',
            background: 'rgba(0,0,0,0.7)', color: '#0f0',
            fontSize: '11px', padding: '4px 8px', borderRadius: '4px',
            zIndex: 10, pointerEvents: 'none', fontFamily: 'monospace'
          }}>
            🛡️ Zen • Sandboxed
          </div>
        )}
      </div>
    );
  }

  if (!sources || sources.length === 0) {
    return (
      <div className="video-player-error">
        <Settings size={48} />
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
      >
        <MediaProvider>
          <Poster
            className="vds-poster"
            src={poster}
            alt={title}
          />
        </MediaProvider>
        <DefaultVideoLayout icons={defaultLayoutIcons} />
      </MediaPlayer>
      
      {qualities.length > 1 && (
        <div className="quality-overlay">
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
  );
}

export default VideoPlayer;