import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Download,
  ExternalLink, Heart, Info, Play, Server, Share2, Star, Tv, Users
} from 'lucide-react';
import { useUser } from '../../api/UserContext';
import { fetchAnimeDetail, getImage, getTitle, stripHtml } from '../api/anilist';
import { addContinueWatching, isFavorite, toggleFavorite } from '../api/storage';
import { getMobileStreamSources } from '../api/streaming';
import { saveDownload } from '../api/downloads';

const LANGUAGES = [
  { id: 'sub', label: 'SUB' },
  { id: 'dub', label: 'DUB' },
];

const SERVERS = [
  { id: 'animevault', label: 'AnimeVault', hint: 'Recommended' },
  { id: 'anilist', label: 'AniList', hint: 'Fallback' },
  { id: 'mal', label: 'MAL', hint: 'Fallback' },
];

const EPISODES_PER_PAGE = 24;

function buildEpisodes(media) {
  let count = Number(media?.episodes);
  if (media?.nextAiringEpisode?.episode) count = Number(media.nextAiringEpisode.episode) - 1;
  if (!count || count <= 0) count = media?.format === 'MOVIE' ? 1 : 12;
  return Array.from({ length: Math.min(Math.max(count, 0), 500) }, (_, index) => ({
    id: `ep-${media.id}-${index + 1}`,
    number: index + 1,
    title: `Episode ${index + 1}`,
  }));
}

function airingText(episode) {
  if (!episode?.timeUntilAiring) return null;
  const seconds = Math.max(0, Number(episode.timeUntilAiring));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `Episode ${episode.episode} airs in ${days}d ${hours}h ${minutes}m`;
}

function formatDuration(minutes) {
  if (!minutes) return '—';
  const value = Number(minutes);
  if (value < 60) return `${value} min`;
  return `${Math.floor(value / 60)}h ${value % 60}m`;
}

