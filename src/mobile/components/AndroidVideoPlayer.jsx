import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { AlertTriangle, Maximize, Pause, Play, RefreshCw, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';

export function isDirectMediaUrl(sourceUrl) {
  if (!sourceUrl || typeof sourceUrl !== 'string') return false;
  if (sourceUrl.startsWith('blob:')) return true;
  try {
    const u = new URL(sourceUrl, window.location.origin);
    return ['https:', 'http:'].includes(u.protocol) && /\.(m3u8|mp4|webm|ogv|ogg)$/i.test(u.pathname);
  } catch { return false; }
}

function isHlsUrl(sourceUrl) {
  try { return new URL(sourceUrl, window.location.origin).pathname.toLowerCase().endsWith('.m3u8'); }
  catch { return false; }
}

function isEmbeddableUrl(sourceUrl) {
  if (!sourceUrl || typeof sourceUrl !== 'string') return false;
  try {
    const u = new URL(sourceUrl, window.location.origin);
    return ['https:', 'http:'].includes(u.protocol) && !isDirectMediaUrl(sourceUrl);
  } catch { return false; }
}

function createHlsConfig() {
  return {
    enableWorker: true,
    lowLatencyMode: true,
    backBufferLength: 30,
    maxBufferLength: 30,
    xhrSetup: (xhr) => xhr.setRequestHeader('X-AnimeVault-Client', 'mobile'),
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
  const direct = isDirectMediaUrl(sourceUrl);
  const embed = isEmbeddableUrl(sourceUrl);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let disposed = false;
    setLoading(true);
    setError('');
    const cleanup = () => { hlsRef.current?.destroy(); hlsRef.current = null; };
    if (!direct) { cleanup(); return () => {}; }

    const fail = () => {
      if (!disposed) {
        setLoading(false);
        setError('This media source could not be played. Check the URL and media permissions.');
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
      cleanup();
      video.removeAttribute('src');
      video.load();
      video.removeEventListener('canplay', ready);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('error', onError);
    };
  }, [sourceUrl, retryKey, direct]);

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
  const seek = (d) => {
    const v = videoRef.current;
    if (v && Number.isFinite(v.duration)) v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + d));
  };
  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else wrapRef.current?.requestFullscreen?.();
  };
  const retry = () => { setError(''); setLoading(true); setRetryKey(k => k + 1); };

  if (!direct && !embed) return <div ref={wrapRef} className="av-native-player-v2"><div className="av-native-error-v2"><AlertTriangle size={30}/><span>Unsupported media source.</span><button onClick={retry}><RefreshCw size={15}/> Retry</button></div></div>;

  if (embed) {
    return <div ref={wrapRef} className="av-native-player-v2" style={{position:'relative',width:'100%',aspectRatio:'16 / 9',minHeight:220,background:'#000',overflow:'hidden'}}>
      <iframe
        key={retryKey}
        title={title || 'AnimeVault player'}
        src={sourceUrl}
        style={{position:'absolute',inset:0,width:'100%',height:'100%',border:0,display:'block',background:'#000'}}
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        onLoad={()=>setLoading(false)}
      />
      <button onClick={retry} aria-label="Reload player" style={{position:'absolute',right:10,top:10,zIndex:2,width:38,height:38,border:0,borderRadius:10,background:'rgba(20,20,27,.8)',color:'#fff',display:'grid',placeItems:'center'}}><RefreshCw size={18}/></button>
      <button onClick={toggleFullscreen} aria-label="Fullscreen" style={{position:'absolute',right:10,bottom:10,zIndex:2,width:38,height:38,border:0,borderRadius:10,background:'rgba(20,20,27,.8)',color:'#fff',display:'grid',placeItems:'center'}}><Maximize size={18}/></button>
    </div>;
  }

  return <div ref={wrapRef} className="av-native-player-v2" style={{position:'relative',width:'100%',aspectRatio:'16 / 9',minHeight:220,background:'#000',overflow:'hidden'}}>
    <video ref={videoRef} poster={poster} playsInline preload="metadata" style={{width:'100%',height:'100%',display:'block',objectFit:'contain',background:'#000'}} onClick={togglePlay}/>
    <div className="av-native-player-overlay-v2">
      <div className="av-native-player-title-v2">{title}</div>
      {loading&&<div className="av-native-loading-v2"><RefreshCw className="av-spin" size={30}/><span>Loading media…</span></div>}
      {error&&<div className="av-native-error-v2"><AlertTriangle size={30}/><span>{error}</span><button onClick={retry}><RefreshCw size={15}/> Retry</button></div>}
      <div className="av-native-controls-v2">
        {onPrevEpisode&&<button onClick={onPrevEpisode} aria-label="Previous episode"><SkipBack size={20}/></button>}
        <button onClick={()=>seek(-10)} aria-label="Back 10 seconds"><SkipBack size={18}/></button>
        <button className="av-native-main-btn-v2" onClick={togglePlay} aria-label={paused?'Play':'Pause'}>{paused?<Play size={24} fill="currentColor"/>:<Pause size={24} fill="currentColor"/>}</button>
        <button onClick={()=>seek(10)} aria-label="Forward 10 seconds"><SkipForward size={18}/></button>
        {onNextEpisode&&<button onClick={onNextEpisode} aria-label="Next episode"><SkipForward size={20}/></button>}
        <button onClick={()=>{const v=videoRef.current;if(v){v.muted=!v.muted;setMuted(v.muted);}}} aria-label="Mute">{muted?<VolumeX size={20}/>:<Volume2 size={20}/>}</button>
        <button onClick={toggleFullscreen} aria-label={fullscreen?'Exit fullscreen':'Fullscreen'}><Maximize size={20}/></button>
      </div>
    </div>
  </div>;
}
