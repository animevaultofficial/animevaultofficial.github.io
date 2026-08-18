import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, CalendarClock, Check, Heart, Info, ListVideo, Play, Star, SkipBack, SkipForward, Shield } from 'lucide-react';
import { useUser } from '../../api/UserContext';
import { fetchAnimeDetail, getImage, getTitle, stripHtml } from '../api/anilist';
import { addContinueWatching, isFavorite, toggleFavorite } from '../api/storage';
import VideoPlayer from '../../components/VideoPlayer';
import { buildAnimeStreamUrlFromAniList } from '../../utils/animeStreamingServer';

const LANGUAGES = [
  { id: 'sub', label: 'Sub' },
  { id: 'dub', label: 'Dub' },
];

function buildFallbackEpisodes(media) {
  let count = media?.episodes;
  if (media?.nextAiringEpisode?.episode) count = media.nextAiringEpisode.episode - 1;
  if (!count || count <= 0) count = media?.format === 'MOVIE' ? 1 : 12;
  return Array.from({ length: Math.min(count, 200) }, (_, index) => ({
    id: `ep-${media.id}-${index + 1}`,
    number: index + 1,
    title: `Episode ${index + 1}`,
  }));
}

function formatAiring(nextAiringEpisode) {
  if (!nextAiringEpisode?.timeUntilAiring) return null;
  const total = Math.max(0, nextAiringEpisode.timeUntilAiring);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  return `Episode ${nextAiringEpisode.episode} airs in ${days}d ${hours}h`;
}

