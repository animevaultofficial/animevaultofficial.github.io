import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Server } from 'lucide-react';
import { fetchMediaMeta } from '../api/movies';
import { PLAYER_SOURCES, getSourceUrl } from '../utils/playerSources';
import { storage } from '../utils/storage';
import { useUser } from '../api/UserContext';
import { isBlockedForProfile } from '../utils/ageRating';

export default function MovieWatch() {
  const { type, id } = useParams();
  const [params] = useSearchParams();
  const { activeSubAccount, addToHistory } = useUser();
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [server, setServer] = useState(params.get('server') || 'vidsrc');
  const [season, setSeason] = useState(Number(params.get('season')) || 1);
  const [episode, setEpisode] = useState(Number(params.get('episode')) || 1);

  const isMovie = type === 'movie';
  const isTV = type === 'tv' || type === 'series';
  const movieServers = PLAYER_SOURCES.filter(s => ['vidsrc', 'videasy', 'vidnest'].includes(s.id));

  useEffect(() => {
    if (!isMovie && !isTV) {
      setLoading(false);
      setError('This content type is temporarily unavailable.');
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchMediaMeta(isMovie ? 'movie' : 'tv', id)
      .then(data => {
        if (cancelled) return;
        if (!data) throw new Error('Media not found.');
        if (isBlockedForProfile(data, activeSubAccount)) throw new Error('This title is blocked for Kids profiles.');
        setMeta(data);
        if (isTV) {
          const first = (data.seasons || []).find(s => s.season_number === season) || data.seasons?.[0];
          if (first) setSeason(first.season_number);
          const firstEpisode = first?.episodes?.find(e => e.episode_number === episode) || first?.episodes?.[0];
          if (firstEpisode) setEpisode(firstEpisode.episode_number);
        }
      })
      .catch(e => { if (!cancelled) setError(e?.message || 'Unable to load player.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, type, isMovie, isTV, activeSubAccount]);

  const title = meta?.name || meta?.title || 'Unknown Title';
  const poster = meta?.poster || '';
  const backdrop = meta?.banner || poster;
  const seasons = useMemo(() => (meta?.seasons || []).filter(s => s.season_number > 0), [meta]);
  const currentSeason = seasons.find(s => s.season_number === season) || seasons[0];
  const episodes = currentSeason?.episodes || [];
  const currentEpisode = episodes.find(e => e.episode_number === episode) || episodes[0];

  useEffect(() => {
    if (!meta || !addToHistory) return;
    addToHistory(id, isMovie ? 'movie' : 'series', title, poster).catch?.(() => {});
  }, [meta, id, title, poster, isMovie, addToHistory]);

  // Critical provider fix: VidSrc movie playback uses IMDb when TMDB metadata supplies it.
  // Videasy and VidNest use TMDB IDs. TV providers continue using TMDB IDs.
  const providerId = isMovie && server === 'vidsrc' ? (meta?.imdb_id || meta?.tmdbId || id) : (meta?.tmdbId || id);
  const sourceUrl = meta ? getSourceUrl(
    server,
    isMovie ? 'movie' : 'tv',
    providerId,
    season,
    episode,
    {},
    storage.get('accentColor') || 'ff1a75'
  ) : '';

  const changeEpisode = delta => {
    const index = episodes.findIndex(e => e.episode_number === episode);
    const next = episodes[index + delta];
    if (next) setEpisode(next.episode_number);
  };

  if (loading) return <div style={styles.center}>Preparing player…</div>;
  if (error || !meta) return <div style={styles.center}><h2>{error || 'Media not found'}</h2><Link to="/dramas-movies" style={styles.back}><ArrowLeft size={17}/> Back</Link></div>;

  return <div style={styles.page}>
    <div style={{ ...styles.hero, backgroundImage: `linear-gradient(90deg,rgba(4,6,12,.98),rgba(4,6,12,.65)),url(${backdrop})` }}>
      <div style={styles.header}><Link to="/dramas-movies" style={styles.back}><ArrowLeft size={17}/> Back</Link><span style={styles.live}>LIVE PLAYER</span></div>
      <main style={styles.main}>
        <div style={styles.video}><iframe key={sourceUrl} src={sourceUrl} title={`${title} player`} style={styles.iframe} allow="autoplay; fullscreen; picture-in-picture; encrypted-media" referrerPolicy="no-referrer" allowFullScreen /></div>
        <div style={styles.now}><div><small>NOW PLAYING</small><h1>{title}</h1><p>{isMovie ? 'Movie' : `Season ${season} · Episode ${episode}`} · {server}</p></div>{isTV && <div style={styles.arrows}><button onClick={() => changeEpisode(-1)} disabled={!episodes.find(e => e.episode_number === episode - 1)}><ChevronLeft size={19}/></button><button onClick={() => changeEpisode(1)} disabled={!episodes.find(e => e.episode_number === episode + 1)}><ChevronRight size={19}/></button></div>}</div>
        <section style={styles.serverCard}><div style={styles.label}><Server size={15}/> PLAYBACK SERVER</div><div style={styles.serverGrid}>{movieServers.map(s => <button key={s.id} onClick={() => setServer(s.id)} style={{...styles.serverButton,...(server === s.id ? styles.active : {})}}>{s.label}{server === s.id && <b>✓</b>}</button>)}</div></section>
        {isTV && <section style={styles.episodeCard}><div style={styles.label}>SEASONS & EPISODES</div><div style={styles.seasons}>{seasons.map(s => <button key={s.season_number} onClick={() => { setSeason(s.season_number); setEpisode(s.episodes?.[0]?.episode_number || 1); }} style={season === s.season_number ? styles.active : styles.serverButton}>Season {s.season_number}</button>)}</div><div style={styles.episodes}>{episodes.map(e => <button key={e.episode_number} onClick={() => setEpisode(e.episode_number)} style={episode === e.episode_number ? styles.active : styles.serverButton}>E{String(e.episode_number).padStart(2,'0')} · {e.name || `Episode ${e.episode_number}`}</button>)}</div></section>}
      </main>
    </div>
  </div>;
}

const styles = {
  page:{minHeight:'100vh',background:'#05070c',color:'#fff'},
  hero:{minHeight:'100vh',backgroundSize:'cover',backgroundPosition:'center',backgroundAttachment:'fixed'},
  header:{maxWidth:1400,margin:'0 auto',padding:'22px 24px',display:'flex',justifyContent:'space-between'},
  back:{display:'inline-flex',alignItems:'center',gap:7,color:'#e8ebf2',textDecoration:'none',fontWeight:800},
  live:{color:'#ff5b9f',fontSize:11,fontWeight:900,letterSpacing:1.5},
  main:{maxWidth:1400,margin:'0 auto',padding:'10px 24px 50px'},
  video:{aspectRatio:'16/9',background:'#000',borderRadius:18,overflow:'hidden',border:'1px solid rgba(255,255,255,.1)'},
  iframe:{width:'100%',height:'100%',border:0,display:'block'},
  now:{marginTop:14,padding:18,display:'flex',justifyContent:'space-between',alignItems:'center',gap:15,background:'rgba(10,13,20,.88)',border:'1px solid rgba(255,255,255,.08)',borderRadius:16},
  nowTitle:{margin:0},
  nowP:{color:'#929bab'},
  arrows:{display:'flex',gap:7},
  center:{minHeight:'70vh',display:'grid',placeItems:'center',alignContent:'center',gap:14,background:'#05070c',color:'#fff'},
  serverCard:{marginTop:14,padding:20,background:'rgba(10,13,20,.88)',border:'1px solid rgba(255,255,255,.08)',borderRadius:16},
  episodeCard:{marginTop:14,padding:20,background:'rgba(10,13,20,.88)',border:'1px solid rgba(255,255,255,.08)',borderRadius:16},
  label:{display:'flex',alignItems:'center',gap:7,color:'#ff5b9f',fontSize:11,fontWeight:900,letterSpacing:1.5,marginBottom:12},
  serverGrid:{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:8},
  seasons:{display:'flex',gap:7,overflowX:'auto',marginBottom:12},
  episodes:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:7},
  serverButton:{padding:'11px 13px',border:'1px solid rgba(255,255,255,.1)',borderRadius:10,background:'#0d131d',color:'#dce1ea',cursor:'pointer',fontWeight:700,textAlign:'left'},
  active:{padding:'11px 13px',border:'1px solid #ff1a75',borderRadius:10,background:'rgba(255,26,117,.12)',color:'#fff',cursor:'pointer',fontWeight:800,textAlign:'left'},
};
