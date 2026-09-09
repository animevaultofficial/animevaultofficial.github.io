import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Star, Film, Tv } from 'lucide-react';
import { searchMoviesAndSeries } from '../api/movies';

const HISTORY_KEY = 'animevault_search_history';
const MAX_HISTORY = 12;
function loadHistory(){try{const v=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');return Array.isArray(v)?v:[]}catch{return []}}
function saveHistory(v){try{localStorage.setItem(HISTORY_KEY,JSON.stringify(v))}catch{}}
function titleOf(m){return m?.title||m?.name||'Unknown Title'}
function imageOf(m){return m?.poster||''}
function yearOf(m){return m?.year||m?.releaseInfo||''}
function typeOf(m){return m?.mediaType==='series'||m?.type==='series'?'TV Show':'Movie'}

export default function SearchModal({onClose}){
 const [query,setQuery]=useState(''),[results,setResults]=useState([]),[loading,setLoading]=useState(false),[history,setHistory]=useState(loadHistory);
 const inputRef=useRef(); const navigate=useNavigate();
 useEffect(()=>{const t=setTimeout(()=>inputRef.current?.focus(),50);return()=>clearTimeout(t)},[]);
 useEffect(()=>{const q=query.trim();if(!q){setResults([]);setLoading(false);return}let mounted=true;const t=setTimeout(async()=>{setLoading(true);try{const data=await searchMoviesAndSeries(q);if(mounted)setResults(Array.isArray(data)?data:[])}catch{if(mounted)setResults([])}finally{if(mounted)setLoading(false)}},300);return()=>{mounted=false;clearTimeout(t)}},[query]);
 const addHistory=useCallback(term=>{const q=term.trim();if(!q)return;setHistory(prev=>{const n=[q,...prev.filter(x=>x.toLowerCase()!==q.toLowerCase())].slice(0,MAX_HISTORY);saveHistory(n);return n})},[]);
 const select=media=>{addHistory(query);onClose();const type=media?.mediaType==='movie'||media?.type==='movie'?'movie':'tv';navigate(`/watch/${type}/${media.tmdbId||media.id}`)};
 const key=e=>{if(e.key==='Escape')onClose();if(e.key==='Enter'&&query.trim()){addHistory(query);onClose();navigate(`/search?q=${encodeURIComponent(query.trim())}`)}};
 return <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}><div className="search-box">
  <div className="search-input-wrap"><Search className="search-icon"/><input ref={inputRef} className="search-input" placeholder="Search movies, dramas & TV shows..." value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={key}/><button className="btn-clear" onClick={query?()=>setQuery(''):onClose}><X size={20}/></button></div>
  <div className="search-results">
   {!loading&&query&&!results.length&&<div className="search-empty">No movies or TV shows found for “{query}”</div>}
   {loading&&<div className="search-empty">Searching TMDB…</div>}
   {!loading&&results.map(m=><div key={`${m.mediaType||m.type}-${m.id}`} className="search-result" onClick={()=>select(m)}><img src={imageOf(m)} alt={titleOf(m)} onError={e=>{e.currentTarget.style.visibility='hidden'}}/><div className="search-result-info"><div className="search-result-title">{titleOf(m)}</div><div className="search-result-meta">{yearOf(m)}{m.vote_average||m.rating?<>{' · '}<Star size={12}/> {Number(m.vote_average||m.rating).toFixed(1)}</>:null}</div></div><span className={`search-result-type type-${m.mediaType||m.type}`}>{typeOf(m)==='Movie'?<Film size={12}/>:<Tv size={12}/>} {typeOf(m)}</span></div>)}
   {!query&&history.length>0&&<div className="search-history"><div className="search-history-header"><span className="search-history-label">Recent searches</span><button className="search-history-clear" onClick={()=>{setHistory([]);saveHistory([])}}>Clear all</button></div>{history.map(term=><div key={term} className="search-history-item" onClick={()=>setQuery(term)}><span className="search-history-icon"><Search size={14}/></span><span className="search-history-term">{term}</span><button className="search-history-remove" onClick={e=>{e.stopPropagation();const n=history.filter(x=>x!==term);setHistory(n);saveHistory(n)}}><X size={13}/></button></div>)}</div>}
   {!query&&!history.length&&<div className="search-hint">Search movies, dramas & TV shows · <kbd>ESC</kbd> to close</div>}
  </div>
 </div></div>
}
