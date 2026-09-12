import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { AlertTriangle, Maximize, Pause, Play, RefreshCw, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';

// Direct-media player with lightweight app-level ad/tracker filtering.
// Supported: HLS (.m3u8), MP4, WebM and OGG. Iframe/embed URLs are rejected.
const BLOCKED_HOSTS = new Set([
  'doubleclick.net', 'googlesyndication.com', 'googletagmanager.com',
  'google-analytics.com', 'adservice.google.com', 'adnxs.com', 'adsrvr.org',
  'taboola.com', 'outbrain.com', 'criteo.com', 'scorecardresearch.com',
  'mc.yandex.com', 'mc.yandex.ru', 'histats.com', 'profitableratecpm.com',
  'adexchangeclear.com', 'protrafficinspector.com',
]);

const BLOCKED_PATH_PARTS = [
  '/ads/', '/adserver/', '/advert/', '/advertising/', '/banner/',
  '/popunder/', '/popup/', '/tracking/', '/tracker/', '/analytics/',
];

function shouldBlockRequest(requestUrl) {
  if (!requestUrl || typeof requestUrl !== 'string') return false;
  try {
    const url = new URL(requestUrl, window.location.origin);
    const host = url.hostname.toLowerCase();
    if ([...BLOCKED_HOSTS].some(domain => host === domain || host.endsWith(`.${domain}`))) return true;
    const path = url.pathname.toLowerCase();
    if (BLOCKED_PATH_PARTS.some(part => path.includes(part))) return true;
    return false;
  } catch {
    return false;
  }
}

export function isDirectMediaUrl(sourceUrl) {
  if (!sourceUrl || typeof sourceUrl !== 'string') return false;
  if (sourceUrl.startsWith('blob:')) return true;
  try {
    const url = new URL(sourceUrl, window.location.origin);
    if (!['https:', 'http:'].includes(url.protocol)) return false;
    return /\.(m3u8|mp4|webm|ogv|ogg)$/i.test(url.pathname);
  } catch {
    return false;
  }
}

function isHlsUrl(sourceUrl) {
  try {
    return new URL(sourceUrl, window.location.origin).pathname.toLowerCase().endsWith('.m3u8');
  } catch {
    return false;
  }
}

function createHlsConfig() {
  return {
    enableWorker: true,
    lowLatencyMode: true,
    backBufferLength: 30,
    maxBufferLength: 30,
    manifestLoadingMaxRetry: 2,
    levelLoadingMaxRetry: 2,
    fragLoadingMaxRetry: 2,
    // Filter HLS requests before hls.js sends them.
    xhrSetup: (xhr, url) => {
      if (shouldBlockRequest(url)) {
        xhr.abort();
        return;
      }
      xhr.setRequestHeader('X-AnimeVault-Client', 'mobile');
    },
    fetchSetup: (context, initParams) => {
      if (shouldBlockRequest(context?.url)) {
        throw new Error('AnimeVault blocked an advertising/tracking request');
      }
      return new Request(context.url, initParams);
    },
  };
}

export default function AndroidVideoPlayer({ sourceUrl, poster, title, onNextEpisode, onPrevEpisode }) {
  const videoRef = useRef(null);
  const wrapRef = useRef(null);
  const hlsRef = useRef(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(true);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let disposed = false;
    setLoading(true);
    setError('');

    const cleanupHls = () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };

    if (!isDirectMediaUrl(sourceUrl)) {
      cleanupHls();
      video.removeAttribute('src');
      video.load();
      setLoading(false);
      setError('Unsupported media source. AnimeVault only accepts direct MP4, WebM, OGG or HLS (.m3u8) URLs.');
      return () => {};
    }

    const fail = () => {
      if (!disposed) {
        setLoading(false);
        setError('This media source could not be played. Check the URL and CORS/media permissions.');
      }
    };

    if (isHlsUrl(sourceUrl) && Hls.isSupported()) {
      const hls = new Hls(createHlsConfig());
      hlsRef.current = hls;
      hls.loadSource(sourceUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => !disposed && setLoading(false));
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (disposed || !data?.fatal) return;
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
        else fail();
      });
    } else {
      video.src = sourceUrl;
      video.load();
    }

    const ready = () => setLoading(false);
    const onPlay = () => setPaused(false);
    const onPause = () => setPaused(true);
    const onError = () => fail();
    video.addEventListener('canplay', ready);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('error', onError);

    return () => {
      disposed = true;
      cleanupHls();
      video.removeAttribute('src');
      video.load();
      video.removeEventListener('canplay', ready);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('error', onError);
    };
  }, [sourceUrl, retryKey]);

  useEffect(() => {
    const fn = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', fn);
    return () => document.removeEventListener('fullscreenchange', fn);
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    v.paused ? v.play().catch(() => {}) : v.pause();
  };

  const seek = d => {
    const v = videoRef.current;
    if (v && Number.isFinite(v.duration)) v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + d));
  };

  const retry = () => {
    setError('');
    setLoading(true);
    setRetryKey(k => k + 1);
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else wrapRef.current?.requestFullscreen?.();
  };

  return (
    <div ref={wrapRef} className="av-native-player-v2">
      <video ref={videoRef} poster={poster} playsInline preload="metadata" onClick={togglePlay} onEnded={onNextEpisode} />
      <div className="av-native-player-overlay-v2">
        <div className="av-native-player-title-v2">{title}</div>
        {loading && <div className="av-native-loading-v2"><RefreshCw className="av-spin" size={30} /><span>Loading media…</span></div>}
        {error && <div className="av-native-error-v2"><AlertTriangle size={30} /><span>{error}</span><button onClick={retry}><RefreshCw size={15} /> Retry</button></div>}
        <div className="av-native-controls-v2">
          {onPrevEpisode && <button onClick={onPrevEpisode} aria-label="Previous episode"><SkipBack size={20} /></button>}
          <button onClick={() => seek(-10)} aria-label="Back 10 seconds"><SkipBack size={18} /></button>
          <button className="av-native-main-btn-v2" onClick={togglePlay} aria-label={paused ? 'Play' : 'Pause'}>{paused ? <Play size={24} fill="currentColor" /> : <Pause size={24} fill="currentColor" />}</button>
          <button onClick={() => seek(10)} aria-label="Forward 10 seconds"><SkipForward size={18} /></button>
          {onNextEpisode && <button onClick={onNextEpisode} aria-label="Next episode"><SkipForward size={20} /></button>}
          <button onClick={() => { const v = videoRef.current; if (v) { v.muted = !v.muted; setMuted(v.muted); } }} aria-label="Mute">{muted ? <VolumeX size={20} /> : <Volume2 size={20} />}</button>
          <button onClick={toggleFullscreen} aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}><Maximize size={20} /></button>
        </div>
      </div>
    </div>
  );
}
