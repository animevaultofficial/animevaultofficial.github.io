import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Languages, ListVideo, Play, RefreshCw } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { getAniPMSeries, aniPMEmbedUrl } from '../api/anipm';
import { useUser } from '../api/UserContext';
import { isBlockedForProfile } from '../utils/ageRating';

const ORIGIN = 'https://ani.pm';

function storageKey(id, episode, lang) {
  return `animevault:anipm-progress:${id}:${episode}:${lang}`;
}

export default function AnimeWatch() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const { activeSubAccount, addToHistory } = useUser();
  const frameRef = useRef(null);
  const [series, setSeries] = useState(null);
  const [episode, setEpisode] = useState(Number(params.get('episode')) || 1);
  const [lang, setLang] = useState(params.get('lang') === 'dub' ? 'dub' : 'sub');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [playerState, setPlayerState] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    getAniPMSeries(id)
      .then(data => {
        if (cancelled) return;
        if (!data) throw new Error('Anime not found on ani.pm.');
        if (isBlockedForProfile(data, activeSubAccount)) throw new Error('This title is blocked for Kids profiles.');
        setSeries(data);
        const requested = Number(params.get('episode')) || 1;
        const available = data.episodeList?.find(item => item.number === requested);
        setEpisode(available ? requested : data.episodeList?.[0]?.number || 1);
      })
      .catch(err => { if (!cancelled) setError(err?.message || 'Unable to load anime.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, activeSubAccount]);

  const episodes = useMemo(() => series?.episodeList || [], [series]);
  const current = episodes.find(item => item.number === episode) || episodes[0];
  const effectiveLang = current?.available?.[lang] ? lang : (current?.available?.sub ? 'sub' : 'dub');
  // Read resume position only when the episode/language changes. The player emits
  // timeupdate events frequently; reading live localStorage during every render
  // would change the iframe src and remount the player repeatedly.
  const progress = useMemo(
    () => Number(localStorage.getItem(storageKey(id, episode, effectiveLang)) || 0),
    [id, episode, effectiveLang]
  );

  useEffect(() => {
    if (effectiveLang !== lang) setLang(effectiveLang);
  }, [effectiveLang, lang]);

  useEffect(() => {
    if (!series || !addToHistory) return;
    addToHistory(String(series.anilistId || id), 'anime', series.title || 'Anime', series.poster || '').catch?.(() => {});
  }, [series, id, addToHistory]);

  const frameSrc = current
    ? aniPMEmbedUrl({
        anilistId: series.anilistId || id,
        episode: current.number,
        lang: effectiveLang,
        color: 'ff1a75',
        autonext: 1,
        autoskip: 0,
        episodes: 1,
        adult: 1,
        api: 1,
        start: progress > 5 ? Math.floor(progress) : 0,
      })
    : '';

  useEffect(() => {
    const onMessage = event => {
      if (event.origin !== ORIGIN || event.source !== frameRef.current?.contentWindow) return;
      const data = event.data;
      if (!data || data.ns !== 'anipm.player' || data.v !== 1) return;
      if (data.event) {
        setPlayerState(data.data || {});
        if (data.event === 'timeupdate' && data.data?.currentTime != null) {
          localStorage.setItem(storageKey(id, episode, effectiveLang), String(Math.floor(data.data.currentTime)));
        }
        if (data.event === 'episodechange' && data.data?.episode) {
          setEpisode(Number(data.data.episode));
          setParams(prev => {
            const next = new URLSearchParams(prev);
            next.set('episode', String(data.data.episode));
            next.set('lang', data.data.lang || effectiveLang);
            return next;
          }, { replace: true });
        }
        if (data.event === 'languagechange' && data.data?.lang) {
          setLang(data.data.lang);
          setParams(prev => {
            const next = new URLSearchParams(prev);
            next.set('lang', data.data.lang);
            return next;
          }, { replace: true });
        }
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [id, episode, effectiveLang, setParams]);

  const send = (cmd, args = {}) => {
    frameRef.current?.contentWindow?.postMessage({ ns: 'anipm.player', v: 1, cmd, args }, ORIGIN);
  };

  const chooseEpisode = number => {
    const item = episodes.find(ep => ep.number === number);
    if (!item) return;
    const nextLang = item.available?.[lang] ? lang : (item.available?.sub ? 'sub' : 'dub');
    setEpisode(number);
    setLang(nextLang);
    setParams({ episode: String(number), lang: nextLang }, { replace: true });
  };

  const chooseLanguage = nextLang => {
    if (!current?.available?.[nextLang]) return;
    setLang(nextLang);
    setParams({ episode: String(episode), lang: nextLang }, { replace: true });
    send('setLanguage', { lang: nextLang });
  };

  const nextEpisode = () => {
    const index = episodes.findIndex(ep => ep.number === episode);
    if (index >= 0 && episodes[index + 1]) chooseEpisode(episodes[index + 1].number);
  };

  const previousEpisode = () => {
    const index = episodes.findIndex(ep => ep.number === episode);
    if (index > 0) chooseEpisode(episodes[index - 1].number);
  };

  if (loading) return <div style={styles.center}>Preparing anime player…</div>;
  if (error || !series) return <div style={styles.center}><h2>{error || 'Anime not found'}</h2><Link to="/" style={styles.back}><ArrowLeft size={17}/> Back to AnimeVault</Link></div>;
  if (!current) return <div style={styles.center}><h2>No playable episodes are currently available.</h2><Link to="/" style={styles.back}><ArrowLeft size={17}/> Back</Link></div>;

  const title = series.title || 'Anime';
  const hasDub = current.available?.dub;
  const hasSub = current.available?.sub;
  const episodeTitle = current.title || `Episode ${current.number}`;

  return <div style={styles.page}>
    <div style={styles.header}>
      <Link to="/" style={styles.back}><ArrowLeft size={17}/> AnimeVault</Link>
      <span style={styles.badge}>ANI.PM PLAYER</span>
    </div>
    <main style={styles.main}>
      <section style={styles.playerShell}>
        <iframe
          ref={frameRef}
          key={frameSrc}
          src={frameSrc}
          title={`${title} episode ${current.number}`}
          style={styles.iframe}
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
        />
      </section>

      <section style={styles.info}>
        <div style={styles.titleRow}>
          <div>
            <div style={styles.eyebrow}>NOW WATCHING</div>
            <h1 style={styles.title}>{title}</h1>
            <p style={styles.muted}>Episode {current.number}{episodeTitle !== `Episode ${current.number}` ? ` · ${episodeTitle}` : ''}</p>
          </div>
          <div style={styles.controls}>
            <button type="button" onClick={previousEpisode} disabled={!episodes.find(ep => ep.number === episode - 1)} style={styles.control}><ChevronLeft size={18}/></button>
            <button type="button" onClick={nextEpisode} disabled={!episodes.find(ep => ep.number === episode + 1)} style={styles.control}><ChevronRight size={18}/></button>
          </div>
        </div>
        <div style={styles.toolbar}>
          <Languages size={16}/>
          <span>Audio</span>
          <button type="button" disabled={!hasSub} onClick={() => chooseLanguage('sub')} style={effectiveLang === 'sub' ? styles.activeChip : styles.chip}>SUB</button>
          <button type="button" disabled={!hasDub} onClick={() => chooseLanguage('dub')} style={effectiveLang === 'dub' ? styles.activeChip : styles.chip}>DUB</button>
          {progress > 5 && <span style={styles.resume}><Play size={13}/> Resuming at {Math.floor(progress / 60)}:{String(Math.floor(progress % 60)).padStart(2, '0')}</span>}
          {playerState?.quality?.height && <span style={styles.quality}>{playerState.quality.height}p</span>}
        </div>
      </section>

      <section style={styles.episodePanel}>
        <div style={styles.panelHead}><span><ListVideo size={17}/> Episodes</span><small>{episodes.length} episodes</small></div>
        <div style={styles.episodes}>
          {episodes.map(ep => {
            const available = ep.available?.[lang] || ep.available?.sub || ep.available?.dub;
            return <button
              type="button"
              key={ep.number}
              disabled={!available}
              onClick={() => chooseEpisode(ep.number)}
              style={ep.number === episode ? styles.episodeActive : styles.episode}
              title={ep.title || `Episode ${ep.number}`}
            >
              <b>{String(ep.number).padStart(2, '0')}</b>
              <span>{ep.title || `Episode ${ep.number}`}</span>
              <small>{ep.available?.dub ? 'DUB' : ''}{ep.available?.dub && ep.available?.sub ? ' · ' : ''}{ep.available?.sub ? 'SUB' : ''}</small>
            </button>;
          })}
        </div>
      </section>
    </main>
    <style>{`
      @media(max-width:700px){.anime-watch-main{padding:.5rem}.anime-watch-player{border-radius:10px}.anime-watch-title{font-size:1.4rem!important}.anime-watch-episodes{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
    `}</style>
  </div>;
}

const styles = {
  page:{minHeight:'100vh',background:'#05070c',color:'#fff'},
  header:{maxWidth:1500,margin:'0 auto',padding:'18px 24px',display:'flex',justifyContent:'space-between',alignItems:'center'},
  back:{display:'inline-flex',alignItems:'center',gap:7,color:'#e8ebf2',textDecoration:'none',fontWeight:800},
  badge:{fontSize:11,fontWeight:900,letterSpacing:1.5,color:'#ff5b9f'},
  main:{maxWidth:1500,margin:'0 auto',padding:'6px 24px 50px'},
  playerShell:{width:'100%',aspectRatio:'16/9',background:'#000',borderRadius:18,overflow:'hidden',border:'1px solid rgba(255,255,255,.1)',boxShadow:'0 20px 80px rgba(0,0,0,.35)'},
  iframe:{width:'100%',height:'100%',display:'block',border:0},
  info:{marginTop:14,padding:20,background:'rgba(10,13,20,.9)',border:'1px solid rgba(255,255,255,.08)',borderRadius:16},
  titleRow:{display:'flex',justifyContent:'space-between',alignItems:'center',gap:18},
  eyebrow:{fontSize:11,fontWeight:900,letterSpacing:1.5,color:'#ff5b9f'},
  title:{margin:'5px 0 4px',fontSize:'clamp(1.5rem,3vw,2.2rem)'},
  muted:{margin:0,color:'#929bab'},
  controls:{display:'flex',gap:7},
  control:{width:42,height:42,border:'1px solid rgba(255,255,255,.1)',borderRadius:10,background:'#0d131d',color:'#fff',cursor:'pointer'},
  toolbar:{display:'flex',alignItems:'center',gap:9,flexWrap:'wrap',marginTop:18,color:'#bfc5d0'},
  chip:{padding:'8px 12px',border:'1px solid rgba(255,255,255,.1)',borderRadius:9,background:'#0d131d',color:'#dce1ea',cursor:'pointer',fontWeight:800},
  activeChip:{padding:'8px 12px',border:'1px solid #ff1a75',borderRadius:9,background:'rgba(255,26,117,.14)',color:'#fff',cursor:'pointer',fontWeight:900},
  resume:{display:'inline-flex',alignItems:'center',gap:5,color:'#aeb6c3',fontSize:13},
  quality:{marginLeft:'auto',fontSize:12,color:'#858d9b'},
  episodePanel:{marginTop:14,padding:20,background:'rgba(10,13,20,.9)',border:'1px solid rgba(255,255,255,.08)',borderRadius:16},
  panelHead:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,color:'#fff',fontWeight:850},
  episodes:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(230px,1fr))',gap:8},
  episode:{minWidth:0,padding:'11px 12px',display:'grid',gridTemplateColumns:'36px 1fr auto',gap:8,alignItems:'center',border:'1px solid rgba(255,255,255,.08)',borderRadius:10,background:'#0b1018',color:'#dce1ea',cursor:'pointer',textAlign:'left'},
  episodeActive:{minWidth:0,padding:'11px 12px',display:'grid',gridTemplateColumns:'36px 1fr auto',gap:8,alignItems:'center',border:'1px solid #ff1a75',borderRadius:10,background:'rgba(255,26,117,.12)',color:'#fff',cursor:'pointer',textAlign:'left'},
  center:{minHeight:'70vh',display:'grid',placeItems:'center',alignContent:'center',gap:14,background:'#05070c',color:'#fff'},
};
