import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import Hls from 'hls.js';
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, Maximize, Play, RefreshCw, Server, Volume2, VolumeX } from 'lucide-react';
import { fetchAnimeById } from '../api/anilist';
import { fetchMediaMeta } from '../api/movies';
import { buildAnimeStreamApiUrlFromAniList, buildAnimeStreamApiUrlFromMal, buildAnimeStreamApiUrlFromServer, fetchAnikotoSeries } from '../utils/animeStreamingServer';
import { PLAYER_SOURCES, getSourceUrl } from '../utils/playerSources';
import { storage } from '../utils/storage';
import { useUser } from '../api/UserContext';
import { isBlockedForProfile } from '../utils/ageRating';

const DIRECT_KEYS = ['url', 'file', 'src', 'stream', 'streamUrl', 'stream_url', 'video', 'videoUrl', 'video_url', 'hls', 'hlsUrl', 'hls_url', 'source'];
const clean = (value = '') => String(value).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const titleOf = (title) => title?.english || title?.romaji || title?.native || 'Unknown Title';

function findDirectMedia(value, seen = new Set()) {
  if (!value || (typeof value === 'object' && seen.has(value))) return null;
  if (typeof value === 'string') return /\.(m3u8|mp4)(?:[?#]|$)/i.test(value) ? value : null;
  if (typeof value !== 'object') return null;
  seen.add(value);
  for (const key of DIRECT_KEYS) {
    const found = findDirectMedia(value[key], seen);
    if (found) return found;
  }
  for (const item of Object.values(value)) {
    const found = findDirectMedia(item, seen);
    if (found) return found;
  }
  return null;
}

function DirectVideo({ source, poster, title, onEnded }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [error, setError] = useState('');
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !source?.url) return undefined;
    setError('');
    hlsRef.current?.destroy();
    hlsRef.current = null;

    if (/\.m3u8(?:[?#]|$)/i.test(source.url) && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: false, backBufferLength: 90 });
      hlsRef.current = hls;
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data?.fatal) setError('This stream failed. Try another server.');
      });
      hls.loadSource(source.url);
      hls.attachMedia(video);
    } else {
      video.src = source.url;
      video.load();
    }

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  }, [source?.url]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await videoRef.current?.parentElement?.requestFullscreen?.();
        setFullscreen(true);
      } else {
        await document.exitFullscreen?.();
        setFullscreen(false);
      }
    } catch {
      setFullscreen(false);
    }
  };

  if (!source?.url) {
    return <div style={styles.videoEmpty}><Play size={42} /><p>No playable source was found for this episode.</p></div>;
  }

  return (
    <div style={{ ...styles.videoFrame, ...(fullscreen ? styles.fullscreen : {}) }}>
      <video
        ref={videoRef}
        poster={poster}
        controls
        playsInline
        preload="metadata"
        onEnded={onEnded}
        onError={() => setError('The selected stream could not be loaded.')}
        muted={muted}
        style={styles.video}
      />
      <div style={styles.videoTop}>
        <span>{title}</span>
        <button type="button" style={styles.videoBtn} onClick={() => setMuted((value) => !value)} aria-label={muted ? 'Unmute' : 'Mute'}>
          {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
        </button>
        <button type="button" style={styles.videoBtn} onClick={toggleFullscreen} aria-label="Fullscreen">
          <Maximize size={17} />
        </button>
      </div>
      {error && <div style={styles.videoError}><strong>Playback issue</strong><span>{error}</span></div>}
    </div>
  );
}

