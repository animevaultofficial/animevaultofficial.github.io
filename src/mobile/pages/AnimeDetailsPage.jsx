import './styles/anime-details-reference.css';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarClock, Check, Download, Heart, Info, ListVideo, Play, Star, SkipBack, SkipForward } from 'lucide-react';
import AnimeEpisodeExplorer from '../../components/AnimeEpisodeExplorer';
import { useUser } from '../../api/UserContext';
import { isBlockedForProfile } from '../../utils/ageRating';
import { fetchAnimeDetail, getImage, getTitle, stripHtml } from '../api/anilist';
import { addContinueWatching, isFavorite, toggleFavorite } from '../api/storage';
import { getMobileStreamSources } from '../api/streaming';
import { saveDownload } from '../api/downloads';
import AndroidVideoPlayer from '../components/AndroidVideoPlayer';

const LANGUAGES = [{ id: 'sub', label: 'Sub' }, { id: 'dub', label: 'Dub' }];

function buildEpisodes(media) {
  let count = media?.episodes;
  if (media?.nextAiringEpisode?.episode) count = media.nextAiringEpisode.episode - 1;
  if (!count || count <= 0) count = media?.format === 'MOVIE' ? 1 : 12;
  return Array.from({ length: Math.min(count, 200) }, (_, index) => ({
    id: `ep-${media.id}-${index + 1}`,
    number: index + 1,
    title: `Episode ${index + 1}`,
    summary: media.description || '',
    image: getImage(media, 'large'),
  }));
}
function airingText(ep) {
  if (!ep?.timeUntilAiring) return null;
  const t = Math.max(0, ep.timeUntilAiring);
  return `Episode ${ep.episode} airs in ${Math.floor(t / 86400)}d ${Math.floor((t % 86400) / 3600)}h`;
}

