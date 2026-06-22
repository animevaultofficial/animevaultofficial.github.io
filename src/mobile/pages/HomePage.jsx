import React, { useState, useEffect } from 'react';
import { TrendingUp, Flame, Clock, Sparkles, Calendar, Star, Play, Info } from 'lucide-react';
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

  const getBanner = (m) => m?.bannerImage || getImage(m, 'large');
  const getDesc = (m) => m?.description?.replace(/<[^>]+>/g, '').slice(0, 150) || 'No description available.';

  return (
    <div className="page">
      {/* Flashcard Hero Carousel (matching web version) */}
      {slides.length > 0 && (
        <div style={{ marginBottom: '1.25rem', position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-lg)', height: 280 }}>
          {slides.map((anime, index) => {
            const isActive = index === slide;
            return (
              <div
                key={anime.id}
                style={{
                  position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                  opacity: isActive ? 1 : 0,
                  visibility: isActive ? 'visible' : 'hidden',
                  transition: 'opacity 0.8s ease-in-out, visibility 0.8s ease-in-out',
                  zIndex: isActive ? 2 : 1,
                }}
              >
                <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                  {getBanner(anime) ? (
                    <img src={getBanner(anime)} alt={getTitle(anime)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: 'var(--surface2)' }} />
                  )}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to top, rgba(3,15,22,.95) 20%, rgba(3,15,22,.3) 55%, transparent 100%)',
                    zIndex: 1,
                  }} />
                </div>
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 3,
                  padding: '1rem',
                  transform: isActive ? 'translateY(0)' : 'translateY(20px)',
                  opacity: isActive ? 1 : 0,
                  transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s',
                }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    background: 'var(--brand)', color: '#fff',
                    fontSize: '.6rem', fontWeight: 800, textTransform: 'uppercase',
                    padding: '2px 8px', borderRadius: 4, marginBottom: '.35rem',
                  }}>
                    <TrendingUp size={10} /> #{index + 1} Trending
                  </span>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 900, marginBottom: '.2rem', lineHeight: 1.2 }}>{getTitle(anime)}</h2>
                  <div style={{ display: 'flex', gap: '.75rem', marginBottom: '.35rem', fontSize: '.72rem', color: 'var(--text3)' }}>
                    {anime.averageScore && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Star size={12} /> {anime.averageScore}%</span>}
                    {anime.seasonYear && <span>{anime.seasonYear}</span>}
                    {anime.format && <span>{anime.format}</span>}
                    {anime.episodes && <span>{anime.episodes} eps</span>}
                  </div>
                  <p style={{ fontSize: '.75rem', color: 'var(--text2)', lineHeight: 1.4, marginBottom: '.65rem', maxHeight: 40, overflow: 'hidden' }}>
                    {getDesc(anime).slice(0, 120)}
                  </p>
                  <div style={{ display: 'flex', gap: '.6rem' }}>
                    <button onClick={(e) => { e.stopPropagation(); nav(anime.id); }} style={{
                      background: 'var(--brand)', color: '#fff', border: 'none',
                      padding: '.5rem 1rem', borderRadius: 8, fontWeight: 700, fontSize: '.78rem',
                      display: 'flex', alignItems: 'center', gap: '.35rem',
                      boxShadow: '0 4px 15px rgba(255,26,117,0.4)',
                    }}>
                      <Play size={14} fill="currentColor" /> Watch
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); nav(anime.id); }} style={{
                      background: 'rgba(255,255,255,.1)', color: '#fff', border: '1px solid rgba(255,255,255,.2)',
                      padding: '.5rem 1rem', borderRadius: 8, fontWeight: 600, fontSize: '.78rem',
                      display: 'flex', alignItems: 'center', gap: '.35rem',
                    }}>
                      <Info size={14} /> Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {/* Dots */}
          <div style={{ position: 'absolute', bottom: '10px', right: '14px', zIndex: 4, display: 'flex', gap: 4 }}>
            {slides.map((_, i) => (
              <div
                key={i}
                onClick={() => setSlide(i)}
                style={{
                  width: i === slide ? '18px' : '6px', height: '6px',
                  borderRadius: i === slide ? '3px' : '50%',
                  background: i === slide ? 'var(--brand)' : 'rgba(255,255,255,.3)',
                  transition: 'all 0.3s ease', cursor: 'pointer',
                }}
              />
            ))}
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