function MovieWatch() {
  const { type, id } = useParams();
  const [params] = useSearchParams();
  const { activeSubAccount, addToHistory } = useUser();
  const isAnime = type === 'anime';
  const [meta, setMeta] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(Number(params.get('episode')) || 1);
  const [server, setServer] = useState(params.get('server') || (isAnime ? 'animevault' : 'vidsrc'));
  const [lang, setLang] = useState(params.get('lang') === 'dub' ? 'dub' : 'sub');
  const [loading, setLoading] = useState(true);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [source, setSource] = useState(null);
  const [error, setError] = useState('');
  const [drawer, setDrawer] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        if (isAnime) {
          const media = await fetchAnimeById(id);
          if (!media) throw new Error('Anime not found.');
          if (isBlockedForProfile(media, activeSubAccount)) throw new Error('This title is blocked for Kids profiles.');

          let eps = [];
          if (media.idMal) {
            try {
              const series = await fetchAnikotoSeries(media.idMal);
              if (Array.isArray(series?.episodes)) {
                eps = series.episodes.map((item, index) => {
                  const number = Number(item.number || item.episode || index + 1);
                  return { ...item, number, title: item.title || `Episode ${number}`, image: item.image || item.thumbnail || '' };
                });
              }
            } catch {
              // Fall back to AniList episode count below.
            }
          }
          if (!eps.length) {
            const count = media.nextAiringEpisode?.episode ? media.nextAiringEpisode.episode - 1 : media.episodes;
            const safeCount = Math.max(0, Math.min(Number(count) || 0, 500));
            eps = Array.from({ length: safeCount }, (_, index) => ({ number: index + 1, title: `Episode ${index + 1}` }));
          }
          if (!cancelled) {
            setMeta(media);
            setEpisodes(eps);
            setEpisode((current) => eps.some((item) => item.number === current) ? current : (eps[0]?.number || 1));
          }
        } else {
          const data = await fetchMediaMeta(type === 'series' ? 'tv' : type, id);
          if (!data) throw new Error('Media not found.');
          if (isBlockedForProfile(data, activeSubAccount)) throw new Error('This title is blocked for Kids profiles.');
          const allEpisodes = [];
          (data.seasons || []).forEach((currentSeason) => {
            (currentSeason.episodes || []).forEach((item) => {
              allEpisodes.push({
                ...item,
                season: currentSeason.season_number,
                number: item.episode_number,
                title: item.name || `Episode ${item.episode_number}`,
                image: item.still_path ? `https://image.tmdb.org/t/p/w780${item.still_path}` : ''
              });
            });
          });
          if (!cancelled) {
            setMeta(data);
            setEpisodes(allEpisodes);
            const first = allEpisodes.find((item) => item.season === season && item.number === episode) || allEpisodes[0];
            if (first) {
              setSeason(first.season || 1);
              setEpisode(first.number || 1);
            }
          }
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError?.message || 'Unable to load player.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id, type, isAnime, activeSubAccount]);

  const title = isAnime ? titleOf(meta?.title) : (meta?.name || meta?.title || 'Unknown Title');
  const poster = isAnime ? (meta?.coverImage?.extraLarge || meta?.coverImage?.large) : meta?.poster;
  const backdrop = isAnime ? (meta?.bannerImage || poster) : (meta?.banner || poster);
  const currentEpisode = useMemo(() => episodes.find((item) => Number(item.number) === Number(episode) && (!item.season || Number(item.season) === Number(season))) || episodes.find((item) => Number(item.number) === Number(episode)), [episodes, episode, season]);
  const seasonEpisodes = useMemo(() => episodes.filter((item) => !item.season || Number(item.season) === Number(season)), [episodes, season]);
  const seasons = useMemo(() => [...new Set(episodes.map((item) => item.season).filter(Boolean))].sort((a, b) => a - b), [episodes]);

  useEffect(() => {
    if (!meta || !episodes.length) return undefined;
    if (!isAnime) {
      try {
        const sourceUrl = getSourceUrl(server, type === 'movie' ? 'movie' : 'tv', meta.tmdbId || id, season, episode, {}, storage.get('accentColor') || 'ff1a75');
        setSource({ url: sourceUrl, type: 'iframe', serverName: server });
      } catch {
        setSource(null);
      }
      setSourceLoading(false);
      return undefined;
    }

    let cancelled = false;
    async function resolveSource() {
      setSourceLoading(true);
      setSource(null);
      const candidates = [];
      if (server === 'animevault') candidates.push(['AnimeVault Stream', buildAnimeStreamApiUrlFromAniList(meta.id, episode, lang)]);
      if (server === 'anilist' || server === 'animevault') candidates.push(['AniList Stream', buildAnimeStreamApiUrlFromAniList(meta.id, episode, lang)]);
      if (server === 'mal' || server === 'animevault') candidates.push(['MAL Stream', buildAnimeStreamApiUrlFromMal(meta.idMal, episode, lang)]);
      const episodeId = currentEpisode?.episode_embed_id || currentEpisode?.aniwatch_ep_id || currentEpisode?.hianime_ep_id;
      if (episodeId) candidates.push(['Server 2', buildAnimeStreamApiUrlFromServer(2, episodeId, lang)]);

      for (const [name, url] of candidates) {
        if (!url || cancelled) continue;
        try {
          const response = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' });
          if (!response.ok) continue;
          const data = await response.json();
          const direct = findDirectMedia(data);
          if (direct) {
            if (!cancelled) setSource({ url: direct, type: /\.m3u8(?:[?#]|$)/i.test(direct) ? 'hls' : 'mp4', serverName: name });
            break;
          }
        } catch {
          // Try the next server.
        }
      }
      if (!cancelled) setSourceLoading(false);
    }
    resolveSource();
    return () => { cancelled = true; };
  }, [meta, episodes.length, episode, season, server, lang, type, id, isAnime, currentEpisode]);

  useEffect(() => {
    if (!meta || !addToHistory) return;
    Promise.resolve(addToHistory(isAnime ? meta.id : id, isAnime ? 'anime' : type, clean(title), poster)).catch(() => {});
  }, [meta, addToHistory, isAnime, id, type, title, poster]);

  const movieServers = PLAYER_SOURCES.filter((item) => ['vidsrc', 'vidking', 'vidnest'].includes(item.id));
  const next = () => {
    const index = seasonEpisodes.findIndex((item) => Number(item.number) === Number(episode));
    if (index >= 0 && index < seasonEpisodes.length - 1) setEpisode(Number(seasonEpisodes[index + 1].number));
  };
  const prev = () => {
    const index = seasonEpisodes.findIndex((item) => Number(item.number) === Number(episode));
    if (index > 0) setEpisode(Number(seasonEpisodes[index - 1].number));
  };
  const chooseEpisode = (item) => {
    if (item.season) setSeason(Number(item.season));
    setEpisode(Number(item.number));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) return <div style={styles.center}><RefreshCw size={30} className="spin" /><p>Preparing player…</p></div>;
  if (error || !meta) return <div style={styles.center}><h2>{error || 'Media not found'}</h2><Link to={isAnime ? `/anime/${id}` : '/dramas-movies'} style={styles.primary}><ArrowLeft size={17} /> Back</Link></div>;

  const serverOptions = isAnime ? [['animevault', 'AnimeVault'], ['anilist', 'AniList'], ['mal', 'MAL']] : movieServers.map((item) => [item.id, item.label]);

  return (
    <div style={styles.page}>
      <div style={{ ...styles.playerHero, backgroundImage: `linear-gradient(90deg, rgba(4,6,12,.98), rgba(4,6,12,.65)), url(${backdrop || ''})` }}>
        <div style={styles.playerHeader}>
          <Link to={isAnime ? `/anime/${id}` : '/dramas-movies'} style={styles.back}><ArrowLeft size={17} /> Back to details</Link>
          <span style={styles.live}>● LIVE PLAYER</span>
        </div>
        <div style={styles.playerLayout}>
          <main style={styles.main}>
            <div style={styles.videoShell}>
              {sourceLoading ? <div style={styles.videoEmpty}><RefreshCw size={35} className="spin" /><p>Finding a working stream…</p></div> : source?.type === 'iframe' ? <iframe key={source.url} src={source.url} title={`${title} player`} style={styles.iframe} allow="autoplay; fullscreen; picture-in-picture; encrypted-media" referrerPolicy="no-referrer" allowFullScreen /> : <DirectVideo key={`${source?.url || 'none'}-${episode}`} source={source} poster={poster} title={`${title} · Episode ${episode}`} onEnded={next} />}
            </div>
            <div style={styles.nowBar}>
              <div><div style={styles.kicker}>NOW PLAYING</div><h1 style={styles.nowTitle}>{title}</h1><span style={styles.nowMeta}>{isAnime ? `Episode ${episode}` : (type === 'movie' ? 'Movie' : `Season ${season} · Episode ${episode}`)} · {lang.toUpperCase()} · {source?.serverName || 'No source'}</span></div>
              <div style={styles.nowActions}><button type="button" onClick={prev} style={styles.round} disabled={episode <= 1}><ChevronLeft size={19} /></button><button type="button" onClick={next} style={styles.round}><ChevronRight size={19} /></button></div>
            </div>
            <div style={styles.serverCard}>
              <div style={styles.kicker}>PLAYBACK</div><h2 style={styles.cardTitle}>Choose a server</h2>
              <div style={styles.serverGrid}>{serverOptions.map(([value, label]) => <button type="button" key={value} onClick={() => setServer(value)} style={{ ...styles.serverButton, ...(server === value ? styles.serverActive : {}) }}><Server size={16} /><span>{label}</span>{server === value && <span style={styles.check}>✓</span>}</button>)}</div>
              <div style={styles.langRow}><span>Audio / subtitles</span><button type="button" onClick={() => setLang('sub')} style={{ ...styles.lang, ...(lang === 'sub' ? styles.langActive : {}) }}>SUB</button><button type="button" onClick={() => setLang('dub')} style={{ ...styles.lang, ...(lang === 'dub' ? styles.langActive : {}) }}>DUB</button></div>
            </div>
          </main>
          <aside style={styles.drawer}>
            <button type="button" style={styles.drawerToggle} onClick={() => setDrawer((value) => !value)}><span><Play size={15} /> Episodes</span><ChevronDown size={17} style={{ transform: drawer ? 'rotate(0deg)' : 'rotate(-90deg)' }} /></button>
            {drawer && <div style={styles.drawerBody}>
              {seasons.length > 0 && <div style={styles.seasonRow}>{seasons.map((item) => <button type="button" key={item} onClick={() => { setSeason(Number(item)); const first = episodes.find((ep) => Number(ep.season) === Number(item)); if (first) setEpisode(Number(first.number)); }} style={{ ...styles.season, ...(Number(season) === Number(item) ? styles.seasonActive : {}) }}>Season {item}</button>)}</div>}
              <div style={styles.epList}>{seasonEpisodes.map((item) => <button type="button" key={`${item.season || 1}-${item.number}`} onClick={() => chooseEpisode(item)} style={{ ...styles.ep, ...(Number(item.number) === Number(episode) && (!item.season || Number(item.season) === Number(season)) ? styles.epActive : {}) }}><span>{String(item.number).padStart(2, '0')}</span><div><strong>{item.title || `Episode ${item.number}`}</strong>{item.air_date && <small>{item.air_date}</small>}</div><Play size={14} /></button>)}</div>
            </div>}
          </aside>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '80vh', background: '#05070c', color: '#fff' },
  playerHero: { minHeight: 'calc(100vh - 80px)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' },
  playerHeader: { maxWidth: 1450, margin: '0 auto', padding: '22px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  back: { display: 'inline-flex', alignItems: 'center', gap: 7, color: '#dce1ea', textDecoration: 'none', fontWeight: 700, fontSize: 14 },
  live: { fontSize: 11, letterSpacing: 1.6, color: '#ff72aa', fontWeight: 900 },
  playerLayout: { maxWidth: 1450, margin: '0 auto', padding: '10px 24px 50px', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 330px', gap: 18 },
  main: { minWidth: 0 },
  videoShell: { aspectRatio: '16/9', background: '#000', borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(255,255,255,.1)', boxShadow: '0 25px 90px rgba(0,0,0,.5)' },
  iframe: { width: '100%', height: '100%', border: 0, display: 'block', background: '#000' },
  videoFrame: { position: 'relative', width: '100%', height: '100%', background: '#000' },
  video: { width: '100%', height: '100%', display: 'block', background: '#000' },
  videoTop: { position: 'absolute', top: 0, left: 0, right: 0, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 7, background: 'linear-gradient(#000b, transparent)', fontSize: 12, fontWeight: 800 },
  videoBtn: { marginLeft: 'auto', display: 'grid', placeItems: 'center', border: 0, background: 'rgba(0,0,0,.45)', color: '#fff', borderRadius: 8, padding: 7, cursor: 'pointer' },
  videoError: { position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', background: 'rgba(8,10,15,.92)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 12, padding: 16, display: 'grid', gap: 5, textAlign: 'center' },
  videoEmpty: { height: '100%', display: 'grid', placeItems: 'center', alignContent: 'center', gap: 10, color: '#9aa3b2' },
  fullscreen: { position: 'fixed', inset: 0, zIndex: 9999, borderRadius: 0 },
  nowBar: { marginTop: 14, padding: '18px 20px', display: 'flex', justifyContent: 'space-between', gap: 15, alignItems: 'center', background: 'rgba(10,13,20,.8)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 16 },
  kicker: { fontSize: 10, letterSpacing: 1.8, fontWeight: 900, color: '#ff4d94' },
  nowTitle: { fontSize: 'clamp(1.2rem,2.4vw,2rem)', margin: '4px 0 5px' },
  nowMeta: { color: '#929bab', fontSize: 13 },
  nowActions: { display: 'flex', gap: 7 },
  round: { width: 42, height: 42, display: 'grid', placeItems: 'center', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, background: '#111722', color: '#fff', cursor: 'pointer' },
  serverCard: { marginTop: 14, padding: 20, background: 'rgba(10,13,20,.8)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 16 },
  cardTitle: { margin: '4px 0 14px', fontSize: 19 },
  serverGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 8 },
  serverButton: { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 13px', border: '1px solid rgba(255,255,255,.09)', borderRadius: 11, background: '#0d131d', color: '#dce1ea', cursor: 'pointer', fontWeight: 700, textAlign: 'left' },
  serverActive: { borderColor: '#ff1a75', background: 'rgba(255,26,117,.1)', color: '#fff' },
  check: { marginLeft: 'auto', color: '#ff4d94' },
  langRow: { display: 'flex', alignItems: 'center', gap: 7, marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,.07)', color: '#8f98a8', fontSize: 13 },
  lang: { border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '7px 11px', background: '#0d131d', color: '#bfc6d1', cursor: 'pointer' },
  langActive: { borderColor: '#ff1a75', color: '#fff' },
  drawer: { background: 'rgba(8,11,17,.9)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 16, alignSelf: 'start', position: 'sticky', top: 18, maxHeight: 'calc(100vh - 36px)', overflow: 'hidden' },
  drawerToggle: { width: '100%', padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'transparent', border: 0, color: '#fff', fontWeight: 900, cursor: 'pointer' },
  drawerBody: { padding: '0 10px 12px' },
  seasonRow: { display: 'flex', gap: 6, overflowX: 'auto', padding: '0 5px 10px' },
  season: { whiteSpace: 'nowrap', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, padding: '7px 10px', background: '#101620', color: '#9ea6b4', cursor: 'pointer' },
  seasonActive: { color: '#fff', borderColor: '#ff1a75', background: 'rgba(255,26,117,.1)' },
  epList: { maxHeight: 'calc(100vh - 145px)', overflowY: 'auto', display: 'grid', gap: 5 },
  ep: { display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', padding: 10, border: '1px solid transparent', borderRadius: 10, background: 'rgba(255,255,255,.025)', color: '#cdd3dc', cursor: 'pointer' },
  epActive: { background: 'rgba(255,26,117,.11)', borderColor: 'rgba(255,26,117,.55)', color: '#fff' },
  center: { minHeight: '60vh', display: 'grid', placeItems: 'center', alignContent: 'center', gap: 12, color: '#fff' },
  primary: { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '11px 16px', background: '#ff1a75', color: '#fff', borderRadius: 11, textDecoration: 'none', fontWeight: 800 }
};

export default MovieWatch;
