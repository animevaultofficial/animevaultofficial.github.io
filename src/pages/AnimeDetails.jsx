import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ExternalLink, Play, RefreshCw } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getAniPMSeries, getAniPMTitle } from '../api/anipm';
import { useUser } from '../api/UserContext';
import { isBlockedForProfile } from '../utils/ageRating';

const firstValue = (...values) => values.find(value => value !== undefined && value !== null && value !== '');

function normalizeAnime(titleData, seriesData, id) {
  const episodeList = seriesData?.episodeList || titleData?.episodeList || [];
  return {
    id,
    title: firstValue(titleData?.title, seriesData?.title) || 'Anime',
    nativeTitle: firstValue(titleData?.nativeTitle, titleData?.native, seriesData?.nativeTitle),
    poster: firstValue(titleData?.poster, titleData?.posterImage, titleData?.coverImage, seriesData?.poster, seriesData?.posterImage),
    banner: firstValue(titleData?.banner, titleData?.bannerImage, titleData?.backdrop, titleData?.backdropImage, seriesData?.banner, seriesData?.bannerImage, seriesData?.backdrop),
    synopsis: firstValue(titleData?.synopsis, titleData?.description, seriesData?.synopsis) || '',
    score: firstValue(titleData?.score, titleData?.rating, seriesData?.score),
    year: firstValue(titleData?.year, titleData?.releaseYear, seriesData?.year),
    type: firstValue(titleData?.type, titleData?.format, seriesData?.type),
    status: firstValue(titleData?.status, seriesData?.status),
    episodesCount: firstValue(titleData?.episodes, episodeList.length),
    duration: firstValue(titleData?.duration, seriesData?.duration),
    genres: titleData?.genres || seriesData?.genres || [],
    studio: firstValue(titleData?.studio, titleData?.studios?.[0], seriesData?.studio),
    aired: firstValue(titleData?.aired, titleData?.airing, seriesData?.aired),
    anilistId: firstValue(titleData?.anilistId, seriesData?.anilistId, id),
    malId: firstValue(titleData?.malId, seriesData?.malId),
    episodeList,
    titleData,
    seriesData,
  };
}

