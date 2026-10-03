import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Bell, BookOpen, Check, ChevronDown, Download, ExternalLink,
  Grid3X3, Heart, Link2, List, MessageSquare, Play, Plus, Search, Share2,
  Sparkles, Star
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getAniPMSeries, getAniPMTitle } from '../api/anipm';
import { fetchEpisodeThumbnails } from '../api/jikan';
import { useUser } from '../api/UserContext';
import { isBlockedForProfile } from '../utils/ageRating';
import AnimeEpisodeExplorer from '../components/AnimeEpisodeExplorer';
import CommentsSection from '../components/CommentsSection';
import '../styles/animeDetails.css';

const firstValue = (...values) => values.find(value => value !== undefined && value !== null && value !== '');

function numericValue(...values) {
  const value = firstValue(...values);
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  if (value && typeof value === 'object') {
    return numericValue(value.total, value.count, value.episodes);
  }
  return undefined;
}

function textValue(value) {
  if (Array.isArray(value)) return value.map(item => textValue(item)).filter(Boolean);
  if (value && typeof value === 'object') return firstValue(value.name, value.title, value.label, value.value);
  return value;
}

function normalizeList(value) {
  if (!Array.isArray(value)) return [];
  return value.map(textValue).filter(Boolean);
}

function normalizeAnime(titleData, seriesData, id) {
  const episodeList = seriesData?.episodeList || titleData?.episodeList || [];
  const rawGenres = titleData?.genres || titleData?.genre || seriesData?.genres || seriesData?.genre || [];
  const related = titleData?.related || titleData?.relatedTitles || titleData?.relations || titleData?.recommendations
    || seriesData?.related || seriesData?.relatedTitles || [];

  return {
    id,
    title: firstValue(titleData?.title, seriesData?.title) || 'Anime',
    nativeTitle: firstValue(titleData?.nativeTitle, titleData?.native, titleData?.japaneseTitle, seriesData?.nativeTitle),
    poster: firstValue(titleData?.poster, titleData?.posterImage, titleData?.coverImage, titleData?.image, seriesData?.poster, seriesData?.posterImage),
    banner: firstValue(titleData?.banner, titleData?.bannerImage, titleData?.backdrop, titleData?.backdropImage, titleData?.coverImage?.extraLarge, seriesData?.banner, seriesData?.bannerImage, seriesData?.backdrop),
    synopsis: firstValue(titleData?.synopsis, titleData?.description, seriesData?.synopsis, seriesData?.description) || '',
    score: firstValue(titleData?.score, titleData?.rating, titleData?.averageScore, seriesData?.score, seriesData?.rating),
    year: firstValue(titleData?.year, titleData?.releaseYear, titleData?.seasonYear, seriesData?.year),
    type: firstValue(titleData?.type, titleData?.format, seriesData?.type) || 'TV',
    status: firstValue(titleData?.status, seriesData?.status),
    episodesCount: numericValue(titleData?.episodes, titleData?.episodeCount, seriesData?.episodes, seriesData?.episodeCount, episodeList.length),
    duration: firstValue(titleData?.duration, seriesData?.duration),
    genres: normalizeList(rawGenres),
    studio: firstValue(titleData?.studio, titleData?.studios?.[0]?.name, titleData?.studios?.[0], seriesData?.studio),
    aired: firstValue(titleData?.aired, titleData?.airing, seriesData?.aired),
    season: firstValue(titleData?.season, seriesData?.season),
    rating: firstValue(titleData?.contentRating, titleData?.ratingLabel, titleData?.rating_label, seriesData?.contentRating),
    views: firstValue(titleData?.views, titleData?.viewCount, seriesData?.views),
    anilistId: firstValue(titleData?.anilistId, seriesData?.anilistId, id),
    malId: firstValue(titleData?.malId, seriesData?.malId),
    episodeList,
    related: Array.isArray(related) ? related : [],
    titleData,
    seriesData,
  };
}

