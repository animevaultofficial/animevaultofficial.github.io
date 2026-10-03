import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Server } from 'lucide-react';
import { fetchMediaMeta, fetchTVSeasonDetails } from '../api/movies';
import { PLAYER_SOURCES, getSourceUrl } from '../utils/playerSources';
import { storage } from '../utils/storage';
import { useUser } from '../api/UserContext';
import { isBlockedForProfile } from '../utils/ageRating';
import { withTimeout } from '../utils/withTimeout';
import '../styles/moviePlayer.css';

export default function MovieWatch() {
  const { type, id } = useParams();
  const [params] = useSearchParams();
  const { activeSubAccount, addToHistory } = useUser();
  const [meta, setMeta] = useState(null);
  const [seasonEpisodes, setSeasonEpisodes] = useState([]);
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
    withTimeout(fetchMediaMeta(isMovie ? 'movie' : 'tv', id), 6000, 'The player did not load within 6 seconds.')
      .then(data => {
        if (cancelled) return;
        if (!data) throw new Error('Media not found.');
        if (isBlockedForProfile(data, activeSubAccount)) throw new Error('This title is blocked for Kids profiles.');
        setMeta(data);
        if (isTV) {
          const first = (data.seasons || []).find(s => s.season_number === season) || data.seasons?.[0];
          if (first) setSeason(first.season_number);
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
  const episodes = seasonEpisodes;
  const currentEpisode = episodes.find(e => e.episode_number === episode) || episodes[0];

  useEffect(() => {
    if (!meta || !isTV) return;
    let cancelled = false;
    setSeasonEpisodes([]);
    withTimeout(fetchTVSeasonDetails(id, season), 6000, 'Season episodes did not load within 6 seconds.')
      .then(data => {
        if (!cancelled) setSeasonEpisodes(data?.episodes || []);
      })
      .catch(error => {
        if (!cancelled) console.warn('[AnimeVault] Could not load season episodes:', error);
      });
    return () => { cancelled = true; };
  }, [id, isTV, meta, season]);

  useEffect(() => {
    if (!meta || !addToHistory) return;
    addToHistory({
      id: String(id),
      type: isMovie ? 'movie' : 'series',
      title,
      image: poster,
      subAccountId: activeSubAccount?.id || null,
    }).catch(error => console.warn('[AnimeVault] Could not add media to watch history:', error));
  }, [meta, id, title, poster, isMovie, addToHistory, activeSubAccount]);

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

  if (loading) return <div className="movie-player-state is-loading" role="status" aria-live="polite">Preparing player…</div>;
  if (error || !meta) return <div className="movie-player-state"><h2>{error || 'Media not found'}</h2><Link to={`/media/${isMovie ? 'movie' : 'tv'}/${id}`} className="movie-player-back"><ArrowLeft size={17} /> Back to details</Link></div>;

  return <>
    {backdrop && <link rel="preload" as="image" href={backdrop} fetchpriority="high" />}
    <div className="movie-player-page" style={{ '--movie-backdrop': backdrop ? `url("${backdrop}")` : 'none' }}>
    <main className="movie-player-main">
      <div className="movie-player-heading">
        <Link to={`/media/${isMovie ? 'movie' : 'tv'}/${id}`} className="movie-player-back"><ArrowLeft size={17} /> Back to details</Link>
        <span className="movie-player-badge"><span /> Now streaming</span>
      </div>
      <div className="movie-player-video">
        <iframe key={sourceUrl} src={sourceUrl} title={`${title} player`} allow="autoplay; fullscreen; picture-in-picture; encrypted-media" referrerPolicy="no-referrer" allowFullScreen />
      </div>
      <div className="movie-player-title-row">
        <div>
          <p className="movie-player-eyebrow">NOW PLAYING</p>
          <h1>{title}</h1>
          <p className="movie-player-meta">{isMovie ? 'Movie' : `Season ${season} · Episode ${episode}${currentEpisode?.name ? ` · ${currentEpisode.name}` : ''}`} <span>·</span> {server}</p>
        </div>
        {isTV && <div className="movie-player-episode-arrows" role="group" aria-label="Episode navigation">
          <button type="button" onClick={() => changeEpisode(-1)} disabled={!episodes.find(e => e.episode_number === episode - 1)} aria-label="Previous episode"><ChevronLeft size={19} /></button>
          <button type="button" onClick={() => changeEpisode(1)} disabled={!episodes.find(e => e.episode_number === episode + 1)} aria-label="Next episode"><ChevronRight size={19} /></button>
        </div>}
      </div>
      <section className="movie-player-panel">
        <div className="movie-player-panel-heading"><div className="movie-player-eyebrow"><Server size={15} /> PLAYBACK SERVER</div><span>Choose a source</span></div>
        <div className="movie-player-servers">{movieServers.map(s => <button key={s.id} type="button" onClick={() => setServer(s.id)} aria-pressed={server === s.id} className={server === s.id ? 'selected' : ''}>{s.label}{server === s.id && <b aria-hidden="true">✓</b>}</button>)}</div>
      </section>
      {isTV && <section className="movie-player-panel">
        <div className="movie-player-panel-heading"><div className="movie-player-eyebrow">SEASONS & EPISODES</div><span>{episodes.length} episodes</span></div>
        <div className="movie-player-seasons">{seasons.map(s => <button key={s.season_number} type="button" onClick={() => { setSeason(s.season_number); setEpisode(1); }} aria-pressed={season === s.season_number} className={season === s.season_number ? 'selected' : ''}>Season {s.season_number}</button>)}</div>
        <div className="movie-player-episodes">{episodes.map(e => <button key={e.episode_number} type="button" onClick={() => setEpisode(e.episode_number)} aria-pressed={episode === e.episode_number} className={e.episode_number === episode ? 'selected' : ''}><span className="movie-player-episode-thumb">{e.still_path ? <img src={`https://image.tmdb.org/t/p/w342${e.still_path}`} alt="" loading="lazy" decoding="async" fetchpriority="low" onError={event => { event.currentTarget.hidden = true; }} /> : <i>E{String(e.episode_number).padStart(2, '0')}</i>}</span><span className="movie-player-episode-copy"><span>E{String(e.episode_number).padStart(2, '0')}</span><strong>{e.name || `Episode ${e.episode_number}`}</strong></span></button>)}</div>
      </section>}
    </main>
    </div>
  </>;
}
