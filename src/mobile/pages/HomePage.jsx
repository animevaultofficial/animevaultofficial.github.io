import React, { useState, useEffect } from 'react';
import { TrendingUp, Flame, Clock, Sparkles, Calendar } from 'lucide-react';
import { useUser } from '../../api/UserContext';
import { fetchHomeData, getTitle, getImage } from '../api/anilist';
import { getContinueWatching } from '../api/storage';

const ANILIST_URL = 'https://graphql.anilist.co';
const SEASONAL_QUERY = `query ($season: MediaSeason, $year: Int) { Page(page: 1, perPage: 20) { media(season: $season, seasonYear: $year, type: ANIME, isAdult: false, sort: POPULARITY_DESC) { id title { romaji english } coverImage { large extraLarge } averageScore format episodes seasonYear } } }`;
async function fetchAnimeBySeason(season, year) {
  try { const r = await fetch(ANILIST_URL, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({query:SEASONAL_QUERY,variables:{season,year}}) }); const j = await r.json(); return j.data?.Page?.media || []; } catch { return []; }
}

const SEASONS = ['WINTER','SPRING','SUMMER','FALL'];
const CY = new Date().getFullYear();

function Img({ src, alt, cls, fb = '🎬' }) {
  const [f,setF] = useState(false);
  if (!src || f) return <div className={`${cls} shimmer`} style={{display:'flex',alignItems:'center',justifyContent:'center',fontSize:'2rem'}}>{fb}</div>;
  return <img src={src} alt={alt} className={cls} onError={()=>setF(true)} loading="lazy" />;
}

function ACard({ m, onClick }) {
  const t = getTitle(m), img = getImage(m,'large'), s = m.averageScore;
  return (
    <div className="card" onClick={() => onClick?.(m.id)}>
      <div style={{position:'relative'}}>
        <Img src={img} alt={t} cls="card-img" />
        {s && <span className="stat-pill" style={{position:'absolute',top:4,left:4,fontSize:'.55rem',padding:'2px 6px'}}>⭐ {s}%</span>}
        {m.episodes && <span style={{position:'absolute',bottom:4,right:4,background:'rgba(0,0,0,.7)',color:'#fff',fontSize:'.55rem',padding:'1px 6px',borderRadius:4}}>{m.episodes}EP</span>}
      </div>
      <div className="card-body">
        <div className="card-title">{t}</div>
        <div className="card-sub">{m.format || ''}</div>
      </div>
    </div>
  );
}

function GCard({ m, onClick }) {
  return (
    <div className="gcard" onClick={() => onClick?.(m.id)}>
      <Img src={getImage(m)} alt={getTitle(m)} cls="gcard-img" />
      <div className="gcard-title">{getTitle(m)}</div>
    </div>
  );
}

