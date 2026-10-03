import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, Clock3, Play, Share2, Star, Tv } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { fetchMovieDetails, fetchTVDetails } from '../api/movies';
import { withTimeout } from '../utils/withTimeout';
import '../styles/mediaDetails.css';

export default function MovieDetails() {
  const { type, id } = useParams();
  const [searchParams] = useSearchParams();
  const [media, setMedia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [season, setSeason] = useState(Number(searchParams.get('season')) || 1);

  const isMovie = type === 'movie';
  const isTV = type === 'tv' || type === 'series';
  const seasons = useMemo(
    () => (media?.seasons || []).filter(item => Number(item.season_number) > 0),
    [media]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setMedia(null);

    const load = isMovie ? fetchMovieDetails : isTV ? fetchTVDetails : null;
    if (!load) {
      setError('This content type is not supported.');
      setLoading(false);
      return () => { cancelled = true; };
    }

    withTimeout(load(id), 6000, 'Title details did not load within 6 seconds.')
      .then(data => {
        if (cancelled) return;
        if (!data?.id) throw new Error('Could not load this title from TMDB.');
        setMedia(data);
        const firstSeason = (data.seasons || []).find(item => Number(item.season_number) > 0);
        setSeason(Number(searchParams.get('season')) || firstSeason?.season_number || 1);
      })
      .catch(loadError => {
        if (!cancelled) setError(loadError?.message || 'Could not load this title.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [id, isMovie, isTV, searchParams]);

  if (loading) return <div className="media-details-state is-loading" role="status" aria-live="polite">Loading title details…</div>;
  if (error || !media) {
    return (
      <div className="media-details-state">
        <h1>{error || 'Title unavailable'}</h1>
        <Link to="/dramas-movies"><ArrowLeft size={16} /> Back to movies</Link>
      </div>
    );
  }

  const title = media.title || media.name || 'Untitled';
  const year = (media.release_date || media.first_air_date || '').slice(0, 4);
  const poster = media.poster_path ? `https://image.tmdb.org/t/p/w500${media.poster_path}` : '';
  const backdrop = media.backdrop_path ? `https://image.tmdb.org/t/p/w1280${media.backdrop_path}` : poster;
  const selectedSeason = seasons.find(item => Number(item.season_number) === season) || seasons[0];
  const firstEpisode = selectedSeason?.season_number || 1;
  const watchUrl = `/watch/${isMovie ? 'movie' : 'tv'}/${id}${isMovie ? '' : `?season=${firstEpisode}&episode=1`}`;
  const rating = Number(media.vote_average);

  const share = async () => {
    try {
      const data = { title, url: window.location.href };
      if (navigator.share) await navigator.share(data);
      else if (navigator.clipboard) await navigator.clipboard.writeText(data.url);
      else console.warn('[AnimeVault] Sharing is unavailable in this browser.');
    } catch (shareError) {
      if (shareError?.name !== 'AbortError') console.warn('[AnimeVault] Could not share this title:', shareError);
    }
  };

  return (
    <article className="media-details-page">
      <section className="media-details-hero">
        {backdrop && <img className="media-details-backdrop" src={backdrop} alt="" aria-hidden="true" loading="eager" fetchpriority="high" decoding="async" />}
        <div className="media-details-shade" />
        <div className="media-details-content">
          <Link to="/dramas-movies" className="media-details-back"><ArrowLeft size={16} /> Back to movies</Link>
          <div className="media-details-title-row">
            <div className="media-details-poster">{poster && <img src={poster} alt={title} loading="eager" fetchpriority="high" decoding="async" />}</div>
            <div className="media-details-copy">
              <span className="media-details-kicker">{isMovie ? 'MOVIE' : 'TV SERIES'}</span>
              <h1>{title}</h1>
              <div className="media-details-meta">
                {year && <span><CalendarDays size={14} /> {year}</span>}
                {!isMovie && media.number_of_seasons > 0 && <span><Tv size={14} /> {media.number_of_seasons} seasons</span>}
                {media.runtime > 0 && <span><Clock3 size={14} /> {media.runtime} min</span>}
                {rating > 0 && <span className="media-details-rating"><Star size={14} fill="currentColor" /> {rating.toFixed(1)}</span>}
              </div>
              <div className="media-details-genres">
                {(media.genres || []).map(genre => <span key={genre.id}>{genre.name}</span>)}
              </div>
              <p className="media-details-overview">{media.overview || 'No synopsis is available for this title yet.'}</p>
              <div className="media-details-actions">
                <Link to={watchUrl} className="media-details-watch"><Play size={17} fill="currentColor" /> Watch {isMovie ? 'movie' : 'now'}</Link>
                <button type="button" onClick={share} aria-label="Share title"><Share2 size={17} /></button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {!isMovie && seasons.length > 0 && (
        <section className="media-details-seasons">
          <div className="media-details-section-heading">
            <div><span>EPISODE GUIDE</span><h2>Seasons</h2></div>
            <label>
              Season
              <select value={season} onChange={event => setSeason(Number(event.target.value))}>
                {seasons.map(item => <option key={item.id} value={item.season_number}>{item.name || `Season ${item.season_number}`}</option>)}
              </select>
            </label>
          </div>
          {selectedSeason && (
            <Link to={`/watch/tv/${id}?season=${selectedSeason.season_number}&episode=1`} className="media-details-season-card">
              {selectedSeason.poster_path && <img src={`https://image.tmdb.org/t/p/w342${selectedSeason.poster_path}`} alt="" />}
              <span><strong>{selectedSeason.name || `Season ${selectedSeason.season_number}`}</strong><small>{selectedSeason.episode_count || 0} episodes</small></span>
              <Play size={17} />
            </Link>
          )}
        </section>
      )}
    </article>
  );
}