export default function AnimeDetailsPage({ params, goBack, navigate }) {
  const { user, updateContinueWatching, addToHistory, toggleLike, isLiked, setAuthTab } = useUser();
  const id = params?.id;
  const [media, setMedia] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [currentEpisode, setCurrentEpisode] = useState(null);
  const [language, setLanguage] = useState('sub');
  const [server, setServer] = useState('animevault');
  const [favorite, setFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const [episodePage, setEpisodePage] = useState(0);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [downloadMessage, setDownloadMessage] = useState('');
  const [shareMessage, setShareMessage] = useState('');

  const loadDetails = useCallback(async () => {
    if (!id) {
      setLoading(false);
      setError('Missing anime ID.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await fetchAnimeDetail(id);
      const nextMedia = data?.Media;
      if (!nextMedia) throw new Error('Anime not found.');
      const nextEpisodes = buildEpisodes(nextMedia);
      setMedia(nextMedia);
      setEpisodes(nextEpisodes);
      setCurrentEpisode(nextEpisodes[0] || null);
      setEpisodePage(0);
      setFavorite(isFavorite(nextMedia.id) || isLiked(nextMedia.id, 'anime'));
    } catch (err) {
      setError(err?.message || 'Failed to load anime details.');
    } finally {
      setLoading(false);
    }
  }, [id, isLiked]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      await loadDetails();
    };
    run();
    window.scrollTo({ top: 0, behavior: 'instant' });
    return () => { cancelled = true; };
  }, [loadDetails, retryKey]);

  const title = getTitle(media);
  const poster = getImage(media, 'large');
  const backdrop = media?.bannerImage || poster;
  const synopsis = stripHtml(media?.description || '') || 'No synopsis available for this title.';
  const currentNumber = currentEpisode?.number || 1;
  const totalPages = Math.max(1, Math.ceil(episodes.length / EPISODES_PER_PAGE));
  const visibleEpisodes = useMemo(
    () => episodes.slice(episodePage * EPISODES_PER_PAGE, (episodePage + 1) * EPISODES_PER_PAGE),
    [episodes, episodePage]
  );
  const score = media?.averageScore ? `${media.averageScore}%` : 'N/A';
  const airing = airingText(media?.nextAiringEpisode);
  const studio = media?.studios?.nodes?.[0]?.name || 'Unknown';

  useEffect(() => {
    if (!user || !media) return;
    addToHistory(media.id, 'anime', title, poster)?.catch?.(() => {});
  }, [addToHistory, media, poster, title, user]);

  const openPlayer = useCallback((episode = currentEpisode) => {
    if (!episode || !media) return;
    if (!user) {
      setAuthTab('login');
      navigate('profile');
      return;
    }
    addContinueWatching({
      id: media.id,
      title,
      image: poster,
      episode: episode.number,
    });
    updateContinueWatching(media.id, 'anime', title, poster, 1, episode.number, 0, media.duration || 0);
    addToHistory(media.id, 'anime', title, poster)?.catch?.(() => {});
    navigate(`/watch/anime/${encodeURIComponent(media.id)}?episode=${episode.number}&lang=${language}&server=${server}`);
  }, [addToHistory, currentEpisode, language, media, navigate, poster, server, setAuthTab, title, updateContinueWatching, user]);

  const handleFavorite = useCallback(async () => {
    if (!media) return;
    const next = toggleFavorite({ id: media.id, title, image: poster });
    setFavorite(next.some(item => String(item.id) === String(media.id)));
    if (!user) return;
    const result = await toggleLike(media.id, 'anime', title, poster);
    if (!result?.promptLogin) {
      setFavorite(result?.action === 'liked' || isLiked(media.id, 'anime'));
    }
  }, [isLiked, media, poster, title, toggleLike, user]);

  const handleShare = useCallback(async () => {
    if (!media) return;
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, text: `Watch ${title} on AnimeVault`, url });
        setShareMessage('Shared');
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setShareMessage('Link copied');
      } else {
        setShareMessage('Copy the page URL to share');
      }
    } catch (err) {
      if (err?.name !== 'AbortError') setShareMessage('Could not share');
    }
    window.setTimeout(() => setShareMessage(''), 2200);
  }, [media, title]);

  const handleDownload = useCallback(async (episode = currentEpisode) => {
    if (!episode || !media) return;
    if (!user) {
      setAuthTab('login');
      navigate('profile');
      return;
    }
    setDownloadBusy(true);
    setDownloadMessage('Finding a direct MP4…');
    try {
      const sources = await getMobileStreamSources(media.id, episode.number, language);
      const source = sources.find(item => item.type === 'mp4');
      if (!source) throw new Error('No direct MP4 is available for this episode yet.');
      await saveDownload({
        id: `${media.id}-${episode.number}-${language}`,
        title,
        image: poster,
        episode: episode.number,
        url: source.url,
        type: 'mp4',
        onProgress: progress => setDownloadMessage(`Downloading… ${progress}%`),
      });
      setDownloadMessage('Saved for offline playback ✓');
    } catch (err) {
      setDownloadMessage(err?.message || 'Download failed.');
    } finally {
      setDownloadBusy(false);
    }
  }, [currentEpisode, language, media, navigate, poster, setAuthTab, title, user]);

  const chooseEpisode = episode => {
    setCurrentEpisode(episode);
    openPlayer(episode);
  };

  if (loading) {
    return (
      <div className="av-detail-page av-detail-loading" aria-busy="true">
        <div className="av-detail-skeleton av-detail-skeleton-hero" />
        <div className="av-detail-loading-body">
          <div className="av-detail-skeleton av-detail-skeleton-title" />
          <div className="av-detail-skeleton av-detail-skeleton-line" />
          <div className="av-detail-skeleton av-detail-skeleton-line short" />
          <div className="av-detail-skeleton av-detail-skeleton-actions" />
          <div className="av-detail-skeleton av-detail-skeleton-grid" />
        </div>
      </div>
    );
  }

  if (error || !media) {
    return (
      <div className="av-detail-page av-detail-state">
        <div className="av-detail-state-icon"><Info size={28} /></div>
        <span className="av-detail-eyebrow">ANIMEVAULT</span>
        <h1>{error || 'Anime not found'}</h1>
        <p>We couldn't load this title right now. The content service may be temporarily unavailable.</p>
        <div className="av-detail-state-actions">
          <button className="av-detail-primary" onClick={() => setRetryKey(value => value + 1)}><Play size={17} /> Try Again</button>
          <button className="av-detail-secondary" onClick={goBack}><ArrowLeft size={17} /> Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="av-detail-page">
      <section className="av-detail-hero">
        <div className="av-detail-backdrop" style={{ backgroundImage: backdrop ? `url(${backdrop})` : undefined }} />
        <div className="av-detail-hero-scrim" />
        <button className="av-detail-back" onClick={goBack} aria-label="Go back">
          <ArrowLeft size={19} />
          <span>Back</span>
        </button>
        <div className="av-detail-hero-content">
          <div className="av-detail-poster-wrap">
            {poster ? <img className="av-detail-poster" src={poster} alt={title} /> : <div className="av-detail-poster av-detail-poster-fallback">AV</div>}
            <span className="av-detail-poster-badge">ANIME</span>
          </div>
          <div className="av-detail-hero-info">
            <span className="av-detail-eyebrow">ANIMEVAULT ORIGINAL VIEW</span>
            <h1>{title}</h1>
            {media.title?.native && media.title.native !== title && <p className="av-detail-native">{media.title.native}</p>}
            <div className="av-detail-stats" aria-label="Anime metadata">
              <span className="score"><Star size={14} fill="currentColor" /> {score}</span>
              {media.seasonYear && <span><CalendarDays size={14} /> {media.seasonYear}</span>}
              {media.format && <span><Tv size={14} /> {media.format}</span>}
              {(media.episodes || episodes.length) > 0 && <span><Users size={14} /> {media.episodes || episodes.length} eps</span>}
              {media.duration && <span><Clock3 size={14} /> {formatDuration(media.duration)}</span>}
            </div>
          </div>
        </div>
      </section>

      <main className="av-detail-content">
        {airing && <div className="av-detail-airing"><CalendarDays size={17} /><span>{airing}</span></div>}

        <section className="av-detail-primary-actions">
          <button className="av-detail-watch" onClick={() => openPlayer(currentEpisode)}>
            <Play size={18} fill="currentColor" />
            <span>Watch Now</span>
          </button>
          <button className={`av-detail-action ${favorite ? 'is-active' : ''}`} onClick={handleFavorite} aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}>
            <Heart size={19} fill={favorite ? 'currentColor' : 'none'} />
          </button>
          <button className="av-detail-action" onClick={handleShare} aria-label="Share anime">
            <Share2 size={19} />
          </button>
        </section>
        {shareMessage && <div className="av-detail-toast" role="status">{shareMessage}</div>}

        <section className="av-detail-control-card">
          <div className="av-detail-control-head">
            <div>
              <span className="av-detail-section-label">PLAYBACK</span>
              <h2>Choose how to watch</h2>
            </div>
            <Server size={19} />
          </div>
          <div className="av-detail-control-group">
            <span className="av-detail-control-label">Audio & subtitles</span>
            <div className="av-detail-segmented">
              {LANGUAGES.map(item => (
                <button key={item.id} className={language === item.id ? 'is-active' : ''} onClick={() => setLanguage(item.id)}>{item.label}</button>
              ))}
            </div>
          </div>
          <div className="av-detail-control-group">
            <span className="av-detail-control-label">Server</span>
            <div className="av-detail-server-list">
              {SERVERS.map(item => (
                <button key={item.id} className={server === item.id ? 'is-active' : ''} onClick={() => setServer(item.id)}>
                  <span className="av-detail-server-dot" />
                  <span><strong>{item.label}</strong><small>{item.hint}</small></span>
                  {server === item.id && <Check size={17} />}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="av-detail-section">
          <div className="av-detail-section-heading">
            <div>
              <span className="av-detail-section-label">WATCH</span>
              <h2>Episodes</h2>
            </div>
            <span className="av-detail-episode-count">{episodes.length} total</span>
          </div>
          {episodes.length ? (
            <>
              <div className="av-detail-episode-grid">
                {visibleEpisodes.map(episode => (
                  <button key={episode.id} className={episode.number === currentNumber ? 'is-active' : ''} onClick={() => chooseEpisode(episode)}>
                    <span className="av-detail-episode-number">{String(episode.number).padStart(2, '0')}</span>
                    <span className="av-detail-episode-name">{episode.title}</span>
                    {episode.number === currentNumber ? <Check size={14} /> : <Play size={13} />}
                  </button>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="av-detail-pagination">
                  <button onClick={() => setEpisodePage(value => Math.max(0, value - 1))} disabled={episodePage === 0} aria-label="Previous episode page"><ChevronLeft size={18} /></button>
                  <span>Page <strong>{episodePage + 1}</strong> of <strong>{totalPages}</strong></span>
                  <button onClick={() => setEpisodePage(value => Math.min(totalPages - 1, value + 1))} disabled={episodePage >= totalPages - 1} aria-label="Next episode page"><ChevronRight size={18} /></button>
                </div>
              )}
            </>
          ) : (
            <div className="av-detail-empty"><Play size={22} /><p>No episodes are available yet.</p></div>
          )}
        </section>

        <section className="av-detail-section">
          <div className="av-detail-section-heading"><div><span className="av-detail-section-label">ABOUT</span><h2>Synopsis</h2></div></div>
          <div className="av-detail-synopsis"><p>{synopsis}</p></div>
        </section>

        {media.genres?.length > 0 && (
          <section className="av-detail-section">
            <div className="av-detail-section-heading"><div><span className="av-detail-section-label">EXPLORE</span><h2>Genres</h2></div></div>
            <div className="av-detail-genres">{media.genres.map(genre => <span key={genre}>{genre}</span>)}</div>
          </section>
        )}

        <section className="av-detail-info-card">
          <div className="av-detail-info-heading"><div><span className="av-detail-section-label">AT A GLANCE</span><h2>Information</h2></div><Info size={19} /></div>
          <div className="av-detail-info-grid">
            <div><span>Format</span><strong>{media.format || 'TV'}</strong></div>
            <div><span>Status</span><strong>{media.status || 'Unknown'}</strong></div>
            <div><span>Release</span><strong>{media.seasonYear || 'Unknown'}</strong></div>
            <div><span>Episodes</span><strong>{media.episodes || episodes.length || 'Unknown'}</strong></div>
            <div><span>Score</span><strong>{score}</strong></div>
            <div><span>Studio</span><strong>{studio}</strong></div>
            <div><span>Duration</span><strong>{formatDuration(media.duration)}</strong></div>
            <div><span>Source</span><strong>{media.source || 'Unknown'}</strong></div>
          </div>
        </section>

        <section className="av-detail-download-card">
          <div><span className="av-detail-section-label">OFFLINE</span><h2>Save an episode</h2><p>Direct MP4 downloads are available when the stream provider exposes one.</p></div>
          <button onClick={() => handleDownload(currentEpisode)} disabled={downloadBusy}><Download size={17} /> {downloadBusy ? 'Saving…' : `Download Ep ${currentNumber}`}</button>
        </section>
        {downloadMessage && <div className="av-detail-download-status" role="status">{downloadMessage}</div>}

        {media.externalLinks?.[0]?.url && (
          <a className="av-detail-external" href={media.externalLinks[0].url} target="_blank" rel="noreferrer">
            <ExternalLink size={16} /> View official / external information <ChevronRight size={16} />
          </a>
        )}
      </main>
    </div>
  );
}