export default function AnimeDetailsPage({ params, goBack, navigate }) {
  const { user, activeSubAccount, updateContinueWatching, addToHistory, toggleLike, isLiked, setAuthTab } = useUser();
  const [media, setMedia] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [currentEpisode, setCurrentEpisode] = useState(null);
  const [language, setLanguage] = useState('sub');
  const [showPlayer, setShowPlayer] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [streamSources, setStreamSources] = useState([]);
  const [streamLoading, setStreamLoading] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [downloadMessage, setDownloadMessage] = useState('');
  const id = params?.id;

  useEffect(() => {
    let cancelled = false;
    if (!id) {
      setLoading(false);
      setError('Missing anime ID.');
      return undefined;
    }

    setLoading(true);
    setError('');
    setMedia(null);

    (async () => {
      try {
        const data = await fetchAnimeDetail(id);
        const nextMedia = data?.Media;
        if (!nextMedia) throw new Error('Anime not found.');
        if (isBlockedForProfile(nextMedia, activeSubAccount)) throw new Error('This title is blocked for Kids profiles.');
        const eps = buildEpisodes(nextMedia);
        if (!cancelled) {
          setMedia(nextMedia);
          setEpisodes(eps);
          setCurrentEpisode(eps[0] || null);
          setFavorite(isFavorite(nextMedia.id) || isLiked(nextMedia.id, 'anime'));
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message || 'Failed to load anime.');
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [id, activeSubAccount, isLiked]);

  const loadStream = useCallback(async (episode, lang = language) => {
    if (!media || !episode) return;
    setStreamLoading(true);
    setStreamSources([]);
    try {
      setStreamSources(await getMobileStreamSources(media.id, episode.number, lang));
    } finally {
      setStreamLoading(false);
    }
  }, [language, media]);

  const handleWatch = useCallback(async (episode) => {
    if (!episode || !media) return;
    addContinueWatching({ id: media.id, title: getTitle(media), image: getImage(media), episode: episode.number });
    updateContinueWatching(media.id, 'anime', getTitle(media), getImage(media), 1, episode.number, 0, media.duration || 0);
    addToHistory({ id: String(media.id), type: 'anime', title: getTitle(media), image: getImage(media) });
    navigate(`/anime/${encodeURIComponent(media.id)}/watch?episode=${encodeURIComponent(episode.number)}&lang=${encodeURIComponent(language)}`);
  }, [addToHistory, language, media, navigate, updateContinueWatching]);

  const handleDownload = useCallback(async (episode) => {
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
      if (!source) throw new Error('This episode does not currently provide a direct MP4 download. HLS downloads are not saved offline yet.');
      await saveDownload({
        id: `${media.id}-${episode.number}-${language}`,
        title: getTitle(media),
        image: getImage(media),
        episode: episode.number,
        url: source.url,
        type: 'mp4',
        onProgress: progress => setDownloadMessage(`Downloading… ${progress}%`),
      });
      setDownloadMessage('Saved for offline playback ✓');
    } catch (e) {
      setDownloadMessage(e.message || 'Download failed.');
    } finally {
      setDownloadBusy(false);
    }
  }, [language, media, navigate, setAuthTab, user]);

  useEffect(() => {
    if (showPlayer && currentEpisode) loadStream(currentEpisode, language);
  }, [showPlayer, currentEpisode, language, loadStream]);

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
        <div className="detail-loading-status">Loading anime details…</div>
      </div>
    );
  }

  if (error || !media) {
    return (
      <div className="mobile-content">
        <div className="empty">
          <Info size={38} />
          <p>{error || 'Failed to load anime.'}</p>
          <button className="btn-primary wide" onClick={() => window.location.reload()}>Try Again</button>
          <button className="btn-secondary wide" onClick={goBack}>Go Back</button>
        </div>
      </div>
    );
  }

  const title = getTitle(media);
  const poster = getImage(media, 'large');
  const backdrop = media.bannerImage || poster;
  const currentNumber = currentEpisode?.number || 1;
  const activeEpisode = currentEpisode ?? episodes[0];
  const infoRows = [
    { label: 'Format', value: media.format || 'TV' },
    { label: 'Episodes', value: media.episodes || episodes.length || '—' },
    { label: 'Duration', value: media.duration ? `${media.duration} min` : '—' },
    { label: 'Season', value: media.seasonYear || '—' },
    { label: 'Score', value: media.averageScore ? `${media.averageScore}%` : 'N/A' },
    { label: 'Studio', value: media.studios?.nodes?.[0]?.name || '—' },
    { label: 'Status', value: media.status || '—' },
    { label: 'Audio', value: media.tags?.includes('dub') ? 'Sub / Dub' : 'Sub' },
  ];

  if (showPlayer && currentEpisode) {
    const idx = episodes.findIndex(item => item.number === currentEpisode.number);
    const prev = () => idx > 0 && handleWatch(episodes[idx - 1]);
    const next = () => idx < episodes.length - 1 && handleWatch(episodes[idx + 1]);

    return (
      <div className="av-android-watch-v2">
        <div className="av-android-watchbar-v2">
          <button type="button" onClick={() => setShowPlayer(false)}><ArrowLeft size={20} /></button>
          <div>
            <strong>{title}</strong>
            <span>Episode {currentEpisode.number} · {language.toUpperCase()}</span>
          </div>
          <div className="av-watch-lang-v2">
            {LANGUAGES.map(item => (
              <button key={item.id} type="button" className={language === item.id ? 'active' : ''} onClick={() => setLanguage(item.id)}>{item.label}</button>
            ))}
          </div>
        </div>
        <div className="av-android-player-stage-v2">
          {streamLoading ? (
            <div className="av-stream-loading-v2">
              <div className="av-spinner-v2" />
              <p>Finding a direct stream…</p>
            </div>
          ) : streamSources[0]?.url ? (
            <AndroidVideoPlayer sourceUrl={streamSources[0].url} poster={poster} title={`${title} · Episode ${currentEpisode.number}`} onPrevEpisode={prev} onNextEpisode={next} />
          ) : (
            <div className="av-stream-error-v2">
              <Info size={34} />
              <h3>Direct stream unavailable</h3>
              <p>This episode did not return a playable HLS/MP4 stream. No external player or website was opened.</p>
              <button type="button" onClick={() => loadStream(currentEpisode)}>Try again</button>
            </div>
          )}
        </div>
        <div className="player-episode-rail">
          <button type="button" className="ply-rail-nav" onClick={prev} disabled={idx <= 0}><SkipBack size={16} /></button>
          <div className="ply-rail-scroll">
            {episodes.map(ep => (
              <button key={ep.id} type="button" className={ep.number === currentNumber ? 'active' : ''} onClick={() => handleWatch(ep)}>{ep.number}</button>
            ))}
          </div>
          <button type="button" className="ply-rail-nav" onClick={next} disabled={idx >= episodes.length - 1}><SkipForward size={16} /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="detail-page">
      <button type="button" className="detail-back" onClick={goBack}><ArrowLeft size={18} /> Back</button>
      <section className="detail-hero" style={{ backgroundImage: `linear-gradient(180deg,rgba(3,15,22,.18),rgba(3,15,22,.96)),url(${backdrop})` }}>
        <div className="detail-poster">{poster ? <img src={poster} alt={title} /> : <span>AV</span>}</div>
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
        {airingText(media.nextAiringEpisode) && (
          <div className="airing-banner">
            <CalendarClock size={16} /> {airingText(media.nextAiringEpisode)}
          </div>
        )}

        <div className="detail-actions">
          <button type="button" className="btn-primary" onClick={() => handleWatch(activeEpisode)}><Play size={17} fill="currentColor" /> Watch Ep {currentNumber}</button>
          <button type="button" className="download-action-v2" onClick={() => handleDownload(activeEpisode)} disabled={downloadBusy}><Download size={18} />{downloadBusy ? 'Saving…' : 'Download'}</button>
          <button type="button" className={`icon-action ${favorite ? 'active' : ''}`} onClick={handleFavorite}><Heart size={19} fill={favorite ? 'currentColor' : 'none'} /></button>
        </div>

        {downloadMessage && <div className={`download-status-v2 ${downloadBusy ? 'busy' : ''}`}>{downloadMessage}</div>}

        <div className="language-row">
          {LANGUAGES.map(item => (
            <button key={item.id} type="button" className={language === item.id ? 'active' : ''} onClick={() => setLanguage(item.id)}>{item.label}</button>
          ))}
        </div>

        <div className="detail-info-grid">
          <div className="detail-info-card">
            {infoRows.map(row => (
              <div key={row.label} className="detail-info-row">
                <span>{row.label}</span>
                <strong>{row.value}</strong>
              </div>
            ))}
          </div>

          <section className="detail-description-v2">
            <h2>Synopsis</h2>
            <p>{stripHtml(media.description) || 'No synopsis available.'}</p>
          </section>
        </div>

        {media.genres?.length > 0 && (
          <section className="detail-description-v2">
            <h2>Genres</h2>
            <div className="genre-chips-v2">
              {media.genres.map(genre => <span key={genre}>{genre}</span>)}
            </div>
          </section>
        )}

        <div className="detail-reference-strip">
          <AnimeEpisodeExplorer
            episodes={episodes}
            activeEpisode={activeEpisode?.number}
            onSelect={episode => handleWatch(episode)}
          />
        </div>
      </div>
    </div>
  );
}
