import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Clock, Heart, Play, Search, Share2, Star, Tv, Users } from 'lucide-react';
import { fetchAnimeById } from '../api/anilist';
import { fetchAnikotoSeries } from '../utils/animeStreamingServer';
import { useUser } from '../api/UserContext';
import { isBlockedForProfile } from '../utils/ageRating';

const PAGE_SIZE = 50;
const titleOf = (t) => t?.english || t?.romaji || t?.native || 'Unknown Title';
const clean = (html = '') => String(html).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

function AnimeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, activeSubAccount, toggleLike, isLiked, addToHistory } = useUser();
  const [anime, setAnime] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [season, setSeason] = useState('All Episodes');
  const [episodePage, setEpisodePage] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [language, setLanguage] = useState('sub');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError('');
      try {
        const media = await fetchAnimeById(id);
        if (!media) throw new Error('Anime not found.');
        if (isBlockedForProfile(media, activeSubAccount)) throw new Error('This title is blocked for Kids profiles.');
        let eps = [];
        if (media.idMal) {
          try {
            const series = await fetchAnikotoSeries(media.idMal);
            if (Array.isArray(series?.episodes)) eps = series.episodes.map((e, i) => ({ id: e.id || e.episode_id || `ep-${i + 1}`, number: Number(e.number || e.episode || i + 1), title: e.title || `Episode ${Number(e.number || e.episode || i + 1)}`, image: e.image || e.thumbnail || '' }));
          } catch {}
        }
        if (!eps.length) {
          const count = media.nextAiringEpisode?.episode ? media.nextAiringEpisode.episode - 1 : media.episodes;
          const total = Math.max(0, Math.min(Number(count) || 0, 500));
          eps = Array.from({ length: total }, (_, i) => ({ id: `ep-${media.id}-${i + 1}`, number: i + 1, title: `Episode ${i + 1}`, image: '' }));
        }
        if (!cancelled) { setAnime(media); setEpisodes(eps); setEpisodePage(0); }
      } catch (e) { if (!cancelled) setError(e?.message || 'Unable to load anime.'); }
      finally { if (!cancelled) setLoading(false); }
    })();
    window.scrollTo(0, 0);
    return () => { cancelled = true; };
  }, [id, activeSubAccount]);

  useEffect(() => {
    if (user && anime) addToHistory(anime.id, 'anime', titleOf(anime.title), anime.coverImage?.large || anime.coverImage?.extraLarge).catch?.(() => {});
  }, [user, anime]);

  const filteredEpisodes = useMemo(() => episodes.filter(e => season === 'All Episodes' || String(e.season || 1) === String(season)), [episodes, season]);
  const totalPages = Math.max(1, Math.ceil(filteredEpisodes.length / PAGE_SIZE));
  const visibleEpisodes = filteredEpisodes.slice(episodePage * PAGE_SIZE, (episodePage + 1) * PAGE_SIZE);
  const seasons = [...new Set(episodes.map(e => e.season).filter(Boolean))].sort((a, b) => Number(a) - Number(b));
  const title = titleOf(anime?.title);
  const firstEpisode = episodes[0];

  const play = (ep = firstEpisode) => {
    if (!ep) return;
    navigate(`/watch/anime/${encodeURIComponent(anime.id)}?episode=${ep.number}&lang=${language}`);
  };

  if (loading) return <div style={styles.center}><div className="spinner" /><p>Loading title…</p></div>;
  if (error || !anime) return <div style={styles.center}><h2>{error || 'Anime not found'}</h2><Link to="/anime" style={styles.primary}>Back to Anime</Link></div>;

  return <div style={styles.page}>
    <section style={styles.hero}>
      <img src={anime.bannerImage || anime.coverImage?.extraLarge || anime.coverImage?.large} alt="" style={styles.backdrop} />
      <div style={styles.scrim} />
      <div style={styles.heroContent}>
        <img src={anime.coverImage?.extraLarge || anime.coverImage?.large} alt={title} style={styles.poster} />
        <div style={styles.heroInfo}>
          <div style={styles.kicker}>ANIME • ANIMEVAULT</div>
          <h1 style={styles.title}>{title}</h1>
          {anime.title?.native && anime.title.native !== title && <div style={styles.native}>{anime.title.native}</div>}
          <div style={styles.meta}>
            <span><Star size={15} fill="currentColor" /> {anime.averageScore ?? '—'}%</span>
            <span><Tv size={15} /> {anime.format || 'TV'}</span>
            <span><Users size={15} /> {anime.status || '—'}</span>
            {anime.seasonYear && <span><Calendar size={15} /> {anime.seasonYear}</span>}
            {anime.episodes && <span><Play size={15} /> {anime.episodes} eps</span>}
          </div>
          <div style={styles.genres}>{(anime.genres || []).slice(0, 5).map(g => <span key={g}>{g}</span>)}</div>
          <p style={styles.description}>{clean(anime.description) || 'No description available.'}</p>
          <div style={styles.actions}>
            <button style={styles.primary} onClick={() => play()}><Play size={18} fill="currentColor" /> Watch Now</button>
            <button style={styles.secondary} onClick={() => toggleLike(anime.id, 'anime', title, anime.coverImage?.large)}><Heart size={18} fill={isLiked(anime.id, 'anime') ? 'currentColor' : 'none'} /> {isLiked(anime.id, 'anime') ? 'In Collection' : 'Add to Collection'}</button>
            <button style={styles.iconButton} onClick={() => navigator.share?.({ title, url: window.location.href })}><Share2 size={18} /></button>
          </div>
        </div>
      </div>
    </section>

    <section style={styles.body}>
      <div style={styles.toolbar}>
        <div><div style={styles.sectionKicker}>WATCH</div><h2 style={styles.heading}>Episodes</h2><p style={styles.subheading}>{episodes.length ? `${episodes.length} episodes available` : 'No episodes available yet'}</p></div>
        <div style={styles.controls}>
          <button style={styles.select} onClick={() => setDrawerOpen(v => !v)}><span>{drawerOpen ? 'Hide' : 'Show'} episodes</span><ChevronDown size={16} /></button>
          <select value={language} onChange={e => setLanguage(e.target.value)} style={styles.select}><option value="sub">SUB</option><option value="dub">DUB</option></select>
          {seasons.length > 0 && <select value={season} onChange={e => { setSeason(e.target.value); setEpisodePage(0); }} style={styles.select}><option>All Episodes</option>{seasons.map(s => <option key={s}>Season {s}</option>)}</select>}
        </div>
      </div>

      {drawerOpen && <div style={styles.episodeDrawer}>
        <div style={styles.drawerHeader}><span>Episode list</span><span>{filteredEpisodes.length} results</span></div>
        <div style={styles.episodeGrid}>{visibleEpisodes.map(ep => <button key={ep.id} onClick={() => play(ep)} style={{ ...styles.episode, ...(firstEpisode?.number === ep.number ? styles.episodeActive : {}) }}><span style={styles.epNumber}>{String(ep.number).padStart(2, '0')}</span><span style={styles.epText}>{ep.title}</span><Play size={15} /></button>)}</div>
        {totalPages > 1 && <div style={styles.pagination}><button disabled={episodePage === 0} style={styles.pageButton} onClick={() => setEpisodePage(p => Math.max(0, p - 1))}><ChevronLeft size={17} /></button><span>Page {episodePage + 1} / {totalPages}</span><button disabled={episodePage >= totalPages - 1} style={styles.pageButton} onClick={() => setEpisodePage(p => Math.min(totalPages - 1, p + 1))}><ChevronRight size={17} /></button></div>}
      </div>}

      <div style={styles.infoGrid}>
        <article style={styles.card}><div style={styles.sectionKicker}>ABOUT THE SERIES</div><h3 style={styles.cardTitle}>Details</h3><p style={styles.cardText}>{clean(anime.description) || 'No description available.'}</p></article>
        <article style={styles.card}><div style={styles.sectionKicker}>AT A GLANCE</div><h3 style={styles.cardTitle}>Information</h3><div style={styles.infoRows}><span>Format<strong>{anime.format || 'TV'}</strong></span><span>Status<strong>{anime.status || 'Unknown'}</strong></span><span>Year<strong>{anime.seasonYear || 'Unknown'}</strong></span><span>Episodes<strong>{anime.episodes || episodes.length || 'Unknown'}</strong></span><span>Score<strong>{anime.averageScore ?? '—'}%</strong></span><span>Studio<strong>{anime.studios?.nodes?.[0]?.name || 'Unknown'}</strong></span></div></article>
      </div>
      <Link to="/anime" style={styles.back}><Search size={16} /> Browse more anime</Link>
    </section>
  </div>;
}