export default function AnimeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeSubAccount } = useUser();
  const [titleData, setTitleData] = useState(null);
  const [seriesData, setSeriesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!id) {
        setError('Anime ID is missing.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      const [titleResult, seriesResult] = await Promise.allSettled([
        getAniPMTitle(id),
        getAniPMSeries(id),
      ]);

      if (cancelled) return;

      const title = titleResult.status === 'fulfilled' ? titleResult.value : null;
      const series = seriesResult.status === 'fulfilled' ? seriesResult.value : null;

      if (!title && !series) {
        setError('Unable to load this anime right now.');
        setTitleData(null);
        setSeriesData(null);
        setLoading(false);
        return;
      }

      const normalized = normalizeAnime(title, series, id);
      if (isBlockedForProfile(normalized.seriesData || normalized.titleData || normalized, activeSubAccount)) {
        setError('This title is blocked for Kids profiles.');
        setTitleData(null);
        setSeriesData(null);
        setLoading(false);
        return;
      }

      setTitleData(title);
      setSeriesData(series);
      setLoading(false);
    }

    void load();
    return () => { cancelled = true; };
  }, [id, activeSubAccount]);

  const anime = useMemo(() => normalizeAnime(titleData, seriesData, id), [titleData, seriesData, id]);

  const firstPlayableEpisode = useMemo(
    () => anime.episodeList.find(ep => ep?.available?.sub || ep?.available?.dub),
    [anime.episodeList]
  );

  const watchPath = firstPlayableEpisode
    ? `/anime/${encodeURIComponent(id)}?episode=${encodeURIComponent(firstPlayableEpisode.number)}&lang=${firstPlayableEpisode.available?.sub ? 'sub' : 'dub'}`
    : null;

  if (loading) {
    return (
      <section className="anime-details-phase1 anime-details-loading" aria-busy="true">
        <div className="anime-details-loading-backdrop" />
        <div className="anime-details-loading-content">
          <div className="anime-details-skeleton anime-details-skeleton-poster" />
          <div className="anime-details-skeleton-stack">
            <div className="anime-details-skeleton anime-details-skeleton-title" />
            <div className="anime-details-skeleton anime-details-skeleton-meta" />
            <div className="anime-details-skeleton anime-details-skeleton-copy" />
            <div className="anime-details-skeleton anime-details-skeleton-copy short" />
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="anime-details-phase1 anime-details-state" role="alert">
        <div className="anime-details-state-card">
          <div className="anime-details-eyebrow">ANIME DETAILS</div>
          <h1>{error}</h1>
          <p>We could not prepare this title. The catalogue or episode service may be temporarily unavailable.</p>
          <div className="anime-details-state-actions">
            <button type="button" className="anime-details-action primary" onClick={() => window.location.reload()}>
              <RefreshCw size={16} /> Try again
            </button>
            <button type="button" className="anime-details-action" onClick={() => navigate('/anime')}>
              <ArrowLeft size={16} /> Back to Anime
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="anime-details-phase1">
      <div className="anime-details-phase1-backdrop" style={anime.banner ? { backgroundImage: `url("${anime.banner}")` } : undefined} aria-hidden="true" />
      <div className="anime-details-phase1-overlay" aria-hidden="true" />

      <div className="anime-details-phase1-content">
        <Link to="/anime" className="anime-details-back"><ArrowLeft size={16} /> Anime catalogue</Link>

        <div className="anime-details-phase1-hero">
          <div className="anime-details-phase1-poster">
            {anime.poster ? <img src={anime.poster} alt="" /> : <span>AnimeVault</span>}
          </div>

          <div className="anime-details-phase1-copy">
            <div className="anime-details-eyebrow">ANIME DETAILS</div>
            <h1>{anime.title}</h1>
            {anime.nativeTitle && anime.nativeTitle !== anime.title && <p className="anime-details-native">{anime.nativeTitle}</p>}

            <div className="anime-details-meta">
              {anime.score && <span>★ {anime.score}</span>}
              {anime.year && <span>{anime.year}</span>}
              {anime.episodesCount && <span>{anime.episodesCount} Episodes</span>}
              {anime.type && <span>{anime.type}</span>}
              {anime.status && <span>{anime.status}</span>}
            </div>

            {anime.genres.length > 0 && (
              <div className="anime-details-genres">{anime.genres.slice(0, 6).map(genre => <span key={genre}>{genre}</span>)}</div>
            )}

            <p className="anime-details-synopsis">{anime.synopsis || 'Synopsis information is not available for this title yet.'}</p>

            <div className="anime-details-actions">
              {watchPath ? (
                <Link to={watchPath} className="anime-details-action primary"><Play size={17} fill="currentColor" /> Watch Episode {firstPlayableEpisode.number}</Link>
              ) : (
                <span className="anime-details-unavailable">No playable episode available</span>
              )}
              {anime.anilistId && (
                <a href={`https://anilist.co/anime/${encodeURIComponent(anime.anilistId)}`} target="_blank" rel="noreferrer" className="anime-details-action">
                  AniList <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="anime-details-phase1-grid">
          <section className="anime-details-phase1-panel">
            <div className="anime-details-panel-heading"><span>DATA CONTRACT</span><small>Phase 1</small></div>
            <dl className="anime-details-data-grid">
              <div><dt>Episodes</dt><dd>{anime.episodeList.length || anime.episodesCount || '—'}</dd></div>
              <div><dt>Duration</dt><dd>{anime.duration || '—'}</dd></div>
              <div><dt>Studio</dt><dd>{anime.studio || '—'}</dd></div>
              <div><dt>Aired</dt><dd>{anime.aired || '—'}</dd></div>
              <div><dt>Audio</dt><dd>{anime.episodeList.some(ep => ep?.available?.sub) ? 'SUB' : '—'}{anime.episodeList.some(ep => ep?.available?.dub) ? ' / DUB' : ''}</dd></div>
              <div><dt>AniList ID</dt><dd>{anime.anilistId || '—'}</dd></div>
            </dl>
          </section>

          <section className="anime-details-phase1-panel">
            <div className="anime-details-panel-heading"><span>EPISODE SOURCE</span><small>{anime.episodeList.length} loaded</small></div>
            <p className="anime-details-source-copy">
              Phase 1 connects the details route to the same Ani.pm series contract already used by the player. The episode explorer will build on this normalized data in Phase 2.
            </p>
          </section>
        </div>
      </div>
    </section>
  );
}
