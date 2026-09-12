import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Calendar, Check, ChevronDown, Clock3, Heart, Maximize, Minimize, Play, Plus, Share2, SkipBack, SkipForward, Star, Users } from 'lucide-react';
import { fetchMovieDetails, fetchTVDetails, fetchTVSeasonDetails, findMediaByTitle, resolveMediaSource, MEDIA_SOURCE_PROVIDERS, DEFAULT_MEDIA_SOURCE_PROVIDER } from '../api/movies';
import AndroidVideoPlayer from '../components/AndroidVideoPlayer';
import { useUser } from '../../api/UserContext';

const normalizeId = value => { const raw = String(value ?? '').trim().replace(/^tmdb-/i, ''); return /^\d+$/.test(raw) ? raw : ''; };
const normalizeType = value => String(value || '').toLowerCase() === 'movie' ? 'movie' : 'tv';

const chipStyle = { background:'rgba(255,255,255,.07)', color:'#cbd5e1', border:'1px solid rgba(255,255,255,.08)', borderRadius:999, padding:'6px 10px', fontSize:'.72rem', whiteSpace:'nowrap' };

export default function DramaDetailPage({ params = {}, goBack, navigate }) {
  const { user, setAuthTab } = useUser();
  const rawRouteId = params?.id ?? params?.tmdbId ?? params?.mediaId;
  const id = normalizeId(rawRouteId);
  const mediaType = normalizeType(params?.mediaType || params?.type);
  const initialTitle = String(params?.title || '').trim();
  const [details,setDetails] = useState(null), [resolvedId,setResolvedId] = useState(id), [loading,setLoading] = useState(true), [error,setError] = useState('');
  const [showPlayer,setShowPlayer] = useState(false), [selectedSeason,setSelectedSeason] = useState(1), [selectedEpisode,setSelectedEpisode] = useState(1), [episodes,setEpisodes] = useState([]);
  const [mediaSource,setMediaSource] = useState(''), [sourceLoading,setSourceLoading] = useState(false), [sourceError,setSourceError] = useState('');
  const [selectedProvider,setSelectedProvider] = useState(DEFAULT_MEDIA_SOURCE_PROVIDER), [isFs,setIsFs] = useState(false), [expanded,setExpanded] = useState(false), [inList,setInList] = useState(false);
  const playerWrapperRef = useRef(null);

  useEffect(() => { const h=()=>setIsFs(!!document.fullscreenElement); document.addEventListener('fullscreenchange',h); return()=>document.removeEventListener('fullscreenchange',h); }, []);

  useEffect(() => {
    let cancelled=false;
    (async()=>{
      setLoading(true); setError(''); setDetails(null); setEpisodes([]); setResolvedId('');
      try {
        let actualId=id, data=null;
        if(id) data=mediaType==='movie' ? await fetchMovieDetails(id) : await fetchTVDetails(id);
        if(!data && initialTitle){
          const match=await findMediaByTitle(initialTitle,mediaType);
          if(match?.id!=null){ actualId=normalizeId(match.id); if(actualId) data=mediaType==='movie' ? await fetchMovieDetails(actualId) : await fetchTVDetails(actualId); }
        }
        if(cancelled)return;
        if(!data || !actualId) throw new Error(initialTitle ? `Could not find this ${mediaType==='movie'?'movie':'TV show'} in TMDB.` : `Missing ${mediaType==='movie'?'movie':'TV show'} ID.`);
        setResolvedId(actualId); setDetails(data); setLoading(false);
        if(mediaType!=='movie' && Array.isArray(data.seasons) && data.seasons.length){ const first=data.seasons.find(s=>Number(s?.season_number)>0)?.season_number||1; setSelectedSeason(first); }
      } catch(err){ if(!cancelled){setError(err?.message||'Failed to load details.');setLoading(false);} }
    })();
    return()=>{cancelled=true;};
  },[id,mediaType,initialTitle]);

  useEffect(() => {
    let cancelled=false;
    if(mediaType!=='movie' && details?.seasons && resolvedId){
      setEpisodes([]);
      fetchTVSeasonDetails(resolvedId,selectedSeason).then(d=>{if(!cancelled)setEpisodes(Array.isArray(d?.episodes)?d.episodes:[]);}).catch(()=>{});
    }
    return()=>{cancelled=true;};
  },[resolvedId,mediaType,details?.seasons,selectedSeason]);

  const loadSource = async (season=selectedSeason, episode=selectedEpisode, provider=selectedProvider) => {
    if(!resolvedId){setSourceError('This title has no valid TMDB ID, so playback cannot be prepared.');return;}
    setSourceLoading(true); setSourceError(''); setMediaSource('');
    try {
      const resolved=await resolveMediaSource(mediaType,resolvedId,season,episode,provider);
      if(resolved)setMediaSource(resolved); else setSourceError(`No playback source is available from ${provider}.`);
    } catch(err){setSourceError(err?.message||`Unable to load ${provider}.`);} finally {setSourceLoading(false);}
  };

  const selectProvider = async p => { setSelectedProvider(p); if(showPlayer) await loadSource(selectedSeason,selectedEpisode,p); };
  const toggleFs = () => { if(!playerWrapperRef.current)return; if(document.fullscreenElement)document.exitFullscreen(); else playerWrapperRef.current.requestFullscreen?.(); };
  const requireWatch = async (season=selectedSeason, episode=selectedEpisode) => {
    if(!user){setAuthTab('login');navigate?.('profile');return;}
    setSelectedSeason(season); setSelectedEpisode(episode); setShowPlayer(true); await loadSource(season,episode,selectedProvider);
  };
  const changeEpisode = async ep => { setSelectedEpisode(ep); if(showPlayer) await loadSource(selectedSeason,ep); };
  const goNextEp = () => { const i=episodes.findIndex(e=>e.episode_number===selectedEpisode); if(i>=0&&i<episodes.length-1)changeEpisode(episodes[i+1].episode_number); };
  const goPrevEp = () => { const i=episodes.findIndex(e=>e.episode_number===selectedEpisode); if(i>0)changeEpisode(episodes[i-1].episode_number); };

  if(loading) return <div className="mobile-content" style={{padding:0,background:'#07070b'}}><div style={{height:300,background:'linear-gradient(110deg,#15151d,#0b0b10)'}}/><div style={{padding:16}}><div className="loading-shimmer" style={{height:30,width:'65%',borderRadius:8,marginBottom:12}}/><div className="loading-shimmer" style={{height:14,width:'45%',borderRadius:8}}/></div></div>;
  if(error||!details) return <div className="mobile-content" style={{textAlign:'center',padding:'4rem 1rem'}}><p style={{color:'#94a3b8'}}>{error||'Failed to load details'}</p><button onClick={goBack} style={{marginTop:12,background:'var(--brand-color)',color:'#fff',border:'none',padding:'10px 20px',borderRadius:10}}>Go Back</button></div>;

  const title=details.title||details.name||initialTitle||'Unknown';
  const poster=details.poster_path?`https://image.tmdb.org/t/p/w500${details.poster_path}`:null;
  const backdrop=details.backdrop_path?`https://image.tmdb.org/t/p/original${details.backdrop_path}`:poster;
  const year=(details.release_date||details.first_air_date||'').split('-')[0];
  const rating=Number(details.vote_average)>0?Number(details.vote_average).toFixed(1):'N/A';
  const runtime=details.runtime?`${details.runtime} min`:details.episode_run_time?.[0]?`${details.episode_run_time[0]} min`:'';
  const overview=details.overview||'No description available.';
  const genres=Array.isArray(details.genres)?details.genres.map(g=>g?.name).filter(Boolean):[];
  const seasons=Array.isArray(details.seasons)?details.seasons.filter(s=>Number(s?.season_number)>0):[];
  const cast=Array.isArray(details.credits?.cast)?details.credits.cast.slice(0,10):[];
  const displayOverview=expanded||overview.length<220?overview:`${overview.slice(0,220).trim()}…`;

  if(showPlayer) return <div ref={playerWrapperRef} className="player-screen player-screen-v2" style={isFs?{padding:0}:{}}>
    <div className="player-topbar player-topbar-v2"><button className="player-icon-btn" onClick={()=>setShowPlayer(false)} aria-label="Back"><ArrowLeft size={20}/></button><div className="player-title"><strong>{title}</strong><span>{mediaType==='movie'?'Movie':`S${selectedSeason} E${selectedEpisode}`}</span></div><button className="player-icon-btn" onClick={toggleFs} aria-label="Fullscreen">{isFs?<Minimize size={20}/>:<Maximize size={20}/>}</button></div>
    <div className="player-source-bar" style={{display:'flex',gap:8,padding:'8px 12px',overflowX:'auto',borderBottom:'1px solid rgba(255,255,255,.08)'}}>{MEDIA_SOURCE_PROVIDERS.map(p=><button key={p.id} onClick={()=>selectProvider(p.id)} style={{flexShrink:0,border:'1px solid rgba(255,255,255,.1)',borderRadius:8,padding:'7px 12px',cursor:'pointer',background:p.id===selectedProvider?'var(--brand-color)':'rgba(255,255,255,.05)',color:'#fff',fontWeight:p.id===selectedProvider?700:500}}>{p.name}{p.id===DEFAULT_MEDIA_SOURCE_PROVIDER?' · Default':''}</button>)}</div>
    <div className="player-frame-wrap player-frame-wrap-v2">{sourceLoading&&<div style={{padding:24,textAlign:'center',color:'#94a3b8'}}>Preparing {selectedProvider}…</div>}{sourceError&&!sourceLoading&&<div style={{padding:24,textAlign:'center',color:'#fca5a5'}}>{sourceError}<button onClick={()=>loadSource()} style={{display:'block',margin:'12px auto',padding:'8px 14px',borderRadius:8}}>Retry</button></div>}{!sourceLoading&&!sourceError&&mediaSource&&<AndroidVideoPlayer sourceUrl={mediaSource} poster={poster} title={title} onPrevEpisode={mediaType!=='movie'?goPrevEp:undefined} onNextEpisode={mediaType!=='movie'?goNextEp:undefined}/>}</div>
    {mediaType!=='movie'&&<div className="player-episode-rail"><button className="ply-rail-nav" onClick={goPrevEp} disabled={selectedEpisode<=1}><SkipBack size={16}/></button><div className="ply-rail-scroll">{episodes.slice(0,100).map(ep=><button key={ep.episode_number} className={ep.episode_number===selectedEpisode?'active':''} onClick={()=>changeEpisode(ep.episode_number)}>{ep.episode_number}</button>)}</div><button className="ply-rail-nav" onClick={goNextEp} disabled={selectedEpisode>=episodes.length}><SkipForward size={16}/></button></div>}
  </div>;

  return <div className="mobile-content" style={{padding:0,background:'#07070b',color:'#fff'}}>
    <div style={{position:'relative',height:360,overflow:'hidden'}}>
      {backdrop&&<img src={backdrop} alt="" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity:.68}}/>}
      <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg,rgba(7,7,11,.1) 20%,#07070b 94%)'}}/>
      <button onClick={goBack} aria-label="Back" style={{position:'absolute',top:14,left:14,zIndex:2,width:42,height:42,borderRadius:'50%',border:'1px solid rgba(255,255,255,.14)',background:'rgba(0,0,0,.48)',backdropFilter:'blur(10px)',color:'#fff',display:'grid',placeItems:'center'}}><ArrowLeft size={20}/></button>
      <button onClick={()=>setInList(v=>!v)} aria-label="Add to list" style={{position:'absolute',top:14,right:14,zIndex:2,width:42,height:42,borderRadius:'50%',border:'1px solid rgba(255,255,255,.14)',background:'rgba(0,0,0,.48)',backdropFilter:'blur(10px)',color:inList?'var(--brand-color)':'#fff',display:'grid',placeItems:'center'}}>{inList?<Check size={19}/>:<Plus size={20}/>}</button>
      {poster&&<div style={{position:'absolute',left:16,bottom:8,width:112,height:166,borderRadius:12,overflow:'hidden',boxShadow:'0 16px 40px rgba(0,0,0,.55)',border:'1px solid rgba(255,255,255,.1)'}}><img src={poster} alt={title} style={{width:'100%',height:'100%',objectFit:'cover'}}/></div>}
    </div>

    <div style={{padding:'0 16px 34px'}}>
      <div style={{marginLeft:126,minHeight:166,marginTop:-174,paddingTop:8,position:'relative'}}>
        <div style={{display:'flex',gap:7,flexWrap:'wrap',marginBottom:9}}><span style={{...chipStyle,background:'rgba(255,26,117,.15)',color:'var(--brand-color)',borderColor:'rgba(255,26,117,.25)'}}><Star size={11} fill="currentColor" style={{verticalAlign:-1}}/> {rating}</span>{year&&<span style={chipStyle}>{year}</span>}<span style={chipStyle}>{mediaType==='movie'?'Movie':'TV'}</span></div>
        <h1 style={{fontSize:'1.45rem',lineHeight:1.15,fontWeight:850,margin:'0 0 8px',letterSpacing:'-.02em'}}>{title}</h1>
        <div style={{display:'flex',gap:8,alignItems:'center',color:'#94a3b8',fontSize:'.74rem'}}>{runtime&&<><Clock3 size={13}/>{runtime}</>}<span>•</span><span>TMDB</span></div>
      </div>

      <div style={{display:'flex',gap:9,marginTop:12}}>
        <button onClick={()=>requireWatch()} style={{flex:1,border:0,borderRadius:11,padding:'12px 14px',background:'var(--brand-color)',color:'#fff',fontWeight:800,fontSize:'.88rem',display:'flex',alignItems:'center',justifyContent:'center',gap:7}}><Play size={17} fill="currentColor"/> Watch Now</button>
        <button onClick={()=>setInList(v=>!v)} style={{width:48,border:'1px solid rgba(255,255,255,.1)',borderRadius:11,background:'rgba(255,255,255,.06)',color:'#fff',display:'grid',placeItems:'center'}}>{inList?<Heart size={19} fill="currentColor" color="var(--brand-color)"/>:<Heart size={19}/>}</button>
        <button onClick={()=>{try{navigator.share?.({title,text:title,url:window.location.href});}catch{}}} style={{width:48,border:'1px solid rgba(255,255,255,.1)',borderRadius:11,background:'rgba(255,255,255,.06)',color:'#fff',display:'grid',placeItems:'center'}}><Share2 size={18}/></button>
      </div>

      {genres.length>0&&<div style={{display:'flex',gap:7,overflowX:'auto',padding:'15px 0 3px',scrollbarWidth:'none'}}>{genres.map(g=><span key={g} style={chipStyle}>{g}</span>)}</div>}

      <section style={{marginTop:22}}><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}><h2 style={{fontSize:'1rem',fontWeight:800,margin:0}}>Overview</h2></div><p style={{color:'#a9a9b5',fontSize:'.83rem',lineHeight:1.65,margin:0}}>{displayOverview}</p>{overview.length>220&&<button onClick={()=>setExpanded(v=>!v)} style={{marginTop:7,border:0,padding:0,background:'none',color:'var(--brand-color)',fontWeight:700,fontSize:'.78rem'}}>{expanded?'Show less':'Read more'}</button>}</section>

      {mediaType!=='movie'&&seasons.length>0&&<section style={{marginTop:26}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}><h2 style={{fontSize:'1rem',fontWeight:800,margin:0}}>Episodes</h2><div style={{position:'relative'}}><select value={selectedSeason} onChange={e=>{setSelectedSeason(Number(e.target.value));setSelectedEpisode(1);}} style={{appearance:'none',background:'#15151c',border:'1px solid rgba(255,255,255,.1)',borderRadius:9,color:'#fff',padding:'8px 31px 8px 11px',fontSize:'.76rem',fontWeight:700}}>{seasons.map(s=><option key={s.season_number} value={s.season_number}>Season {s.season_number}</option>)}</select><ChevronDown size={14} style={{position:'absolute',right:9,top:10,pointerEvents:'none'}}/></div></div>
        <div style={{display:'grid',gap:9}}>{episodes.map(ep=>{const active=ep.episode_number===selectedEpisode; const epImage=ep.still_path?`https://image.tmdb.org/t/p/w300${ep.still_path}`:backdrop; return <button key={ep.episode_number} onClick={()=>requireWatch(selectedSeason,ep.episode_number)} style={{display:'flex',gap:11,textAlign:'left',width:'100%',padding:8,borderRadius:12,border:active?'1px solid rgba(255,26,117,.55)':'1px solid rgba(255,255,255,.07)',background:active?'rgba(255,26,117,.09)':'rgba(255,255,255,.035)',color:'#fff'}}><div style={{position:'relative',flex:'0 0 112px',height:66,borderRadius:8,overflow:'hidden',background:'#16161d'}}>{epImage&&<img src={epImage} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>}<span style={{position:'absolute',left:6,bottom:5,padding:'3px 6px',borderRadius:5,background:'rgba(0,0,0,.75)',fontSize:'.68rem',fontWeight:800}}>E{ep.episode_number}</span></div><div style={{minWidth:0,display:'flex',flexDirection:'column',justifyContent:'center'}}><strong style={{fontSize:'.82rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ep.name||`Episode ${ep.episode_number}`}</strong><span style={{fontSize:'.7rem',color:'#777782',marginTop:5}}>{ep.runtime?`${ep.runtime} min`:'Episode'}{ep.air_date?` • ${ep.air_date}`:''}</span><span style={{fontSize:'.7rem',color:'#9b9ba8',marginTop:5,display:'-webkit-box',WebkitLineClamp:1,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{ep.overview||'Tap to watch this episode.'}</span></div></button>;})}</div>
      </section>}

      <section style={{marginTop:27}}><h2 style={{fontSize:'1rem',fontWeight:800,margin:'0 0 12px'}}>Details</h2><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9}}><div style={{background:'rgba(255,255,255,.035)',border:'1px solid rgba(255,255,255,.06)',borderRadius:11,padding:12}}><Calendar size={15} color="var(--brand-color)"/><div style={{fontSize:'.68rem',color:'#777782',marginTop:7}}>Release</div><strong style={{fontSize:'.78rem'}}>{details.release_date||details.first_air_date||'Unknown'}</strong></div><div style={{background:'rgba(255,255,255,.035)',border:'1px solid rgba(255,255,255,.06)',borderRadius:11,padding:12}}><Users size={15} color="var(--brand-color)"/><div style={{fontSize:'.68rem',color:'#777782',marginTop:7}}>Popularity</div><strong style={{fontSize:'.78rem'}}>{Number(details.popularity||0).toFixed(0)}</strong></div></div></section>

      {cast.length>0&&<section style={{marginTop:27}}><h2 style={{fontSize:'1rem',fontWeight:800,margin:'0 0 12px'}}>Cast</h2><div style={{display:'flex',gap:10,overflowX:'auto',paddingBottom:4}}>{cast.map(person=><div key={person.id||person.cast_id} style={{flex:'0 0 72px'}}><div style={{width:72,height:72,borderRadius:'50%',overflow:'hidden',background:'#15151c'}}>{person.profile_path&&<img src={`https://image.tmdb.org/t/p/w185${person.profile_path}`} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>}</div><div style={{fontSize:'.67rem',fontWeight:700,marginTop:6,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{person.name}</div><div style={{fontSize:'.6rem',color:'#777782',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{person.character}</div></div>)}</div></section>}
    </div>
  </div>;
}
