import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowDownUp, ArrowLeft, Bookmark, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Clock3, Film, Home, Info, ListVideo, Play, Search, Sparkles, Tv, UserRound, X } from 'lucide-react';
import { proxyLogin, proxyLogout, proxyRestoreSession, proxySignup } from '../../src/api/authProxy.js';
import { getDetails, getEpisodeList, getHomeCatalog, getPlaybackSource, PROVIDERS, searchCatalog } from './catalog.js';
import './tv.css';

const NAV = [
  ['home', 'Home', Home], ['search', 'Search', Search], ['movies', 'Movies', Film],
  ['shows', 'Series', Tv], ['anime', 'Anime', Sparkles], ['list', 'My List', Bookmark],
];
const FAVORITES_KEY = 'animevault_tv_list';
const CONTINUE_KEY = 'animevault_tv_continue';
const getSaved = () => { try { const value = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } };
const getContinue = () => { try { const value = JSON.parse(localStorage.getItem(CONTINUE_KEY) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } };
const titleOf = item => item?.title || item?.name || 'Untitled';

function focusable(root = document) {
  if (root === document) root = document.querySelector('[aria-modal="true"]') || document.querySelector('.watch-screen') || document;
  return [...root.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),[tabindex]:not([tabindex="-1"])')]
    .filter(el => !el.closest('[hidden],[aria-hidden="true"]') && el.getClientRects().length);
}

function installRemoteKeys() {
  const onKeyDown = event => {
    const active = document.activeElement;
    if (event.key === 'Back' || event.key === 'GoBack' || event.keyCode === 461) {
      event.preventDefault();
      window.dispatchEvent(new Event('tv-os-back'));
      return;
    }
    if (active?.matches('input,textarea,[contenteditable="true"]')) {
      if (event.key === 'Escape') active.blur();
      else if (!['ArrowUp', 'ArrowDown', 'Up', 'Down'].includes(event.key)) return;
    }
    if (event.key === 'Escape') { event.preventDefault(); window.dispatchEvent(new Event('tv-os-back')); return; }
    if (active?.tagName === 'SELECT') return;
    const direction = { ArrowLeft: [-1, 0], Left: [-1, 0], ArrowRight: [1, 0], Right: [1, 0], ArrowUp: [0, -1], Up: [0, -1], ArrowDown: [0, 1], Down: [0, 1] }[event.key];
    if (!direction) return;
    const controls = focusable();
    if (!controls.length) return;
    const row = active?.closest('[data-tv-row]');
    if (row && direction[1] === 0) {
      const rowItems = focusable(row);
      const index = rowItems.indexOf(active);
      const target = rowItems[index + direction[0]];
      if (target) { event.preventDefault(); target.focus(); target.scrollIntoView({ block: 'nearest', inline: 'nearest' }); return; }
    }
    const origin = active?.getBoundingClientRect();
    let target = null;
    let score = Infinity;
    if (origin) for (const candidate of controls) {
      if (candidate === active) continue;
      const rect = candidate.getBoundingClientRect();
      const dx = rect.left + rect.width / 2 - (origin.left + origin.width / 2);
      const dy = rect.top + rect.height / 2 - (origin.top + origin.height / 2);
      const forward = dx * direction[0] + dy * direction[1];
      if (forward <= 4) continue;
      const lateral = Math.abs(dx * direction[1] - dy * direction[0]);
      const nextScore = forward + lateral * 2.4;
      if (nextScore < score) { score = nextScore; target = candidate; }
    }
    if (!target && !active) target = controls.find(el => el.closest('main')) || controls[0];
    if (target) { event.preventDefault(); target.focus(); target.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
  };
  window.addEventListener('keydown', onKeyDown, true);
  return () => window.removeEventListener('keydown', onKeyDown, true);
}

function Poster({ item, onOpen, saved = false, size = '' }) {
  const [imageFailed, setImageFailed] = useState(false);
  return <button type="button" className={`poster ${size}`} onClick={() => onOpen(item)} aria-label={`${titleOf(item)}${saved ? ', in My List' : ''}`}>
    <span className="poster-art">{item.poster && !imageFailed ? <img src={item.poster} alt="" loading="lazy" onError={() => setImageFailed(true)} /> : <span className="art-fallback">AV</span>}
      {item.rating > 0 && <span className="rating">★ {Number(item.rating).toFixed(1)}</span>}
    </span>
    <span className="poster-copy"><strong>{titleOf(item)}</strong><small>{item.year || item.type?.toUpperCase() || ''}</small></span>
  </button>;
}

function Rail({ title, items = [], onOpen, saved = [], icon: Icon = Film, onViewAll }) {
  if (!items.length) return null;
  return <section className="shelf">
    <div className="shelf-heading"><div className="shelf-title"><Icon size={21}/><div><h2>{title}</h2><small>{title === 'Continue Watching' ? 'Pick up where you left off' : `Discover ${title.toLowerCase()} on AnimeVault`}</small></div></div><div className="shelf-actions"><span>{items.length} titles</span>{onViewAll && <button onClick={onViewAll}>View all <ChevronRight size={16}/></button>}</div></div>
    <div className="poster-rail" data-tv-row>{items.map(item => <Poster key={item.key || `${item.type}-${item.id}`} item={item} onOpen={onOpen} saved={saved.some(entry => entry.key === item.key)} />)}</div>
  </section>;
}

function AuthDialog({ onClose, onSuccess }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async event => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const result = mode === 'login' ? await proxyLogin(email.trim().toLowerCase(), password) : await proxySignup(email.trim().toLowerCase(), password);
      if (!result?.success || !result?.user) throw new Error(result?.message || 'Could not sign in. Check your details and try again.');
      onSuccess(result.user);
    } catch (err) { setError(err?.message || 'Sign in failed.'); }
    finally { setBusy(false); }
  };
  return <div className="modal-scrim" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="auth-card" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <button className="close-button" autoFocus onClick={onClose} aria-label="Close">×</button>
      <div className="eyebrow">ANIMEVAULT ACCOUNT</div><h2 id="auth-title">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
      <p>Sign in to keep your watchlist and viewing progress.</p>
      <form onSubmit={submit}>
        <label>Email<input type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required /></label>
        <label>Password<input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={6} value={password} onChange={event => setPassword(event.target.value)} required /></label>
        {error && <div className="form-error" role="alert">{error}</div>}
        <button className="primary-button" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
      </form>
      <button className="text-button mode-button" onClick={() => { setError(''); setMode(value => value === 'login' ? 'signup' : 'login'); }}>{mode === 'login' ? 'Create an account' : 'I already have an account'}</button>
      <button className="text-button" onClick={onClose}>Continue as guest</button>
    </section>
  </div>;
}