function getEpisodeImage(ep, fallback) {
  return firstValue(ep?.image, ep?.thumbnail, ep?.thumbnailUrl, ep?.imageUrl, ep?.coverImage, ep?.poster, fallback);
}

function formatScore(score) {
  if (score === undefined || score === null || score === '') return null;
  const n = Number(score);
  return Number.isFinite(n) ? (n > 10 ? (n / 10).toFixed(1) : n.toFixed(1)) : String(score);
}

export default function AnimeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, activeSubAccount, isLiked, toggleLike } = useUser();

  const [titleData, setTitleData] = useState(null);
  const [seriesData, setSeriesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [activeTab, setActiveTab] = useState('episodes');
  const [overviewOpen, setOverviewOpen] = useState(false);

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
      const [titleResult, seriesResult] = await Promise.allSettled([getAniPMTitle(id), getAniPMSeries(id)]);
      if (cancelled) return;
      const title = titleResult.status === 'fulfilled' ? titleResult.value : null;
      const series = seriesResult.status === 'fulfilled' ? seriesResult.value : null;
      if (!title && !series) {
        setError('Unable to load this anime right now.');
        setLoading(false);
        return;
      }
      const normalized = normalizeAnime(title, series, id);
      if (isBlockedForProfile(normalized.seriesData || normalized.titleData || normalized, activeSubAccount)) {
        setError('This title is blocked for Kids profiles.');
        setLoading(false);
        return;
      }
      // MyAnimeList/Jikan is the source of episode thumbnails. Keep Ani.pm as
      // the source of playable episodes, then enrich those same episodes by number.
      if (normalized.malId && normalized.episodeList.length) {
        try {
          const thumbnails = await fetchEpisodeThumbnails(normalized.malId);
          if (!cancelled && Object.keys(thumbnails).length) {
            const enrich = source => source ? {
              ...source,
              episodeList: (source.episodeList || []).map(ep => ({
                ...ep,
                image: thumbnails[Number(ep?.number)] || ep?.image,
                thumbnail: thumbnails[Number(ep?.number)] || ep?.thumbnail,
              })),
            } : source;
            setTitleData(enrich(title));
            setSeriesData(enrich(series));
          } else {
            setTitleData(title);
            setSeriesData(series);
          }
        } catch (thumbnailError) {
          console.warn('[AnimeVault] MyAnimeList episode thumbnails unavailable:', thumbnailError?.message || thumbnailError);
          setTitleData(title);
          setSeriesData(series);
        }
      } else {
        setTitleData(title);
        setSeriesData(series);
      }
      setSelectedEpisode(null);
      setLoading(false);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
    void load();
    return () => { cancelled = true; };
  }, [id, activeSubAccount]);

  const anime = useMemo(() => normalizeAnime(titleData, seriesData, id), [titleData, seriesData, id]);
  const firstPlayableEpisode = useMemo(
    () => anime.episodeList.find(ep => ep?.available?.sub || ep?.available?.dub) || anime.episodeList[0],
    [anime.episodeList]
  );
  const currentEpisode = selectedEpisode || firstPlayableEpisode;
  const currentLang = currentEpisode?.available?.sub ? 'sub' : 'dub';
  const watchPath = currentEpisode
    ? `/anime/${encodeURIComponent(id)}/watch?episode=${encodeURIComponent(currentEpisode.number)}&lang=${currentLang}`
    : null;
  const liked = isLiked?.(anime.id);

  const relatedItems = anime.related.map(item => item?.mediaRecommendation || item?.media || item).filter(Boolean).slice(0, 12);

  const watch = () => {
    if (watchPath) navigate(watchPath);
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: anime.title, url });
      else {
        await navigator.clipboard?.writeText(url);
      }
    } catch {}
  };

  const toggleFavorite = () => {
    if (!user) return;
    toggleLike?.({
      id: anime.id,
      type: 'anime',
      title: anime.title,
      image: anime.poster,
    });
  };

  if (loading) {
    return <section className="anime-details-page anime-details-loading"><div className="details-loading-hero"><div className="details-skeleton poster" /><div className="details-skeleton-content"><div className="details-skeleton title" /><div className="details-skeleton meta" /><div className="details-skeleton text" /><div className="details-skeleton text short" /></div></div></section>;
  }

  if (error) {
    return (
      <section className="anime-details-state">
        <div className="anime-details-state-card">
          <span className="details-kicker">ANIME</span>
          <h1>{error}</h1>
          <p>The title or episode service may be temporarily unavailable.</p>
          <button type="button" className="details-primary-btn" onClick={() => window.location.reload()}>Try again</button>
          <button type="button" className="details-ghost-btn" onClick={() => navigate('/anime')}><ArrowLeft size={15} /> Back</button>
        </div>
      </section>
    );
  }

  const score = formatScore(anime.score);
  const heroBackground = anime.banner || anime.poster;
  const poster = anime.poster || heroBackground;

  return (
    <section className="anime-details-page">
      <div className="details-hero">
        {heroBackground && <img className="details-hero-image" src={heroBackground} alt="" aria-hidden="true" />}
        <div className="details-hero-vignette" />
        <div className="details-hero-fade" />
        <div className="details-hero-inner">
          <Link to="/anime" className="details-back" aria-label="Back to anime"><ArrowLeft size={17} /></Link>

          <div className="details-hero-grid">
            <div className="details-poster-column">
              <div className="details-poster">{poster && <img src={poster} alt={anime.title} />}</div>
              <div className="details-side-info">
                <InfoRow label="Format" value={anime.type} />
                <InfoRow label="Episodes" value={anime.episodesCount || anime.episodeList.length} />
                <InfoRow label="Duration" value={anime.duration || '—'} />
                <InfoRow label="Aired" value={anime.aired || anime.year || '—'} />
                <InfoRow label="Score" value={score ? <><Star size={12} fill="currentColor" /> {score}</> : '—'} accent />
                {anime.views && <InfoRow label="Views" value={anime.views} />}
                <InfoRow label="Studio" value={anime.studio || '—'} />
                <InfoRow label="Season" value={anime.season || '—'} />
                <InfoRow label="Status" value={anime.status || '—'} />
                <InfoRow label="Audio" value={`${anime.episodeList.some(ep => ep?.available?.sub) ? 'Sub' : ''}${anime.episodeList.some(ep => ep?.available?.sub) && anime.episodeList.some(ep => ep?.available?.dub) ? ' / ' : ''}${anime.episodeList.some(ep => ep?.available?.dub) ? 'Dub' : ''}` || '—'} />
                <InfoRow label="Rated" value={anime.rating || '—'} />
              </div>
            </div>

            <div className="details-main">
              <div className="details-title-block">
                <h1>{anime.title}</h1>
                {anime.nativeTitle && anime.nativeTitle !== anime.title && <div className="details-native">{anime.nativeTitle}</div>}
                <div className="details-meta-row">
                  {score && <span className="score-pill"><Star size={13} fill="currentColor" /> {score}</span>}
                  {anime.year && <span>{anime.year}</span>}
                  {anime.episodesCount && <span>{anime.episodesCount} Episodes</span>}
                  {anime.type && <span>{anime.type}</span>}
                  {anime.genres.slice(0, 4).map(genre => <span key={genre} className="details-genre">{genre}</span>)}
                </div>
                <p className={`details-synopsis ${overviewOpen ? 'expanded' : ''}`}>
                  {anime.synopsis || 'No synopsis available for this title.'}
                </p>
                {anime.synopsis.length > 190 && (
                  <button className="details-more" type="button" onClick={() => setOverviewOpen(v => !v)}>{overviewOpen ? 'Less' : 'More'}</button>
                )}
              </div>

              <div className="details-action-row">
                <button type="button" className="details-primary-btn" onClick={watch}><Play size={17} fill="currentColor" /> Watch now</button>
                <button type="button" className={`details-round-btn ${liked ? 'active' : ''}`} onClick={toggleFavorite} aria-label="Add to library"><Plus size={20} /></button>
                <button type="button" className="details-round-btn" aria-label="Remind me"><Bell size={18} /></button>
                <button type="button" className="details-round-btn" onClick={share} aria-label="Share"><Share2 size={18} /></button>
                {anime.anilistId && <a className="details-round-btn external-brand" href={`https://anilist.co/anime/${encodeURIComponent(anime.anilistId)}`} target="_blank" rel="noreferrer" aria-label="AniList">A.</a>}
                {anime.malId && <a className="details-round-btn external-brand" href={`https://myanimelist.net/anime/${encodeURIComponent(anime.malId)}`} target="_blank" rel="noreferrer" aria-label="MyAnimeList">MAL</a>}
                <button type="button" className={`details-round-btn ${liked ? 'active' : ''}`} onClick={toggleFavorite} aria-label="Favorite"><Heart size={17} fill={liked ? 'currentColor' : 'none'} /></button>
              </div>

              <nav className="details-tabs" aria-label="Anime details sections">
                {[
                  ['episodes', <><List size={15} /> Episodes <small>{anime.episodeList.length}</small></>],
                  ['related', <><Sparkles size={15} /> Related <small>{relatedItems.length}</small></>],
                  ['manga', <><BookOpen size={15} /> Manga</>],
                  ['more', <><Sparkles size={15} /> More like this</>],
                  ['comments', <><MessageSquare size={15} /> Comments</>],
                  ['downloads', <><Download size={15} /> Downloads</>],
                ].map(([key, label]) => (
                  <button key={key} type="button" className={activeTab === key ? 'active' : ''} onClick={() => setActiveTab(key)}>{label}</button>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </div>

      <div className="details-body">
        {activeTab === 'episodes' && (
          <AnimeEpisodeExplorer
            episodes={anime.episodeList}
            activeEpisode={currentEpisode?.number}
            fallbackImage={poster}
            onSelect={episode => { setSelectedEpisode(episode); navigate(`/anime/${encodeURIComponent(id)}/watch?episode=${encodeURIComponent(episode.number)}&lang=${episode?.available?.sub ? 'sub' : 'dub'}`); }}
          />
        )}

        {activeTab === 'related' && <RelatedGrid items={relatedItems} />}
        {activeTab === 'more' && <RelatedGrid items={relatedItems.slice(0, 6)} />}
        {activeTab === 'manga' && <EmptyTab icon={<BookOpen size={20} />} title="Manga" text="Manga information is not available for this title yet." />}
        {activeTab === 'downloads' && <EmptyTab icon={<Download size={20} />} title="Downloads" text="Download options are provided from the watch experience when available." />}
        {activeTab === 'comments' && <CommentsSection mediaId={anime.id} />}
      </div>
    </section>
  );
}

function InfoRow({ label, value, accent = false }) {
  return <div className="details-info-row"><span>{label}</span><strong className={accent ? 'accent' : ''}>{value}</strong></div>;
}

function RelatedGrid({ items }) {
  if (!items.length) return <EmptyTab icon={<Sparkles size={20} />} title="Related" text="No related titles were returned for this series." />;
  return (
    <div className="details-related-grid">
      {items.map((item, index) => {
        const title = textValue(item?.title) || item?.name || 'Related anime';
        const image = firstValue(item?.poster, item?.image, item?.coverImage?.large, item?.coverImage, item?.thumbnail);
        const itemId = firstValue(item?.anilistId, item?.id);
        return (
          <Link key={itemId || index} to={itemId ? `/anime/${itemId}` : '#'} className="details-related-card">
            {image && <img src={image} alt="" />}
            <span><b>{title}</b><small>{firstValue(item?.type, item?.format, item?.status) || 'Anime'}</small></span>
          </Link>
        );
      })}
    </div>
  );
}

function EmptyTab({ icon, title, text }) {
  return <div className="details-empty-tab">{icon}<h3>{title}</h3><p>{text}</p></div>;
}
