import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, ChevronDown, ChevronLeft, ChevronRight, Expand, ListVideo, Maximize, Moon, Play, Search, Server, Share2 } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { fetchMediaMeta, fetchTVSeasonDetails } from '../api/movies';
import { PLAYER_SOURCES, getSourceUrl } from '../utils/playerSources';
import { storage } from '../utils/storage';
import { useUser } from '../api/UserContext';
import { isBlockedForProfile } from '../utils/ageRating';
import { withTimeout } from '../utils/withTimeout';
import '../styles/moviePlayer.css';
import '../styles/playerPage.css';

export default function MovieWatch() {
  const { type, id } = useParams();
  const [params, setParams] = useSearchParams();
  const { user, activeSubAccount, addToHistory, toggleLike, isLiked } = useUser();
  const frameRef = useRef(null);
  const historyEntryKey = useRef('');
  const [meta, setMeta] = useState(null);
  const [seasonEpisodes, setSeasonEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [server, setServer] = useState(params.get('server') || 'vidsrc');
  const [season, setSeason] = useState(Number(params.get('season')) || 1);
  const [episode, setEpisode] = useState(Number(params.get('episode')) || 1);
  const [query, setQuery] = useState('');
  const [theaterMode, setTheaterMode] = useState(false);
  const [lightsOff, setLightsOff] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [shareMessage, setShareMessage] = useState('');

  const isMovie = type === 'movie';
  const isTV = type === 'tv' || type === 'series';
  const movieServers = useMemo(
    () => PLAYER_SOURCES.filter(source => ['vidsrc', 'videasy', 'vidnest'].includes(source.id)),
    []
  );

  useEffect(() => {
    setServer(params.get('server') || 'vidsrc');
    setSeason(Number(params.get('season')) || 1);
    setEpisode(Number(params.get('episode')) || 1);
    setQuery('');
    setTheaterMode(false);
    setLightsOff(false);
    historyEntryKey.current = '';
  }, [id, type]);

  useEffect(() => {
    if (!isMovie && !isTV) {
      setLoading(false);
      setError('This content type is temporarily unavailable.');
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    setMeta(null);
    setSeasonEpisodes([]);
    withTimeout(fetchMediaMeta(isMovie ? 'movie' : 'tv', id), 6000, 'The player did not load within 6 seconds.')
      .then(data => {
        if (cancelled) return;
        if (!data) throw new Error('Media not found.');
        if (isBlockedForProfile(data, activeSubAccount)) throw new Error('This title is blocked for Kids profiles.');
        setMeta(data);
        if (isTV) {
          const availableSeasons = (data.seasons || []).filter(item => item.season_number > 0);
          const requestedSeason = Number(params.get('season')) || season;
          const firstSeason = availableSeasons.find(item => item.season_number === requestedSeason) || availableSeasons[0];
          if (firstSeason) setSeason(firstSeason.season_number);
        }
      })
      .catch(loadError => { if (!cancelled) setError(loadError?.message || 'Unable to load player.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, type, isMovie, isTV, activeSubAccount]);

  const title = meta?.name || meta?.title || 'Unknown Title';
  const poster = meta?.poster || '';
  const seasons = useMemo(() => (meta?.seasons || []).filter(item => item.season_number > 0), [meta]);
  const episodes = seasonEpisodes;
  const currentEpisode = episodes.find(item => item.episode_number === episode) || episodes[0];
  const activeEpisodeNumber = currentEpisode?.episode_number || episode;
  const filteredEpisodes = useMemo(() => {
    const searchTerm = query.trim().toLowerCase();
    if (!searchTerm) return episodes;
    return episodes.filter(item =>
      [item.episode_number, item.name, item.overview].filter(Boolean).join(' ').toLowerCase().includes(searchTerm)
    );
  }, [episodes, query]);
  const currentIndex = episodes.findIndex(item => item.episode_number === Number(episode));
  const liked = isLiked?.(String(meta?.tmdbId || id));

  useEffect(() => {
    if (!meta || !isTV) return;
    let cancelled = false;
    setSeasonEpisodes([]);
    withTimeout(fetchTVSeasonDetails(id, season), 6000, 'Season episodes did not load within 6 seconds.')
      .then(data => {
        if (cancelled) return;
        const loadedEpisodes = data?.episodes || [];
        setSeasonEpisodes(loadedEpisodes);
        if (loadedEpisodes.length && !loadedEpisodes.some(item => item.episode_number === Number(episode))) {
          setEpisode(loadedEpisodes[0].episode_number);
        }
      })
      .catch(loadError => {
        if (!cancelled) console.warn('[AnimeVault] Could not load season episodes:', loadError);
      });
    return () => { cancelled = true; };
  }, [id, isTV, meta, season]);

  useEffect(() => {
    if (!meta || !addToHistory) return;
    const entryKey = `${isMovie ? 'movie' : 'series'}:${id}:${activeSubAccount?.id || ''}`;
    if (historyEntryKey.current === entryKey) return;
    historyEntryKey.current = entryKey;
    addToHistory({
      id: String(id),
      type: isMovie ? 'movie' : 'series',
      title,
      image: poster,
      subAccountId: activeSubAccount?.id || null,
    }).catch(loadError => console.warn('[AnimeVault] Could not add media to watch history:', loadError));
  }, [meta, id, title, poster, isMovie, addToHistory, activeSubAccount]);

  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

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

  const selectEpisode = nextEpisode => {
    setEpisode(nextEpisode);
    const nextParams = new URLSearchParams(params);
    nextParams.set('season', String(season));
    nextParams.set('episode', String(nextEpisode));
    setParams(nextParams, { replace: true });
  };

  const selectSeason = nextSeason => {
    setSeason(nextSeason);
    setEpisode(1);
    const nextParams = new URLSearchParams(params);
    nextParams.set('season', String(nextSeason));
    nextParams.set('episode', '1');
    setParams(nextParams, { replace: true });
  };

  const changeEpisode = delta => {
    const next = episodes[currentIndex + delta];
    if (next) selectEpisode(next.episode_number);
  };

  const toggleFullscreen = async () => {
    const target = frameRef.current?.parentElement;
    if (!target) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await target.requestFullscreen();
    } catch (fullscreenError) {
      console.warn('[AnimeVault] Fullscreen is unavailable:', fullscreenError);
    }
  };

  const share = async () => {
    const shareData = { title, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(shareData);
      else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareData.url);
        setShareMessage('Link copied');
        window.setTimeout(() => setShareMessage(''), 2500);
      } else {
        console.warn('[AnimeVault] Sharing is unavailable in this browser.');
      }
    } catch (shareError) {
      if (shareError?.name !== 'AbortError') console.warn('[AnimeVault] Could not share this title:', shareError);
    }
  };

  const toggleFavorite = () => {
    if (!user) return;
    toggleLike?.({ id: String(meta?.tmdbId || id), type: isMovie ? 'movie' : 'series', title, image: poster });
  };

  if (loading) return <div className="anime-player-state is-loading" role="status" aria-live="polite">Preparing player…</div>;
  if (error || !meta) {
    return <div className="anime-player-state"><h2>{error || 'Media not found'}</h2><Link to={`/media/${isMovie ? 'movie' : 'tv'}/${id}`} className="anime-player-back"><ArrowLeft size={17}/> Back to details</Link></div>;
  }

  const year = (meta.release_date || meta.first_air_date || '').slice(0, 4);
  const overview = meta.overview || 'No synopsis is available for this title yet.';
  const canGoPrevious = isTV && currentIndex > 0;
  const canGoNext = isTV && currentIndex >= 0 && currentIndex < episodes.length - 1;

  return <div className={`anime-player-page ${theaterMode ? 'theater-mode' : ''} ${lightsOff ? 'lights-off' : ''}`}>
    {lightsOff && <button type="button" className="anime-player-dim-layer" aria-label="Turn lights on" onClick={() => setLightsOff(false)} />}
    <main className="anime-player-layout">
      <section className="anime-player-primary">
        <div className="anime-player-video-wrap">
          <iframe
            ref={frameRef}
            key={sourceUrl}
            src={sourceUrl}
            title={isMovie ? `${title} player` : `${title} season ${season} episode ${episode}`}
            className="anime-player-iframe"
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            allowFullScreen
          />
        </div>
        <div className="anime-player-progress-track"><span /></div>
        <div className="anime-player-toolbar">
          <button type="button" aria-label="Previous episode" onClick={() => changeEpisode(-1)} disabled={!canGoPrevious}><ChevronLeft size={17}/></button>
          <button type="button" aria-label="Next episode" onClick={() => changeEpisode(1)} disabled={!canGoNext}><ChevronRight size={17}/></button>
          <span className="anime-player-time">{isMovie ? 'Movie' : `S${String(season).padStart(2, '0')} · E${String(activeEpisodeNumber).padStart(2, '0')}`} · {server}</span>
          <span className="anime-player-spacer" />
          <button type="button" aria-label="Toggle fullscreen" onClick={toggleFullscreen}>{fullscreen ? <Expand size={15}/> : <Maximize size={15}/>}</button>
        </div>
        <div className="anime-player-quick-controls">
          <button type="button" aria-pressed={theaterMode} className={theaterMode ? 'selected' : ''} onClick={() => setTheaterMode(value => !value)}><Expand size={12}/> Theater mode</button>
          <button type="button" aria-pressed={lightsOff} className={lightsOff ? 'selected' : ''} onClick={() => setLightsOff(value => !value)}><Moon size={12}/> Lights off</button>
          <button type="button" onClick={toggleFullscreen}><Maximize size={12}/> Fullscreen</button>
          <span className="anime-player-quick-spacer" />
          {isTV && <>
            <button type="button" onClick={() => changeEpisode(-1)} disabled={!canGoPrevious}><ChevronLeft size={12}/> Previous episode</button>
            <button type="button" onClick={() => changeEpisode(1)} disabled={!canGoNext}>Next episode <ChevronRight size={12}/></button>
          </>}
        </div>

        <section className="anime-player-current">
          <h1>{isMovie ? title : `${activeEpisodeNumber}. ${currentEpisode?.name || `Episode ${activeEpisodeNumber}`}`}</h1>
          <p>{isMovie ? overview : currentEpisode?.overview || overview}</p>
          <div className="anime-player-actions">
            <button type="button" className={liked ? 'active' : ''} onClick={toggleFavorite}><Check size={13}/> {liked ? 'In library' : 'Add to library'}</button>
            <button type="button" onClick={share}><Share2 size={13}/> Share</button>
            <Link to={`/media/${isMovie ? 'movie' : 'tv'}/${id}`} className="anime-player-back"><ArrowLeft size={13}/> Back to details</Link>
            {shareMessage && <span className="anime-player-share-message" role="status">{shareMessage}</span>}
          </div>
        </section>

        <section className="anime-player-series">
          {poster && <img src={poster} alt="" loading="lazy" decoding="async" />}
          <div className="anime-player-series-copy">
            <div className="anime-player-series-title">
              <h2>{title}</h2>
              <span>{year}{!isMovie && meta.number_of_seasons ? ` · ${meta.number_of_seasons} seasons` : ''}{isMovie && meta.runtime ? ` · ${meta.runtime} min` : ''}</span>
            </div>
            <p>{overview}</p>
          </div>
        </section>
      </section>

      <aside className="anime-player-sidebar">
        {isTV ? <>
          <div className="anime-player-sidebar-head">
            <label className="anime-player-select">
              <ListVideo size={14}/>
              <span>Season</span>
              <select value={season} onChange={event => selectSeason(Number(event.target.value))} aria-label="Select season">
                {seasons.map(item => <option key={item.season_number} value={item.season_number}>{item.name || `Season ${item.season_number}`}</option>)}
              </select>
              <ChevronDown size={13}/>
            </label>
            <div className="anime-player-select"><ListVideo size={14}/><span>Episodes · {episodes.length}</span><ChevronDown size={13}/></div>
            <label className="anime-player-search"><Search size={14}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search episodes" /></label>
          </div>
          <div className="anime-player-episode-list">
            {filteredEpisodes.length ? filteredEpisodes.map(item => {
              const active = Number(item.episode_number) === Number(activeEpisodeNumber);
              const image = item.still_path ? `https://image.tmdb.org/t/p/w342${item.still_path}` : '';
              return <button
                type="button"
                key={item.episode_number}
                className={`anime-player-episode ${active ? 'active' : ''}`}
                onClick={() => selectEpisode(item.episode_number)}
                title={item.name || `Episode ${item.episode_number}`}
              >
                <span className="anime-player-thumb">
                  {image ? <img src={image} alt="" loading="lazy" decoding="async" onError={event => { event.currentTarget.hidden = true; }}/>
                  : <span>Episode {String(item.episode_number).padStart(2, '0')}</span>}
                  <b>Episode {item.episode_number}</b>
                  {active && <strong><Play size={10} fill="currentColor"/> Now playing</strong>}
                </span>
                <span className="anime-player-episode-copy">
                  <strong>{item.name || `Episode ${item.episode_number}`}</strong>
                  <span>{item.overview || title}</span>
                  {item.runtime > 0 && <time>{item.runtime} min</time>}
                </span>
              </button>;
            }) : <div className="anime-player-no-episodes">No episodes match your search.</div>}
          </div>
        </> : <>
          <div className="anime-player-sidebar-head">
            <div className="anime-player-select"><Server size={14}/><span>Playback server</span><ChevronDown size={13}/></div>
            <div className="anime-player-movie-servers">{movieServers.map(source => <button key={source.id} type="button" onClick={() => setServer(source.id)} aria-pressed={server === source.id} className={server === source.id ? 'active' : ''}>{source.label}</button>)}</div>
          </div>
          <section className="anime-player-series anime-player-movie-info">
            {poster && <img src={poster} alt="" loading="lazy" decoding="async" />}
            <div className="anime-player-series-copy">
              <div className="anime-player-series-title"><h2>{title}</h2></div>
              <p>{[year, meta.runtime ? `${meta.runtime} min` : '', meta.vote_average ? `★ ${Number(meta.vote_average).toFixed(1)}` : ''].filter(Boolean).join(' · ')}</p>
            </div>
          </section>
        </>}
      </aside>
    </main>
  </div>;
}