function EpisodeDrawer({ item, season, seasons, seasonCount, episodes, episode, loading, error, onSeason, onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const [order, setOrder] = useState('asc');
  const filteredEpisodes = useMemo(() => {
    const term = query.trim().toLowerCase();
    return episodes.filter(entry => [entry.episode_number, entry.name, entry.overview, entry.air_date].filter(Boolean).join(' ').toLowerCase().includes(term))
      .slice().sort((left, right) => (order === 'asc' ? 1 : -1) * (left.episode_number - right.episode_number));
  }, [episodes, query, order]);

  return <div className="episode-drawer-layer">
    <button className="episode-drawer-scrim" aria-label="Close episode list" onClick={onClose} />
    <aside className="episode-drawer" role="dialog" aria-modal="true" aria-label={`${item.title || item.name || 'Series'} episode list`}>
      <header className="episode-drawer-heading">
        <div className="episode-drawer-title"><span className="episode-drawer-icon"><ListVideo size={20}/></span><div><h2>Episode list</h2><p>{episodes.length ? `${episodes.length} episodes · Season ${season}` : `Season ${season}`}</p></div></div>
        <button className="round-button" onClick={onClose} aria-label="Close episode list"><X size={21}/></button>
      </header>
      <div className="episode-drawer-controls">
        <label className="episode-drawer-season"><CalendarDays size={17}/><span>Season</span><select value={season} onChange={event => onSeason(Number(event.target.value))} aria-label="Select season">
          {seasons.length ? seasons.map(entry => <option key={entry.season_number} value={entry.season_number}>{entry.name || `Season ${entry.season_number}`}</option>) : Array.from({ length: Math.max(1, seasonCount) }, (_, index) => <option key={index + 1} value={index + 1}>Season {index + 1}</option>)}
        </select><ChevronDown size={16}/></label>
        <label className="episode-drawer-search"><Search size={18}/><input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Search episodes" aria-label="Search episodes"/>{query && <button onClick={() => setQuery('')} aria-label="Clear search"><X size={16}/></button>}</label>
        <div className="episode-drawer-filter-row"><button onClick={() => setOrder(value => value === 'asc' ? 'desc' : 'asc')}><ArrowDownUp size={15}/>{order === 'asc' ? 'Oldest first' : 'Newest first'}</button><span>{filteredEpisodes.length} shown</span></div>
      </div>
      <div className="episode-drawer-list" data-tv-row>
        {loading && <div className="episode-drawer-state"><span className="loading-mark"/><strong>Loading episodes</strong><small>Getting the season list…</small></div>}
        {!loading && error && <div className="episode-drawer-state"><ListVideo size={24}/><strong>Episodes unavailable</strong><small>{error}</small></div>}
        {!loading && !error && !filteredEpisodes.length && <div className="episode-drawer-state"><Search size={24}/><strong>{episodes.length ? 'No matching episodes' : 'No episodes listed'}</strong><small>{episodes.length ? 'Try another search.' : 'This season has no episode details available.'}</small></div>}
        {!loading && !error && filteredEpisodes.map(entry => {
          const active = Number(entry.episode_number) === Number(episode);
          const still = entry.still_path ? `https://image.tmdb.org/t/p/w342${entry.still_path}` : '';
          return <button type="button" key={entry.episode_number} className={`episode-drawer-card ${active ? 'active' : ''}`} aria-current={active ? 'true' : undefined} onClick={() => onSelect(entry.episode_number)}>
            <span className="episode-drawer-thumb">{still ? <img src={still} alt="" loading="lazy" onError={event => { event.currentTarget.hidden = true; }}/> : <span className="episode-thumb-placeholder">EP {String(entry.episode_number).padStart(2, '0')}</span>}<b>EP {String(entry.episode_number).padStart(2, '0')}</b>{active && <strong><Play size={12} fill="currentColor"/> Now playing</strong>}</span>
            <span className="episode-drawer-copy"><strong>{entry.name || `Episode ${entry.episode_number}`}</strong><span>{entry.overview || item.title || item.name || 'Episode details are not available.'}</span><small>{entry.air_date || 'Release date unavailable'}{entry.runtime ? ` · ${entry.runtime} min` : ''}</small></span>
            <ChevronRight className="episode-drawer-card-arrow" size={19}/>
          </button>;
        })}
      </div>
      <footer className="episode-drawer-footer"><span>Season {season}</span><span>Use arrows to browse · Select to play</span></footer>
    </aside>
  </div>;
}

function Player({ item, onClose }) {
  const [provider, setProvider] = useState(PROVIDERS[0].id);
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [episodeDrawer, setEpisodeDrawer] = useState(false);
  const [source, setSource] = useState(null);
  const [message, setMessage] = useState('Choose a source to start playback.');
  const [frameError, setFrameError] = useState(false);
  const [episodes, setEpisodes] = useState([]);
  const [episodeLoading, setEpisodeLoading] = useState(false);
  const [episodeError, setEpisodeError] = useState('');
  const [seasonCount, setSeasonCount] = useState(item.seasons?.length || 0);
  const [busy, setBusy] = useState(false);
  const request = useRef(0);
  const drawerTrigger = useRef(null);
  const drawerWasOpen = useRef(false);
  const episodic = item.type === 'tv';
  const directSource = Boolean(source && (/\.(m3u8|mp4|webm|ogg)(?:$|\?)/i.test(source.url) || /m3u8|mpegurl|^(hls|video|mp4|webm)$/i.test(source.type || '')));

  useEffect(() => {
    if (!episodic) return undefined;
    let cancelled = false;
    getDetails(item).then(result => { if (!cancelled) setSeasonCount(result.seasons?.length || 1); }).catch(() => {});
    return () => { cancelled = true; };
  }, [item.id, episodic]);

  useEffect(() => {
    if (drawerWasOpen.current && !episodeDrawer) drawerTrigger.current?.focus();
    drawerWasOpen.current = episodeDrawer;
  }, [episodeDrawer]);

  useEffect(() => {
    const handleBack = () => {
      if (episodeDrawer) setEpisodeDrawer(false);
      else onClose();
    };
    window.addEventListener('tv-player-back', handleBack);
    return () => window.removeEventListener('tv-player-back', handleBack);
  }, [episodeDrawer, onClose]);

  useEffect(() => {
    if (!episodic) return undefined;
    let cancelled = false;
    setEpisodeLoading(true);
    setEpisodeError('');
    getEpisodeList(item.id, season).then(data => { if (!cancelled) setEpisodes(data); }).catch(error => { if (!cancelled) { setEpisodes([]); setEpisodeError(error.message || 'Could not load this season.'); } }).finally(() => { if (!cancelled) setEpisodeLoading(false); });
    return () => { cancelled = true; };
  }, [item.id, episodic, season]);

  const load = async (nextProvider, nextEpisode = episode, nextSeason = season) => {
    const id = ++request.current;
    setBusy(true); setFrameError(false); setMessage(`Connecting to ${PROVIDERS.find(entry => entry.id === nextProvider)?.label || nextProvider}…`); setSource(null);
    try {
      const resolved = await getPlaybackSource(item, nextProvider, nextSeason, nextEpisode);
      if (request.current !== id) return;
      if (!resolved?.url) throw new Error('This source did not return a playable link.');
      setSource(resolved); setMessage(resolved.type === 'external' ? 'Open the provider directly to continue playback.' : 'Provider opened. Use its player controls to start playback.');
    } catch (error) { if (request.current === id) setMessage(error.message || 'Could not load this source. Choose another.'); }
    finally { if (request.current === id) setBusy(false); }
  };
  const changeSeason = nextSeason => {
    const bounded = Math.max(1, Math.min(seasonCount || nextSeason, nextSeason));
    setSeason(bounded); setEpisode(1);
    if (source) load(provider, 1, bounded);
  };
  const chooseEpisode = number => {
    setEpisode(number);
    setEpisodeDrawer(false);
    if (source) load(provider, number, season);
  };

  return <div className="watch-screen">
    <header className="watch-header"><button className="round-button" onClick={onClose} aria-label="Back"><ArrowLeft size={21}/></button><div><strong>{titleOf(item)}</strong><small>{episodic ? `Season ${season} · Episode ${episode}` : 'Movie'}</small></div>{episodic && <button ref={drawerTrigger} className="episode-drawer-trigger" onClick={() => setEpisodeDrawer(true)} aria-label="Open episode list"><ListVideo size={19}/><span>Episodes</span><b>{episodes.length || '—'}</b></button>}<button className="round-button" onClick={() => document.fullscreenElement ? document.exitFullscreen() : document.querySelector('.watch-screen')?.requestFullscreen?.()} aria-label="Fullscreen"><Expand size={19}/></button></header>
    <div className="provider-row" data-tv-row aria-label="Playback providers">{PROVIDERS.map(entry => <button key={entry.id} className={`provider-button ${provider === entry.id ? 'selected' : ''}`} onClick={() => { setProvider(entry.id); load(entry.id); }}>{entry.label}</button>)}</div>
    <div className="player-stage">
      {source && directSource ? <video key={source.url} src={source.url} poster={item.backdrop || item.poster} controls autoPlay playsInline onError={() => { setFrameError(true); setMessage('This direct stream could not play. Select another provider.'); }} />
        : source?.type === 'external' ? <div className="external-player"><div className="external-player-copy"><span className="eyebrow">OPENING OUTSIDE THE PLAYER</span><h1>{titleOf(item)}</h1><p>VidSrc does not allow playback inside an embedded frame. Open the provider directly to continue.</p><div className="external-player-actions" data-tv-row><button className="primary-button" onClick={() => window.open(source.url, '_blank', 'noopener,noreferrer')}>Open VidSrc</button><button className="secondary-button" onClick={() => { setSource(null); setMessage('Choose another provider to continue.'); }}>Choose another source</button></div></div></div>
          : source ? <><iframe key={source.url} title={`${titleOf(item)} player`} src={source.url} allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowFullScreen tabIndex={0} onError={() => setFrameError(true)} /><div className={`embed-assist ${frameError ? 'has-error' : ''}`} role="status"><span>{frameError ? 'This provider blocked or failed to load inside the TV app.' : 'Playback not starting? Some providers do not allow embedded playback.'}</span><button className="secondary-button" onClick={() => window.open(source.url, '_blank', 'noopener,noreferrer')}>Open provider</button><button className="text-button" onClick={() => { setSource(null); setFrameError(false); setMessage('Choose another provider to continue.'); }}>Choose another source</button></div></>
            : <div className="player-message"><img src={item.backdrop || item.poster || './logo.png'} alt=""/><div><span className="eyebrow">NOW PLAYING</span><h1>{titleOf(item)}</h1><p>{busy ? 'Connecting to your selected provider…' : message}</p>{!busy && <button className="primary-button" onClick={() => load(provider)}>Try {PROVIDERS.find(entry => entry.id === provider)?.label}</button>}</div></div>}
    </div>
    {episodeDrawer && episodic && <EpisodeDrawer item={item} season={season} seasons={item.seasons || []} seasonCount={seasonCount} episodes={episodes} episode={episode} loading={episodeLoading} error={episodeError} onSeason={changeSeason} onSelect={chooseEpisode} onClose={() => setEpisodeDrawer(false)} />}
  </div>;
}

function HomeView({ catalog, saved, continued, onOpen, onPlay, onBrowse }) {
  return <>
    {catalog.featured && <section className="hero" style={{ backgroundImage: `url("${catalog.featured.backdrop || catalog.featured.poster}")` }}>
      <div className="hero-content"><div className="eyebrow"><Sparkles size={15}/> FEATURED ON ANIMEVAULT</div><h1>{titleOf(catalog.featured)}</h1><div className="hero-meta"><span>{catalog.featured.year || 'New'}</span><span>HD</span><span>{catalog.featured.type === 'anime' ? 'Anime' : catalog.featured.type === 'tv' ? 'Series' : 'Movie'}</span>{catalog.featured.rating > 0 && <span>★ {catalog.featured.rating.toFixed(1)}</span>}</div><p>{catalog.featured.overview || 'Discover your next favorite series, movie, or anime.'}</p><div className="hero-actions" data-tv-row><button className="primary-button" onClick={() => onPlay(catalog.featured)}><Play size={18} fill="currentColor"/> Play</button><button className="secondary-button" onClick={() => onOpen(catalog.featured)}><Info size={18}/> More info</button></div></div>
    </section>}
    <div className="home-rows">
      <Rail title="Continue Watching" items={continued.slice(0, 12)} onOpen={onOpen} saved={saved} icon={Clock3} />
      <Rail title="Trending Movies" items={catalog.movies} onOpen={onOpen} saved={saved} icon={Film} onViewAll={() => onBrowse('movies')} />
      <Rail title="Popular Series" items={catalog.shows} onOpen={onOpen} saved={saved} icon={Tv} onViewAll={() => onBrowse('shows')} />
      <Rail title="Trending Anime" items={catalog.anime} onOpen={onOpen} saved={saved} icon={Sparkles} onViewAll={() => onBrowse('anime')} />
    </div>
  </>;
}

function SearchView({ inputRef, searchText, setSearchText, searchType, setSearchType, doSearch, searchResults, searching, onOpen, saved }) {
  return <section className="page search-page">
    <div className="page-intro"><div className="eyebrow">FIND SOMETHING GREAT</div><h1>Search</h1><p>Search movies, series, and anime in one place.</p></div>
    <form className="search-box" role="search" onSubmit={doSearch}><span>⌕</span><input ref={inputRef} value={searchText} onChange={event => setSearchText(event.target.value)} placeholder="Titles, people, genres…" aria-label="Search titles"/><button type="submit">Search</button></form>
    <div className="filter-row" data-tv-row>{[['all','Everything'],['movie','Movies'],['tv','Series'],['anime','Anime']].map(([id,label]) => <button type="button" key={id} className={searchType === id ? 'filter selected' : 'filter'} onClick={() => setSearchType(id)}>{label}</button>)}</div>
    <div className="result-heading"><h2>{searchText.trim() ? 'Search results' : 'Popular right now'}</h2><span>{searching ? 'Searching…' : `${searchResults.length} titles`}</span></div>
    {searchResults.length ? <div className="poster-grid">{searchResults.map(item => <Poster key={item.key} item={item} onOpen={onOpen} saved={saved.some(entry => entry.key === item.key)} />)}</div> : <div className="search-empty">{searching ? 'Searching the catalog…' : searchText.trim() ? 'No matches found. Try another title or category.' : 'Type a title to explore the catalog.'}</div>}
  </section>;
}

function BrowseView({ title, items, loading, onOpen, saved }) {
  return <section className="page browse-page">
    <div className="page-intro"><div className="eyebrow">EXPLORE THE CATALOG</div><h1>{title}</h1><p>Pick a title and open its details, save it, or start watching.</p></div>
    {loading && <div className="search-empty">Loading the catalog…</div>}
    {!loading && items.length === 0 && <div className="search-empty">No titles could be loaded. Check the network and try again.</div>}
    <div className="poster-grid">{items.map(item => <Poster key={item.key} item={item} onOpen={onOpen} saved={saved.some(entry => entry.key === item.key)} />)}</div>
  </section>;
}

function ListView({ items, onOpen }) {
  return <section className="page browse-page"><div className="page-intro"><div className="eyebrow">YOUR COLLECTION</div><h1>My List</h1><p>Titles saved on this TV.</p></div>{items.length ? <div className="poster-grid">{items.map(item => <Poster key={item.key} item={item} onOpen={onOpen} saved />)}</div> : <div className="search-empty">Your list is empty. Open a title and choose “Add to My List”.</div>}</section>;
}

function App() {
  const [screen, setScreen] = useState('home');
  const [catalog, setCatalog] = useState({ movies: [], shows: [], anime: [], featured: null });
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [detail, setDetail] = useState(null);
  const [player, setPlayer] = useState(null);
  const [saved, setSaved] = useState(getSaved);
  const [continued, setContinued] = useState(getContinue);
  const [user, setUser] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const searchInput = useRef(null);
  const currentTitle = NAV.find(entry => entry[0] === screen)?.[1] || 'AnimeVault';

  useEffect(() => {
    document.documentElement.classList.add('tv-app');
    document.body.classList.add('tv-app');
    const removeKeys = installRemoteKeys();
    let cancelled = false;
    getHomeCatalog().then(data => { if (!cancelled) setCatalog(data); })
      .catch(error => { if (!cancelled) setNotice(error.message || 'The catalog could not load.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    proxyRestoreSession().then(result => { if (!cancelled && result?.success) setUser(result.user); }).catch(() => {});
    return () => { cancelled = true; removeKeys(); document.documentElement.classList.remove('tv-app'); document.body.classList.remove('tv-app'); };
  }, []);

  useEffect(() => {
    const handleBack = () => {
      if (authOpen) setAuthOpen(false);
      else if (player) window.dispatchEvent(new Event('tv-player-back'));
      else if (detail) setDetail(null);
      else if (screen !== 'home') setScreen('home');
    };
    window.addEventListener('tv-os-back', handleBack);
    return () => window.removeEventListener('tv-os-back', handleBack);
  }, [authOpen, player, detail, screen]);

  useEffect(() => {
    if (screen !== 'search') return;
    const query = searchText.trim();
    if (!query) { setSearchResults([]); setSearching(false); return; }
    let cancelled = false;
    const timer = setTimeout(() => {
      setSearching(true);
      searchCatalog(query, searchType).then(items => { if (!cancelled) setSearchResults(items); })
        .catch(error => { if (!cancelled) { setSearchResults([]); setNotice(error.message || 'Search failed.'); } })
        .finally(() => { if (!cancelled) setSearching(false); });
    }, 280);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [screen, searchText, searchType]);

  useEffect(() => {
    if (!detail) { setDetailData(null); setDetailBusy(false); return; }
    let cancelled = false;
    setDetailBusy(true);
    getDetails(detail).then(item => { if (!cancelled) setDetailData({ ...detail, ...item }); })
      .catch(() => { if (!cancelled) setDetailData(detail); })
      .finally(() => { if (!cancelled) setDetailBusy(false); });
    return () => { cancelled = true; };
  }, [detail?.key]);

  const openItem = useCallback(item => { setDetail(item); setNotice(''); }, []);
  const toggleSaved = item => {
    const next = saved.some(entry => entry.key === item.key) ? saved.filter(entry => entry.key !== item.key) : [item, ...saved];
    setSaved(next); try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(next)); } catch {}
  };
  const playItem = item => {
    setDetail(null); setPlayer(item); setNotice('');
    const next = [item, ...continued.filter(entry => entry.key !== item.key)].slice(0, 30);
    setContinued(next); try { localStorage.setItem(CONTINUE_KEY, JSON.stringify(next)); } catch {}
  };
  const doSearch = event => { event?.preventDefault(); setScreen('search'); window.setTimeout(() => searchInput.current?.focus(), 50); };
  const browse = screen === 'movies' ? catalog.movies : screen === 'shows' ? catalog.shows : screen === 'anime' ? catalog.anime : [];
  const onAuthSuccess = account => { setUser(account); setAuthOpen(false); setNotice(`Signed in as ${account.username || account.email || 'AnimeVault user'}.`); };
  const openLogin = () => { setDetail(null); setAuthOpen(true); };

  return <div className="tv-app-shell">
    <aside className="tv-rail" aria-label="Main navigation"><img className="tv-logo" src="./logo.png" alt="AnimeVault"/><nav>{NAV.map(([id,label,Icon]) => <button key={id} className={screen === id ? 'nav-item active' : 'nav-item'} aria-label={label} title={label} aria-current={screen === id ? 'page' : undefined} onClick={() => { setScreen(id); setDetail(null); setNotice(''); }}><span className="nav-icon"><Icon size={23} strokeWidth={1.8}/></span><span className="nav-label">{label}</span></button>)}</nav><button className="account-nav" aria-label={user ? 'Account' : 'Sign in'} onClick={() => user ? setScreen('profile') : openLogin()}><span className="avatar">{user ? String(user.username || 'A').slice(0, 1).toUpperCase() : <UserRound size={20}/>}</span></button></aside>
    <main className="tv-main" key={screen}>
      <header className="topline"><div className="brand-wordmark"><span>ANIME</span><b>VAULT</b></div><div className="top-actions" data-tv-row><button className="icon-action" onClick={doSearch} aria-label="Search"><Search size={24}/></button>{user ? <button className="account-pill" onClick={() => setScreen('profile')}><UserRound size={17}/>{user.username || 'Account'}</button> : <button className="account-pill" onClick={openLogin}><UserRound size={17}/>Sign in</button>}</div></header>
      {screen === 'home' && <HomeView catalog={catalog} saved={saved} continued={continued} onOpen={openItem} onPlay={playItem} onBrowse={setScreen} />}
      {screen === 'search' && <SearchView inputRef={searchInput} searchText={searchText} setSearchText={setSearchText} searchType={searchType} setSearchType={setSearchType} doSearch={doSearch} searchResults={searchResults} searching={searching} onOpen={openItem} saved={saved} />}
      {['movies','shows','anime'].includes(screen) && <BrowseView title={currentTitle} items={browse} loading={loading} onOpen={openItem} saved={saved} />}
      {screen === 'list' && <ListView items={saved} onOpen={openItem} />}
      {screen === 'profile' && <section className="page profile-page"><div className="eyebrow">YOUR ACCOUNT</div><h1>{user?.username || 'Guest'}</h1><p>{user?.email || 'Sign in to access your account.'}</p><div className="profile-actions" data-tv-row>{user ? <button className="secondary-button" onClick={async () => { await proxyLogout(); setUser(null); setScreen('home'); }}>Sign out</button> : <button className="primary-button" onClick={openLogin}>Sign in</button>}<button className="secondary-button" onClick={() => setScreen('list')}>Open My List</button></div></section>}
      {notice && <div className="toast" role="status">{notice}<button aria-label="Dismiss" onClick={() => setNotice('')}>×</button></div>}
    </main>
    {detail && !player && <div className="detail-layer"><section className="detail-panel" role="dialog" aria-modal="true" aria-label={titleOf(detail)}><button className="close-button detail-close" autoFocus onClick={() => setDetail(null)} aria-label="Close details">×</button><div className="detail-art" style={{ backgroundImage: `url("${detailData?.backdrop || detail.backdrop || detail.poster}")` }} /><div className="detail-content"><div className="eyebrow">{detailData?.type?.toUpperCase() || detail.type.toUpperCase()}</div><h1>{titleOf(detailData || detail)}</h1><div className="hero-meta"><span>{detailData?.year || detail.year}</span><span>HD</span>{(detailData?.rating || detail.rating) > 0 && <span>★ {Number(detailData?.rating || detail.rating).toFixed(1)}</span>}</div><p>{detailBusy ? 'Loading title details…' : detailData?.overview || detail.overview || 'Title details are unavailable.'}</p>{detailData?.genres?.length > 0 && <div className="genre-list">{detailData.genres.slice(0, 5).map(genre => <span key={genre}>{genre}</span>)}</div>}<div className="detail-actions" data-tv-row><button className="primary-button" autoFocus onClick={() => playItem(detailData || detail)}>▶ Play</button><button className="secondary-button" onClick={() => toggleSaved(detailData || detail)}>{saved.some(item => item.key === detail.key) ? '✓ My List' : '+ My List'}</button></div></div></section></div>}
    {player && <Player item={player} onClose={() => setPlayer(null)} />}
    {authOpen && <AuthDialog onClose={() => setAuthOpen(false)} onSuccess={onAuthSuccess} />}
  </div>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
