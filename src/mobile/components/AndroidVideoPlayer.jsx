import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { AlertTriangle, Maximize, Pause, Play, RefreshCw, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';

function findStream(value, seen = new Set()) {
  if (!value || seen.has(value)) return null;
  if (typeof value === 'string') return /\.(m3u8|mp4)(?:[?#]|$)/i.test(value) ? value : null;
  if (typeof value !== 'object') return null;
  seen.add(value);
  const preferred = ['url','file','src','stream','streamUrl','stream_url','video','videoUrl','video_url','hls','hlsUrl','hls_url','source'];
  for (const key of preferred) { const found = findStream(value[key], seen); if (found) return found; }
  for (const item of Object.values(value)) { const found = findStream(item, seen); if (found) return found; }
  return null;
}

export default function AndroidVideoPlayer({ sourceUrl, poster, title, onNextEpisode, onPrevEpisode }) {
  const videoRef = useRef(null); const hlsRef = useRef(null);
  const [error, setError] = useState(''); const [loading, setLoading] = useState(true); const [paused, setPaused] = useState(true); const [muted, setMuted] = useState(false); const [fullscreen, setFullscreen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current; if (!video || !sourceUrl) return;
    setLoading(true); setError('');
    const isHls = /\.m3u8(?:[?#]|$)/i.test(sourceUrl);
    if (isHls && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true, backBufferLength: 30 }); hlsRef.current = hls; hls.loadSource(sourceUrl); hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => setLoading(false)); hls.on(Hls.Events.ERROR, (_, data) => { if (data.fatal) setError('This stream could not be played.'); });
    } else { video.src = sourceUrl; video.load(); }
    const ready = () => setLoading(false); const onPlay = () => setPaused(false); const onPause = () => setPaused(true); const onError = () => setError('This stream could not be played.');
    video.addEventListener('canplay', ready); video.addEventListener('play', onPlay); video.addEventListener('pause', onPause); video.addEventListener('error', onError);
    return () => { video.removeEventListener('canplay', ready); video.removeEventListener('play', onPlay); video.removeEventListener('pause', onPause); video.removeEventListener('error', onError); hlsRef.current?.destroy(); hlsRef.current = null; video.removeAttribute('src'); video.load(); };
  }, [sourceUrl]);

  useEffect(() => { const fn = () => setFullscreen(!!document.fullscreenElement); document.addEventListener('fullscreenchange', fn); return () => document.removeEventListener('fullscreenchange', fn); }, []);
  const togglePlay = () => { const v = videoRef.current; if (!v) return; v.paused ? v.play().catch(() => {}) : v.pause(); };
  const seek = d => { const v = videoRef.current; if (v) v.currentTime = Math.max(0, Math.min(v.duration || Infinity, v.currentTime + d)); };
  const toggleFullscreen = () => { if (document.fullscreenElement) document.exitFullscreen(); else wrapRef.current?.requestFullscreen?.(); };

  return <div ref={wrapRef} className="av-native-player-v2">
    <video ref={videoRef} poster={poster} playsInline preload="metadata" onClick={togglePlay} onEnded={onNextEpisode} />
    <div className="av-native-player-overlay-v2"><div className="av-native-player-title-v2">{title}</div>{loading && <div className="av-native-loading-v2"><RefreshCw className="av-spin" size={30} /></div>}{error && <div className="av-native-error-v2"><AlertTriangle size={30}/><span>{error}</span><button onClick={() => { setError(''); setLoading(true); const v=videoRef.current; if(v){v.load();v.play().catch(()=>{});} }}>Retry</button></div>}<div className="av-native-controls-v2"><button onClick={() => seek(-10)}><SkipBack size={20}/></button><button className="av-native-main-btn-v2" onClick={togglePlay}>{paused ? <Play size={24} fill="currentColor"/> : <Pause size={24} fill="currentColor"/>}</button><button onClick={() => seek(10)}><SkipForward size={20}/></button><button onClick={() => { const v=videoRef.current; if(v){v.muted=!v.muted;setMuted(v.muted);} }}>{muted ? <VolumeX size={20}/> : <Volume2 size={20}/>}</button><button onClick={toggleFullscreen}><Maximize size={20}/></button></div></div>
  </div>;
}
