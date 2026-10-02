import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronRight, Play, Search, Sparkles, TrendingUp } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getAniPMSchedule, getAniPMTop, getAniPMRecent } from '../api/anipm';


function isHentai(item) {
  const values = [
    item?.genres,
    item?.genre,
    item?.tags,
    item?.type,
    item?.format,
    item?.rating,
    item?.contentRating,
  ];
  return values.some(value => {
    if (Array.isArray(value)) return value.some(entry => String(entry?.name ?? entry).trim().toLowerCase() === 'hentai');
    return String(value?.name ?? value ?? '').trim().toLowerCase() === 'hentai';
  });
}

function Card({ item }) {
  const navigate = useNavigate();
  return <button type="button" onClick={() => navigate('/anime/' + item.anilistId)} style={styles.card}>
    <div style={styles.posterWrap}><img src={item.poster} alt="" loading="lazy" style={styles.poster}/><span style={styles.play}><Play size={14} fill="currentColor"/></span></div>
    <div style={styles.cardBody}><strong>{item.title}</strong><span>{item.year || 'Anime'}{item.format ? ' · ' + item.format : ''}</span></div>
  </button>;
}
export default function AnimeHome() {
  const [top, setTop] = useState([]), [recent, setRecent] = useState([]), [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true), [query, setQuery] = useState('');
  useEffect(() => {
    let cancelled = false;
    Promise.all([getAniPMTop('week', 24).catch(() => []), getAniPMRecent(1, 24).catch(() => []), getAniPMSchedule().catch(() => [])])
      .then(([t,r,s]) => { if (cancelled) return; setTop(Array.isArray(t) ? t.filter(item => !isHentai(item)) : []); setRecent(Array.isArray(r) ? r.filter(item => !isHentai(item)) : []); setSchedule(Array.isArray(s) ? s.filter(item => !isHentai(item)) : []); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  const latestTitles = useMemo(() => { const seen = new Set(); return recent.filter(item => { if (seen.has(item.anilistId)) return false; seen.add(item.anilistId); return true; }); }, [recent]);
  const submit = e => { e.preventDefault(); if (query.trim()) window.location.hash = '/search?q=' + encodeURIComponent(query.trim()); };
  return <div style={styles.page}>
    <section style={styles.hero}><div><div style={styles.kicker}><Sparkles size={15}/> ANIME IS BACK</div><h1 style={styles.heroH}>Watch anime on AnimeVault.</h1><p>Browse the latest releases, what is trending and this week's schedule — powered by the ani.pm catalogue.</p><form onSubmit={submit} style={styles.search}><Search size={18}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search anime..." aria-label="Search anime" style={styles.searchInput}/><button type="submit">Search</button></form></div></section>
    {loading ? <div style={styles.loading}>Loading anime catalogue…</div> : <><Section icon={<TrendingUp size={19}/>} title="Trending This Week" items={top}/><Section icon={<Sparkles size={19}/>} title="Recently Added" items={latestTitles}/><section style={styles.section}><div style={styles.heading}><div><h2><CalendarDays size={19}/> This Week's Schedule</h2><p>Upcoming releases and ani.pm availability.</p></div></div><div style={styles.schedule}>{schedule.slice(0,20).map((item,index) => <Link key={item.anilistId + '-' + item.episode + '-' + item.kind + '-' + index} to={'/anime/' + item.anilistId + '?episode=' + item.episode + '&lang=' + (item.kind === 'dub' ? 'dub' : 'sub')} style={styles.scheduleItem}><div><strong>{item.title}</strong><span>Episode {item.episode} · {item.kind?.toUpperCase()}</span></div><small>{item.onAniPm ? 'Available' : 'Not available yet'}</small><ChevronRight size={17}/></Link>)}{!schedule.length && <div style={styles.empty}>No schedule data available right now.</div>}</div></section></>}
  </div>;
}
function Section({ icon, title, items }) {
  return <section style={styles.section}><div style={styles.heading}><div><h2>{icon} {title}</h2><p>Discover anime ready to watch.</p></div><Link to="/search" style={styles.view}>Search all <ChevronRight size={17}/></Link></div>{items.length ? <div style={styles.grid}>{items.slice(0,12).map((item,index) => <Card key={item.anilistId + '-' + index} item={item}/>)}</div> : <div style={styles.empty}>Nothing available right now.</div>}</section>;
}
const styles={page:{minHeight:'70vh',maxWidth:1500,margin:'0 auto',padding:'8px 24px 60px',color:'#fff'},hero:{padding:'clamp(32px,7vw,76px) clamp(20px,5vw,64px)',borderRadius:22,background:'linear-gradient(135deg,rgba(255,26,117,.18),rgba(11,16,25,.96) 55%)',border:'1px solid rgba(255,255,255,.08)'},kicker:{display:'inline-flex',alignItems:'center',gap:7,color:'#ff5b9f',fontSize:12,fontWeight:900,letterSpacing:1.4},heroH:{fontSize:'clamp(2rem,5vw,4rem)',lineHeight:1.02,margin:'12px 0'},search:{marginTop:24,maxWidth:680,display:'flex',alignItems:'center',gap:10,padding:10,borderRadius:12,background:'rgba(0,0,0,.35)',border:'1px solid rgba(255,255,255,.1)'},searchInput:{flex:1,minWidth:0,background:'transparent',border:0,outline:0,color:'#fff',fontSize:16},section:{marginTop:30},heading:{display:'flex',justifyContent:'space-between',alignItems:'end',gap:12,marginBottom:14},grid:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:14},card:{padding:0,textAlign:'left',border:0,background:'transparent',color:'#fff',cursor:'pointer',minWidth:0},posterWrap:{position:'relative',aspectRatio:'2/3',borderRadius:12,overflow:'hidden',background:'#0d131d'},poster:{width:'100%',height:'100%',objectFit:'cover',display:'block'},play:{position:'absolute',right:8,bottom:8,width:34,height:34,borderRadius:'50%',display:'grid',placeItems:'center',background:'#ff1a75'},cardBody:{padding:'9px 2px 0',display:'grid',gap:4},schedule:{display:'grid',gap:8},scheduleItem:{display:'grid',gridTemplateColumns:'1fr auto auto',alignItems:'center',gap:12,padding:'13px 15px',borderRadius:12,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.07)',color:'#fff',textDecoration:'none'},view:{display:'inline-flex',alignItems:'center',gap:3,color:'#ff5b9f',textDecoration:'none',fontWeight:800,fontSize:13},loading:{padding:'80px 0',textAlign:'center',color:'#94a3b8'},empty:{padding:30,textAlign:'center',color:'#64748b',background:'rgba(255,255,255,.02)',borderRadius:12}};