export default function AnimeDetailsPage({ params, goBack, navigate }) {
  const { user, updateContinueWatching, addToHistory, toggleLike, isLiked, setAuthTab } = useUser();
  const [media, setMedia] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [currentEpisode, setCurrentEpisode] = useState(null);
  const [language, setLanguage] = useState('sub');
  const [activeTab, setActiveTab] = useState('episodes');
  const [showPlayer, setShowPlayer] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFs, setIsFs] = useState(false);
  const playerWrapperRef = useRef(null);

  // Keep ref in sync with state
  const id = params?.id;

  const toggleFs = () => {
    if (!playerWrapperRef.current) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else playerWrapperRef.current.requestFullscreen();
  };

  useEffect(() => {
    const handler = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  useEffect(() => {
    if (!id) return;
    enrichedRef.current = false;
    setLoading(true);
    setError('');
    setMedia(null);
    setEpisodes([]);
    setCurrentEpisode(null);
    setLanguage('sub');

    async function load() {
      try {
        const data = await fetchAnimeDetail(id);
        const nextMedia = data?.Media;
        if (!nextMedia) throw new Error('Anime not found.');

        const fallbackEpisodes = buildFallbackEpisodes(nextMedia);
        setMedia(nextMedia);
        setEpisodes(fallbackEpisodes);
        setCurrentEpisode(fallbackEpisodes[0] || null);
        setFavorite(isLiked(nextMedia.id, 'anime') || isFavorite(nextMedia.id));
        setLoading(false);
      } catch (err) {
        setError(err.message || 'Failed to load anime.');
        setLoading(false);
      }
    }

    load();
  }, [id, isLiked]);

  const handleWatch = useCallback((episode) => {
    if (!episode || !media) return;
    if (!user) {
      setAuthTab('login');
      navigate('profile');
      return;
    }
    const currentMedia = media;
    setCurrentEpisode(episode);
    setShowPlayer(true);

    addContinueWatching({ id: currentMedia.id, title: getTitle(currentMedia), image: getImage(currentMedia), episode: episode.number });
    updateContinueWatching(currentMedia.id, 'anime', getTitle(currentMedia), getImage(currentMedia), 1, episode.number, 0, currentMedia.duration || 0);
    addToHistory(currentMedia.id, 'anime', getTitle(currentMedia), getImage(currentMedia));
  }, [addToHistory, media, navigate, setAuthTab, updateContinueWatching, user]);

  const handleFavorite = useCallback(async () => {
    if (!media) return;
    const next = toggleFavorite({ id: media.id, title: getTitle(media), image: getImage(media) });
    setFavorite(next.some(item => String(item.id) === String(media.id)));
    if (user) {
      const result = await toggleLike(media.id, 'anime', getTitle(media), getImage(media));
      if (!result?.promptLogin) setFavorite(result?.action === 'liked' || isLiked(media.id, 'anime'));
    }
  }, [isLiked, media, toggleLike, user]);

  if (loading) {
    return (
      <div className="mobile-content">
        <div className="detail-skeleton hero-skeleton" />
        <div className="detail-skeleton title-skeleton" />
        <div className="detail-skeleton copy-skeleton" />
      </div>
    );
  }

  if (error || !media) {
    return (
      <div className="mobile-content">
        <div className="empty">
          <Info size={38} />
          <p>{error || 'Failed to load anime.'}</p>
          <button className="btn-primary wide" onClick={goBack}>Go Back</button>
        </div>
      </div>
    );
  }

  const title = getTitle(media);
  const poster = getImage(media, 'large');
  const backdrop = media.bannerImage || poster;
  const airingText = formatAiring(media.nextAiringEpisode);
  const currentNumber = currentEpisode?.number || 1;

  if (showPlayer && currentEpisode) {
    const goPrev = () => {
      const idx = episodes.findIndex(e => e.number === currentEpisode.number);
      if (idx > 0) handleWatch(episodes[idx - 1]);
    };
    const goNext = () => {
      const idx = episodes.findIndex(e => e.number === currentEpisode.number);
      if (idx < episodes.length - 1) handleWatch(episodes[idx + 1]);
    };

    const playbackSources = currentEpisode ? [{
      url: buildAnimeStreamUrlFromAniList(media.id, currentEpisode.number, language),
      type: 'hls',
      serverName: 'MegaFlix',
      priority: 1000,
    }] : [];

    return (
      <div
        ref={playerWrapperRef}
        className="player-screen player-screen-v2"
        style={isFs ? { padding: 0 } : {}}
      >
        {/* Top Bar */}
        <div className="player-topbar player-topbar-v2">
          <button className="player-icon-btn" onClick={() => setShowPlayer(false)} aria-label="Back">
            <ArrowLeft size={20} />
          </button>
          <div className="player-title">
            <strong>{title}</strong>
            <span>Ep {currentEpisode.number} · {language.toUpperCase()}</span>
          </div>
          <div className="player-language">
            <button onClick={() => setLanguage(language === 'sub' ? 'dub' : 'sub')} className="active">
              {language.toUpperCase()}
            </button>
          </div>
        </div>

        {/* Player Container */}
        <div style={{ flex: 1, position: 'relative', background: '#000', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <VideoPlayer
            sources={playbackSources}
            poster={poster}
            title={`${title} · Ep ${currentEpisode.number}`}
            isZen={false}
            onNextEpisode={goNext}
            onPrevEpisode={goPrev}
          />
        </div>

        {/* Episode Rail with navigation arrows (horizontal) */}
        <div className="player-episode-rail">
          <button className="ply-rail-nav" onClick={goPrev} disabled={currentEpisode.number <= 1}>
            <SkipBack size={16} />
          </button>
          <div className="ply-rail-scroll">
            {episodes.slice(0, 200).map(episode => (
              <button
                key={`${episode.id}-${episode.number}`}
                className={episode.number === currentEpisode.number ? 'active' : ''}
                onClick={() => handleWatch(episode)}
              >
                {episode.number}
              </button>
            ))}
          </div>
          <button className="ply-rail-nav" onClick={goNext} disabled={currentEpisode.number >= episodes.length}>
            <SkipForward size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="detail-page">
      <button className="detail-back" onClick={goBack}><ArrowLeft size={18} /> Back</button>
      <section className="detail-hero" style={{ backgroundImage: `linear-gradient(180deg, rgba(3,15,22,.18), rgba(3,15,22,.96)), url(${backdrop})` }}>
        <div className="detail-poster">
          {poster ? <img src={poster} alt={title} /> : <span>AV</span>}
        </div>
        <div className="detail-copy">
          <h1>{title}</h1>
          {media.title?.native && <p className="native-title">{media.title.native}</p>}
          <div className="detail-meta">
            <span><Star size={13} /> {media.averageScore ? `${media.averageScore}%` : 'N/A'}</span>
            {media.format && <span>{media.format}</span>}
            {media.seasonYear && <span>{media.seasonYear}</span>}
            {media.episodes && <span>{media.episodes} eps</span>}
          </div>
        </div>
      </section>

      <div className="mobile-content detail-content">
        {airingText && <div className="airing-banner"><CalendarClock size={16} /> {airingText}</div>}

        <div className="detail-actions">
          <button className="btn-primary" onClick={() => handleWatch(currentEpisode)}>
            <Play size={17} fill="currentColor" /> Watch Ep {currentNumber}
          </button>
          <button className={`icon-action ${favorite ? 'active' : ''}`} onClick={handleFavorite} aria-label="Favorite">
            <Heart size={19} fill={favorite ? 'currentColor' : 'none'} />
          </button>
        </div>

        <div className="language-row">
          {LANGUAGES.map(item => (
            <button key={item.id} className={language === item.id ? 'active' : ''} onClick={() => setLanguage(item.id)}>
              {item.label}
            </button>
          ))}
        </div>

        {!!media.genres?.length && (
          <div className="tag-row">
            {media.genres.slice(0, 6).map(genre => <span key={genre}>{genre}</span>)}
          </div>
        )}

        <p className="synopsis">{stripHtml(media.description || 'No description available.')}</p>

        <div className="tab-bar">
          <button className={`tab-item ${activeTab === 'episodes' ? 'active' : ''}`} onClick={() => setActiveTab('episodes')}>
            <ListVideo size={14} /> Episodes
          </button>
          <button className={`tab-item ${activeTab === 'info' ? 'active' : ''}`} onClick={() => setActiveTab('info')}>
            <Info size={14} /> Info
          </button>
        </div>

        {activeTab === 'episodes' ? (
          <div className="episode-grid">
            {episodes.map(episode => (
              <button
                key={`${episode.id}-${episode.number}`}
                className={episode.number === currentNumber ? 'active' : ''}
                onClick={() => handleWatch(episode)}
              >
                <span>{episode.number}</span>
                {episode.isFiller && <small>Filler</small>}
              </button>
            ))}
          </div>
        ) : (
          <div className="info-list">
            {media.studios?.nodes?.length > 0 && <InfoRow label="Studio" value={media.studios.nodes.map(studio => studio.name).join(', ')} />}
            {media.status && <InfoRow label="Status" value={media.status.replaceAll('_', ' ')} />}
            {media.duration && <InfoRow label="Duration" value={`${media.duration} min per episode`} />}
            {media.season && <InfoRow label="Season" value={media.season} />}
            {media.externalLinks?.find(link => link.site === 'MyAnimeList') && (
              <a className="external-link" href={media.externalLinks.find(link => link.site === 'MyAnimeList').url} target="_blank" rel="noopener noreferrer">
                <Check size={15} /> View on MyAnimeList
              </a>
            )}
          </div>
        )}

        {!!media.recommendations?.nodes?.length && (
          <section className="section">
            <div className="section-header"><span className="section-title">Recommendations</span></div>
            <div className="horizontal-scroll">
              {media.recommendations.nodes.map(node => {
                const rec = node.mediaRecommendation;
                if (!rec) return null;
                return (
                  <button key={rec.id} className="anime-card" onClick={() => navigate('anime-detail', { id: rec.id })}>
                    <img src={getImage(rec) || '/logo.png'} alt={getTitle(rec)} className="anime-card-image" />
                    <span className="anime-card-title">{getTitle(rec)}</span>
                    <span className="anime-card-sub">{rec.averageScore ? `${rec.averageScore}%` : 'Recommended'}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="info-card info-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
