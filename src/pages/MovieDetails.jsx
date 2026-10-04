import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Clock3, Play, Share2, Star, Tv } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { fetchMovieDetails, fetchTVDetails } from '../api/movies';
import { withTimeout } from '../utils/withTimeout';
import '../styles/animeDetails.css';
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
  const runtime = isMovie ? media.runtime : media.episode_run_time?.[0];
  const episodeCount = isMovie ? null : media.number_of_episodes;
  const watchUrl = `/watch/${isMovie ? 'movie' : 'tv'}/${id}${isMovie ? '' : `?season=${selectedSeason?.season_number || 1}&episode=1`}`;
  const rating = Number(media.vote_average);
  const mediaFormat = isMovie ? 'MOVIE' : 'TV SERIES';

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
    <section className="anime-details-page media-anime-details-page">
      <div className="details-hero">
        {backdrop && <img className="details-hero-image" src={backdrop} alt="" aria-hidden="true" loading="eager" fetchpriority="high" decoding="async" />}
        <div className="details-hero-vignette" />
        <div className="details-hero-fade" />
        <div className="details-hero-inner">
          <Link to="/dramas-movies" className="details-back" aria-label="Back to movies"><ArrowLeft size={17} /></Link>

          <div className="details-hero-grid">
            <div className="details-poster-column">
              <div className="details-poster">{poster && <img src={poster} alt={title} loading="eager" fetchpriority="high" decoding="async" />}</div>
              <div className="details-side-info">
                <InfoRow label="Format" value={isMovie ? 'Movie' : 'TV Series'} />
                {!isMovie && media.number_of_seasons > 0 && <InfoRow label="Seasons" value={media.number_of_seasons} />}
                {episodeCount > 0 && <InfoRow label="Episodes" value={episodeCount} />}
                {runtime > 0 && <InfoRow label={isMovie ? 'Runtime' : 'Episode length'} value={<>{runtime} min</>} />}
                <InfoRow label={isMovie ? 'Released' : 'First aired'} value={year || '—'} />
                <InfoRow label="Score" value={rating > 0 ? <><Star size={12} fill="currentColor" /> {rating.toFixed(1)}</> : '—'} accent />
                {media.status && <InfoRow label="Status" value={media.status} />}
              </div>
            </div>

            <div className="details-main">
              <div className="details-title-block">
                <h1>{title}</h1>
                <div className="details-meta-row">
                  {rating > 0 && <span className="score-pill"><Star size={13} fill="currentColor" /> {rating.toFixed(1)}</span>}
                  {year && <span>{year}</span>}
                  {!isMovie && media.number_of_seasons > 0 && <span><Tv size={13} /> {media.number_of_seasons} Seasons</span>}
                  {episodeCount > 0 && <span>{episodeCount} Episodes</span>}
                  {runtime > 0 && <span><Clock3 size={13} /> {runtime} min</span>}
                  <span>{mediaFormat}</span>
                  {(media.genres || []).slice(0, 4).map(genre => <span key={genre.id} className="details-genre">{genre.name}</span>)}
                </div>
                <p className="details-synopsis">{media.overview || 'No synopsis is available for this title yet.'}</p>
              </div>

              <div className="details-action-row">
                <Link to={watchUrl} className="details-primary-btn"><Play size={17} fill="currentColor" /> Watch now</Link>
                <button type="button" className="details-round-btn" onClick={share} aria-label="Share title"><Share2 size={17} /></button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!isMovie && seasons.length > 0 && (
        <div className="details-body">
          <section className="media-details-seasons" aria-label="Season guide">
            <div className="media-details-section-heading">
              <div><span>EPISODE GUIDE</span><h2>Seasons</h2></div>
              <label>
                Season
                <select value={selectedSeason?.season_number || season} onChange={event => setSeason(Number(event.target.value))}>
                  {seasons.map(item => <option key={item.id} value={item.season_number}>{item.name || `Season ${item.season_number}`}</option>)}
                </select>
              </label>
            </div>
            {selectedSeason && (
              <Link to={`/watch/tv/${id}?season=${selectedSeason.season_number}&episode=1`} className="media-details-season-card">
                {selectedSeason.poster_path && <img src={`https://image.tmdb.org/t/p/w342${selectedSeason.poster_path}`} alt="" loading="lazy" />}
                <span><strong>{selectedSeason.name || `Season ${selectedSeason.season_number}`}</strong><small>{selectedSeason.episode_count || 0} episodes</small></span>
                <Play size={17} />
              </Link>
            )}
          </section>
        </div>
      )}
    </section>
  );
}

function InfoRow({ label, value, accent = false }) {
  return <div className="details-info-row"><span>{label}</span><strong className={accent ? 'accent' : ''}>{value}</strong></div>;
}