const styles = {
  page:{maxWidth:1400,margin:'0 auto',paddingBottom:60}, hero:{position:'relative',minHeight:520,borderRadius:'0 0 28px 28px',overflow:'hidden',background:'#080b12'}, backdrop:{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity:.62}, scrim:{position:'absolute',inset:0,background:'linear-gradient(90deg,rgba(4,6,12,.98) 0%,rgba(4,6,12,.82) 42%,rgba(4,6,12,.3) 100%),linear-gradient(0deg,#080b12 0%,transparent 45%)'}, heroContent:{position:'relative',zIndex:1,minHeight:520,maxWidth:1200,margin:'0 auto',padding:'80px 28px 55px',display:'flex',alignItems:'flex-end',gap:32},poster:{width:250,height:365,objectFit:'cover',borderRadius:18,boxShadow:'0 24px 70px rgba(0,0,0,.5)',border:'1px solid rgba(255,255,255,.12)'},heroInfo:{maxWidth:760},kicker:{fontSize:12,fontWeight:800,letterSpacing:2,color:'#ff4d94',marginBottom:10},title:{fontSize:'clamp(2.2rem,5vw,4.6rem)',lineHeight:1.02,margin:'0 0 8px',fontWeight:900},native:{color:'#b8bfca',marginBottom:16},meta:{display:'flex',flexWrap:'wrap',gap:16,color:'#d9dee7',fontSize:14,marginBottom:16},genres:{display:'flex',gap:7,flexWrap:'wrap',marginBottom:16},description:{color:'#c5cad4',lineHeight:1.7,maxWidth:720,fontSize:15},actions:{display:'flex',gap:10,flexWrap:'wrap',marginTop:24},primary:{display:'inline-flex',alignItems:'center',gap:8,border:0,borderRadius:12,padding:'12px 18px',background:'#ff1a75',color:'#fff',fontWeight:800,cursor:'pointer'},secondary:{display:'inline-flex',alignItems:'center',gap:8,border:'1px solid rgba(255,255,255,.14)',borderRadius:12,padding:'12px 18px',background:'rgba(255,255,255,.06)',color:'#fff',fontWeight:700,cursor:'pointer'},iconButton:{display:'grid',placeItems:'center',width:44,border:'1px solid rgba(255,255,255,.14)',borderRadius:12,background:'rgba(255,255,255,.06)',color:'#fff',cursor:'pointer'},body:{padding:'38px 28px'},toolbar:{display:'flex',justifyContent:'space-between',alignItems:'end',gap:20,marginBottom:18,flexWrap:'wrap'},sectionKicker:{fontSize:11,fontWeight:900,letterSpacing:1.8,color:'#ff4d94'},heading:{fontSize:30,margin:'4px 0'},subheading:{color:'#8e97a6',margin:0},controls:{display:'flex',gap:8,flexWrap:'wrap'},select:{display:'inline-flex',alignItems:'center',gap:8,minHeight:40,padding:'0 12px',border:'1px solid rgba(255,255,255,.12)',borderRadius:10,background:'#111722',color:'#fff'},episodeDrawer:{background:'rgba(255,255,255,.035)',border:'1px solid rgba(255,255,255,.08)',borderRadius:18,padding:16},drawerHeader:{display:'flex',justifyContent:'space-between',color:'#9ba3b2',fontSize:13,marginBottom:12},episodeGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))',gap:8,maxHeight:520,overflow:'auto'},episode:{display:'flex',alignItems:'center',gap:10,textAlign:'left',padding:12,border:'1px solid rgba(255,255,255,.07)',borderRadius:11,background:'#0d131d',color:'#e7eaf0',cursor:'pointer'},episodeActive:{borderColor:'#ff1a75',background:'rgba(255,26,117,.09)'},epNumber:{fontWeight:900,color:'#ff4d94',width:28},epText:{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'},pagination:{display:'flex',justifyContent:'center',alignItems:'center',gap:15,paddingTop:16,color:'#9ba3b2'},pageButton:{display:'grid',placeItems:'center',width:38,height:38,border:'1px solid rgba(255,255,255,.1)',borderRadius:9,background:'#111722',color:'#fff'},infoGrid:{display:'grid',gridTemplateColumns:'1.4fr 1fr',gap:16,marginTop:24},card:{padding:22,border:'1px solid rgba(255,255,255,.08)',borderRadius:18,background:'rgba(255,255,255,.025)'},cardTitle:{fontSize:21,margin:'5px 0 12px'},cardText:{color:'#aeb5c2',lineHeight:1.75},infoRows:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14},infoRowsItem:{color:'#8f98a8'},back:{display:'inline-flex',gap:8,alignItems:'center',marginTop:24,color:'#ff4d94',textDecoration:'none'},center:{minHeight:'55vh',display:'grid',placeItems:'center',alignContent:'center',gap:12,color:'#fff'}
};

export default AnimeDetails;