export default function HomePage({ navigate }) {
  const { continueWatching: syncedContinue } = useUser();
  const nav = (id) => navigate('anime-detail', { id });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seasonal, setSeasonal] = useState([]);
  const [sLoading, setSLoading] = useState(false);
  const [selSeason, setSelSeason] = useState('SPRING');
  const [selYear, setSelYear] = useState(CY);
  const [slide, setSlide] = useState(0);
  const cw = syncedContinue?.length
    ? syncedContinue.map(item => ({
        id: item.media_id || item.id,
        title: item.media_title || item.title,
        image: item.media_poster || item.image,
      })).filter(item => item.id)
    : getContinueWatching();

  useEffect(() => { fetchHomeData().then(setData).catch(console.error).finally(()=>setLoading(false)); }, []);
  useEffect(() => { if (!data) return; const i = setInterval(() => { const t = data?.trending?.media || []; setSlide(p => (p+1) % Math.min(5, t.length)); }, 6000); return () => clearInterval(i); }, [data]);
  useEffect(() => { async function l() { setSLoading(true); try { const d = await fetchAnimeBySeason(selSeason, selYear); setSeasonal(d || []); } catch {} setSLoading(false); } l(); }, [selSeason, selYear]);

  if (loading) return (
    <div className="page">
      <div className="shimmer" style={{width:'100%',height:200,borderRadius:18,marginBottom:16}} />
      <div className="sec"><div className="shdr"><span className="sttl">Trending Now</span></div><div className="hscroll">{[1,2,3,4,5].map(i => <div key={i} className="skel shimmer" />)}</div></div>
      <div className="sec"><div className="shdr"><span className="sttl">Most Popular</span></div><div className="hscroll">{[1,2,3,4,5].map(i => <div key={i} className="skel shimmer" />)}</div></div>
    </div>
  );

  const trending = data?.trending?.media?.slice(0,15) || [];
  const popular = data?.popular?.media || [];
  const upcoming = data?.upcoming?.media || [];
  const slides = trending.slice(0,5);

  return (
    <div className="page">
      {slides.length > 0 && (
        <div className="hero" onClick={() => nav(slides[slide]?.id)}>
          <div className="hc">
            <div className="hbadge"><TrendingUp size={10} /> #{slide+1} Trending</div>
            <div className="htitle">{getTitle(slides[slide])}</div>
            <div className="hsub">
              {slides[slide]?.averageScore ? `⭐ ${slides[slide].averageScore}%` : ''}
              {slides[slide]?.episodes ? ` · ${slides[slide].episodes} eps` : ''}
              {slides[slide]?.seasonYear ? ` · ${slides[slide].seasonYear}` : ''}
            </div>
          </div>
          <div className="hdots">
            {slides.map((_,i) => <div key={i} className={`hdot ${i===slide?'active':'inactive'}`} />)}
          </div>
        </div>
      )}

      {cw.length > 0 && (
        <div className="sec">
          <div className="shdr"><span className="sttl"><Clock size={14} /> Continue Watching</span></div>
          <div className="hscroll">
            {cw.map(item => (
              <div key={item.id} className="card" onClick={() => nav(item.id)}>
                <Img src={item.image} alt={item.title} cls="card-img" />
                <div className="card-body">
                  <div className="card-title">{item.title}</div>
                  <div className="card-sub" style={{color:'var(--brand)'}}>▶ Continue</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {trending.length > 0 && (
        <div className="sec">
          <div className="shdr"><span className="sttl"><Flame size={14} /> Trending Now</span><span className="slnk" onClick={()=>navigate('search')}>See all</span></div>
          <div className="hscroll">{trending.map(m => <ACard key={m.id} m={m} onClick={nav} />)}</div>
        </div>
      )}

      {popular.length > 0 && (
        <div className="sec">
          <div className="shdr"><span className="sttl"><Sparkles size={14} /> Most Popular</span><span className="slnk" onClick={()=>navigate('search')}>See all</span></div>
          <div className="hscroll">{popular.map(m => <ACard key={m.id} m={m} onClick={nav} />)}</div>
        </div>
      )}

      <div className="sec">
        <div className="shdr"><span className="sttl"><Calendar size={14} /> Seasonal</span></div>
        <div className="hscroll" style={{marginBottom:8}}>
          {SEASONS.map(s => (
            <button key={s} onClick={()=>setSelSeason(s)}
              style={{flexShrink:0,padding:'6px 14px',borderRadius:20,cursor:'pointer',fontWeight:600,fontSize:'.75rem',
                background:selSeason===s?'var(--brand)':'var(--border)',color:selSeason===s?'#fff':'var(--text3)',border:'none',fontFamily:'var(--font)'}}>
              {s.charAt(0)+s.slice(1).toLowerCase()}
            </button>
          ))}
          <select value={selYear} onChange={e=>setSelYear(parseInt(e.target.value))}
            style={{flexShrink:0,padding:'6px 10px',borderRadius:20,background:'var(--border)',color:'var(--text)',border:'none',fontSize:'.75rem',fontWeight:600,fontFamily:'var(--font)'}}>
            {[CY,CY-1,CY-2,CY-3].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        {sLoading ? (
          <div className="hscroll">{[1,2,3,4,5].map(i => <div key={i} className="skel shimmer" />)}</div>
        ) : seasonal.length > 0 ? (
          <div className="hscroll">{seasonal.map(m => <ACard key={m.id} m={m} onClick={nav} />)}</div>
        ) : null}
      </div>

      {upcoming.length > 0 && (
        <div className="sec">
          <div className="shdr"><span className="sttl">Upcoming</span></div>
          <div className="g3">{upcoming.slice(0,9).map(m => <GCard key={m.id} m={m} onClick={nav} />)}</div>
        </div>
      )}
    </div>
  );
}
