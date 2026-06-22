import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, CalendarClock, Check, Heart, Info, ListVideo, Play, Star } from 'lucide-react';
import { useUser } from '../../api/UserContext';
import { fetchAnimeDetail, getImage, getTitle, stripHtml } from '../api/anilist';
import { addContinueWatching, isFavorite, toggleFavorite } from '../api/storage';
import { fetchStreamingEpisodes, fetchStreamingSources, findBestStreamingMatch, getAnimePlayUrl, probeMirrors } from '../api/streaming';

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

export default function AnimeDetailsPage({ params, goBack }) {
  const { user, updateContinueWatching, addToHistory, toggleLike, isLiked } = useUser();
  const [media, setMedia] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [currentEpisode, setCurrentEpisode] = useState(null);
  const [streamingInfo, setStreamingInfo] = useState({ id: null, provider: 'gogoanime' });
  const [language, setLanguage] = useState('sub');
  const [activeTab, setActiveTab] = useState('episodes');
  const [showPlayer, setShowPlayer] = useState(false);
  const [playerLoading, setPlayerLoading] = useState(false);
  const [playerStatus, setPlayerStatus] = useState('');
  const [favorite, setFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const enrichedRef = useRef(false);

  const id = params?.id;

  useEffect(() => { probeMirrors().catch(() => {}); }, []);

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
        enrichEpisodes(nextMedia).catch(() => {});
      } catch (err) {
        setError(err.message || 'Failed to load anime.');
        setLoading(false);
      }
    }

    load();
  }, [id, isLiked]);

  async function enrichEpisodes(nextMedia) {
    if (enrichedRef.current) return;
    enrichedRef.current = true;
    const match = await findBestStreamingMatch(getTitle(nextMedia), nextMedia.seasonYear, nextMedia.title?.english);
    if (!match) return;
    setStreamingInfo(match);
    const richEpisodes = await fetchStreamingEpisodes(match.id, match.provider);
    if (!richEpisodes?.length) return;
    setEpisodes(richEpisodes.map((episode, index) => ({
      id: episode.id || `ep-${nextMedia.id}-${index + 1}`,
      number: episode.number || index + 1,
      title: episode.title || `Episode ${index + 1}`,
      image: episode.image || null,
      isFiller: episode.isFiller || false,
    })));
  }

  const handleWatch = useCallback((episode) => {
    if (!episode || !media) return;
    setCurrentEpisode(episode);
    setShowPlayer(true);
    setPlayerLoading(true);
    setPlayerStatus('Preparing stream');

    addContinueWatching({ id: media.id, title: getTitle(media), image: getImage(media), episode: episode.number });
    if (user) {
      updateContinueWatching(media.id, 'anime', getTitle(media), getImage(media), 1, episode.number, 0, media.duration || 0);
      addToHistory(media.id, 'anime', getTitle(media), getImage(media));
    }

    if (!streamingInfo.id) {
      setTimeout(() => {
        setPlayerLoading(false);
        setPlayerStatus('');
      }, 800);
      return;
    }

    fetchStreamingSources(episode.id, streamingInfo.provider)
      .then(sources => setPlayerStatus(sources?.length ? 'Stream ready' : 'Using embedded player'))
      .catch(() => setPlayerStatus('Using embedded player'))
      .finally(() => setPlayerLoading(false));
  }, [addToHistory, media, streamingInfo, updateContinueWatching, user]);

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
    const embedUrl = getAnimePlayUrl(id, currentEpisode.number, language);
    return (
      <div className="player-screen">
        <div className="player-topbar">
          <button className="player-icon-btn" onClick={() => setShowPlayer(false)} aria-label="Back">
            <ArrowLeft size={20} />
          </button>
          <div className="player-title">
            <strong>{title}</strong>
            <span>Episode {currentEpisode.number} · {language.toUpperCase()}</span>
          </div>
          <div className="player-language">
            {LANGUAGES.map(item => (
              <button key={item.id} className={language === item.id ? 'active' : ''} onClick={() => setLanguage(item.id)}>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="player-frame-wrap">
          {playerLoading && (
            <div className="player-loading">
              <div className="spinner" />
              <span>{playerStatus || 'Loading'}</span>
            </div>
          )}
          <iframe
            key={`${currentEpisode.number}-${language}`}
            src={embedUrl}
            className="player-frame"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            title={`${title} Episode ${currentEpisode.number}`}
            onLoad={() => {
              setPlayerLoading(false);
              setPlayerStatus('');
            }}
          />
        </div>

        <div className="player-episode-rail">
          {episodes.slice(0, 100).map(episode => (
            <button
              key={`${episode.id}-${episode.number}`}
              className={episode.number === currentEpisode.number ? 'active' : ''}
              onClick={() => handleWatch(episode)}
            >
              {episode.number}
            </button>
          ))}
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
                  <button key={rec.id} className="anime-card" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
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
