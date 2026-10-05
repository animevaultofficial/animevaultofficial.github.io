import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, ChevronDown, ChevronLeft, ChevronRight, Expand, ListVideo, Maximize, Moon, Play, Search, Share2 } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { getAniPMSeries, getAniPMTitle, aniPMEmbedUrl } from '../api/anipm';
import { fetchAnimeEpisodeThumbnails } from '../api/movies';
import { fetchEpisodeThumbnails } from '../api/jikan';
import { useUser } from '../api/UserContext';
import { isBlockedForProfile } from '../utils/ageRating';
import { withTimeout } from '../utils/withTimeout';
import '../styles/playerPage.css';

const ORIGIN = 'https://ani.pm';

function storageKey(id, episode, lang) {
  return `animevault:anipm-progress:${id}:${episode}:${lang}`;
}

function readProgress(key) {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch (error) {
    console.warn('[AnimeVault] Could not restore episode progress:', error);
    return 0;
  }
}

function saveProgress(key, time) {
  try {
    localStorage.setItem(key, String(Math.floor(time)));
  } catch (error) {
    console.warn('[AnimeVault] Could not save episode progress:', error);
  }
}

function episodeKind(episode) {
  const type = String(episode?.fillerType || episode?.episodeType || episode?.type || episode?.classification || '').toLowerCase();
  if (episode?.isFiller || type.includes('filler')) return 'filler';
  if (episode?.isCanon || type.includes('canon')) return 'canon';
  if (episode?.isMixed || type.includes('mixed')) return 'mixed';
  return '';
}

function isPlayableEpisode(episode) {
  return Boolean(episode?.available?.sub || episode?.available?.dub);
}

export default function AnimeWatch({ mediaId }) {
  const { id: routeId } = useParams();
  const id = mediaId || routeId;
  const [params, setParams] = useSearchParams();
  const { user, activeSubAccount, addToHistory, toggleLike, isLiked } = useUser();
  const frameRef = useRef(null);
  const historyEntryKey = useRef('');
  const [series, setSeries] = useState(null);
  const [titleMeta, setTitleMeta] = useState(null);
  const [episodeImages, setEpisodeImages] = useState({});
  const [episode, setEpisode] = useState(Number(params.get('episode')) || 1);
  const [lang, setLang] = useState(params.get('lang') === 'dub' ? 'dub' : 'sub');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [playerState, setPlayerState] = useState(null);
  const [shareMessage, setShareMessage] = useState('');
  const [query, setQuery] = useState('');
  const [audioFilter, setAudioFilter] = useState('all');
  const [order, setOrder] = useState('asc');
  const [hideFiller, setHideFiller] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [autoSkip, setAutoSkip] = useState(false);
  const [playerOptions, setPlayerOptions] = useState({ autoPlay: true, autoSkip: false });
  const [theaterMode, setTheaterMode] = useState(false);
  const [lightsOff, setLightsOff] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    setEpisode(Number(params.get('episode')) || 1);
    setLang(params.get('lang') === 'dub' ? 'dub' : 'sub');
  }, [id, params]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    withTimeout(getAniPMSeries(id), 6000, 'Anime player did not load within 6 seconds.')
      .then(data => {
        if (cancelled) return;
        if (!data) throw new Error('Anime not found on ani.pm.');
        if (isBlockedForProfile(data, activeSubAccount)) throw new Error('This title is blocked for Kids profiles.');
        setSeries(data);
        setTitleMeta(null);
        setEpisodeImages({});
        const requested = Number(params.get('episode')) || 1;
        const requestedEpisode = data.episodeList?.find(item => Number(item.number) === requested && isPlayableEpisode(item));
        const firstPlayable = data.episodeList?.find(isPlayableEpisode);
        setEpisode(requestedEpisode?.number || firstPlayable?.number || data.episodeList?.[0]?.number || 1);

        const name = data.title || 'Anime';
        const year = data.year;
        const count = data.episodeList?.length || 0;
        void fetchAnimeEpisodeThumbnails(name, year, count, [data.nativeTitle], thumbnails => {
          if (cancelled) return;
          setEpisodeImages(current => ({ ...current, ...thumbnails }));
        }).catch(error => {
          if (!cancelled) console.warn('[AnimeVault] TMDB episode thumbnails unavailable:', error);
        });

        void getAniPMTitle(id).then(titleData => {
          if (cancelled || !titleData) return;
          setTitleMeta(titleData);
          const malId = data.malId || titleData.malId || titleData.mal_id;
          if (malId) {
            void fetchEpisodeThumbnails(malId).then(thumbnails => {
              if (!cancelled) setEpisodeImages(current => ({ ...current, ...thumbnails }));
            }).catch(error => {
              if (!cancelled) console.warn('[AnimeVault] MyAnimeList episode thumbnails unavailable:', error);
            });
          }
        }).catch(titleError => {
          if (!cancelled) console.warn('[AnimeVault] Anime metadata unavailable:', titleError);
        });
      })
      .catch(err => { if (!cancelled) setError(err?.message || 'Unable to load anime.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, activeSubAccount]);

  const allEpisodes = useMemo(() => (series?.episodeList || []).map(item => ({
      ...item,
      image: episodeImages[item.number] || item.image || item.thumbnail || item.thumbnailUrl || item.imageUrl || '',
    })), [series, episodeImages]);
  const episodes = useMemo(() => {
    const term = query.trim().toLowerCase();
    return allEpisodes.filter(item => {
      const searchable = [item.number, item.title, item.summary, item.description].filter(Boolean).join(' ').toLowerCase();
      if (term && !searchable.includes(term)) return false;
      if (audioFilter === 'sub' && !item.available?.sub) return false;
      if (audioFilter === 'dub' && !item.available?.dub) return false;
      if (hideFiller && episodeKind(item) === 'filler') return false;
      return true;
    }).sort((a, b) => order === 'asc' ? a.number - b.number : b.number - a.number);
  }, [allEpisodes, query, audioFilter, order, hideFiller]);
  const availableEpisodeKinds = useMemo(() => new Set(allEpisodes.map(episodeKind).filter(Boolean)), [allEpisodes]);
  const playableEpisodes = useMemo(() => allEpisodes.filter(isPlayableEpisode), [allEpisodes]);
  const current = playableEpisodes.find(item => Number(item.number) === Number(episode)) || playableEpisodes[0];
  const currentIndex = playableEpisodes.findIndex(item => Number(item.number) === Number(current?.number));
  const effectiveLang = current?.available?.[lang] ? lang : (current?.available?.sub ? 'sub' : 'dub');
  // Read resume position only when the episode/language changes. The player emits
  // timeupdate events frequently; reading live localStorage during every render
  // would change the iframe src and remount the player repeatedly.
  const progress = useMemo(
    () => readProgress(storageKey(id, episode, effectiveLang)),
    [id, episode, effectiveLang]
  );

  useEffect(() => {
    setPlayerState(null);
  }, [episode, effectiveLang]);

  useEffect(() => {
    if (effectiveLang !== lang) setLang(effectiveLang);
  }, [effectiveLang, lang]);

  useEffect(() => {
    if (!series || !addToHistory) return;
    const entryKey = `${series.anilistId || id}:${activeSubAccount?.id || ''}`;
    if (historyEntryKey.current === entryKey) return;
    historyEntryKey.current = entryKey;
    addToHistory({
      id: String(series.anilistId || id),
      type: 'anime',
      title: series.title || 'Anime',
      image: series.poster || '',
      subAccountId: activeSubAccount?.id || null,
    }).catch?.(error => console.warn('[AnimeVault] Could not add anime to watch history:', error));
  }, [series, id, addToHistory, activeSubAccount]);

  const frameSrc = current
    ? aniPMEmbedUrl({
        anilistId: series.anilistId || id,
        episode: current.number,
        lang: effectiveLang,
        color: 'ff1a75',
        autonext: playerOptions.autoPlay ? 1 : 0,
        autoskip: playerOptions.autoSkip ? 1 : 0,
        episodes: 1,
        adult: 1,
        api: 1,
        start: progress > 5 ? Math.floor(progress) : 0,
      })
    : '';
  const playbackPercent = playerState?.duration
    ? Math.min(100, Math.max(0, (Number(playerState.currentTime || 0) / Number(playerState.duration)) * 100))
    : 0;

  useEffect(() => {
    const onMessage = event => {
      if (event.origin !== ORIGIN || event.source !== frameRef.current?.contentWindow) return;
      const data = event.data;
      if (!data || data.ns !== 'anipm.player' || data.v !== 1) return;
      if (data.event) {
        setPlayerState(data.data || {});
        if (data.event === 'timeupdate' && data.data?.currentTime != null) {
          saveProgress(storageKey(id, episode, effectiveLang), data.data.currentTime);
        }
        if (data.event === 'episodechange' && data.data?.episode) {
          setPlayerOptions({ autoPlay, autoSkip });
          setEpisode(Number(data.data.episode));
          setParams(prev => {
            const next = new URLSearchParams(prev);
            next.set('episode', String(data.data.episode));
            next.set('lang', data.data.lang || effectiveLang);
            return next;
          }, { replace: true });
        }
        if (data.event === 'languagechange' && data.data?.lang) {
          setLang(data.data.lang);
          setParams(prev => {
            const next = new URLSearchParams(prev);
            next.set('lang', data.data.lang);
            return next;
          }, { replace: true });
        }
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [id, episode, effectiveLang, autoPlay, autoSkip, setParams]);

  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const send = (cmd, args = {}) => {
    frameRef.current?.contentWindow?.postMessage({ ns: 'anipm.player', v: 1, cmd, args }, ORIGIN);
  };

  const chooseEpisode = number => {
    const item = playableEpisodes.find(ep => Number(ep.number) === Number(number));
    if (!item) return;
    const nextLang = item.available?.[lang] ? lang : (item.available?.sub ? 'sub' : 'dub');
    setPlayerOptions({ autoPlay, autoSkip });
    setEpisode(number);
    setLang(nextLang);
    setParams({ episode: String(number), lang: nextLang }, { replace: true });
  };

  const chooseLanguage = nextLang => {
    if (!current?.available?.[nextLang]) return;
    setLang(nextLang);
    setParams({ episode: String(episode), lang: nextLang }, { replace: true });
    send('setLanguage', { lang: nextLang });
  };

  const nextEpisode = () => {
    if (currentIndex >= 0 && playableEpisodes[currentIndex + 1]) chooseEpisode(playableEpisodes[currentIndex + 1].number);
  };

  const previousEpisode = () => {
    if (currentIndex > 0) chooseEpisode(playableEpisodes[currentIndex - 1].number);
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
    const shareData = { title: series?.title || 'AnimeVault', url: window.location.href };
    try {
      if (navigator.share) await navigator.share(shareData);
      else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareData.url);
        setShareMessage('Episode link copied');
        window.setTimeout(() => setShareMessage(''), 2500);
      }
      else console.warn('[AnimeVault] Sharing is unavailable in this browser.');
    } catch (shareError) {
      if (shareError?.name !== 'AbortError') console.warn('[AnimeVault] Could not share this episode:', shareError);
    }
  };

  if (loading) return <div className="anime-player-state is-loading" role="status" aria-live="polite">Preparing anime player…</div>;
  if (error || !series) return <div className="anime-player-state"><h2>{error || 'Anime not found'}</h2><Link to="/" className="anime-player-back"><ArrowLeft size={17}/> Back to AnimeVault</Link></div>;
  if (!current) return <div className="anime-player-state"><h2>No playable episodes are currently available.</h2><Link to="/" className="anime-player-back"><ArrowLeft size={17}/> Back</Link></div>;

  const title = series.title || 'Anime';
  const hasDub = current.available?.dub;
  const hasSub = current.available?.sub;
  const episodeTitle = current.title || `Episode ${current.number}`;
  const synopsis = titleMeta?.synopsis || titleMeta?.description || series.synopsis || series.description || '';
  const poster = titleMeta?.poster || series.poster || '';
  const liked = isLiked?.(String(series.anilistId || id));

  const toggleFavorite = () => {
    if (!user) return;
    toggleLike?.({ id: String(series.anilistId || id), type: 'anime', title, image: poster });
  };

  return <div className={`anime-player-page ${theaterMode ? 'theater-mode' : ''} ${lightsOff ? 'lights-off' : ''}`}>
    {lightsOff && <button type="button" className="anime-player-dim-layer" aria-label="Turn lights on" onClick={() => setLightsOff(false)} />}
    <main className="anime-player-layout">
      <section className="anime-player-primary">
        <div className="anime-player-video-wrap">
          <iframe
            ref={frameRef}
            key={frameSrc}
            src={frameSrc}
            title={`${title} episode ${current.number}`}
            className="anime-player-iframe"
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            allowFullScreen
          />
        </div>
        <div className="anime-player-progress-track"><span style={{ width: `${playbackPercent}%` }} /></div>
        <div className="anime-player-toolbar">
          <button type="button" aria-label="Previous episode" onClick={previousEpisode} disabled={currentIndex <= 0}><ChevronLeft size={17}/></button>
          <button type="button" aria-label="Next episode" onClick={nextEpisode} disabled={currentIndex < 0 || currentIndex >= playableEpisodes.length - 1}><ChevronRight size={17}/></button>
          <span className="anime-player-time">{playerState?.currentTime ? `${Math.floor(playerState.currentTime / 60)}:${String(Math.floor(playerState.currentTime % 60)).padStart(2, '0')}` : '00:00'} / {playerState?.duration ? `${Math.floor(playerState.duration / 60)}:${String(Math.floor(playerState.duration % 60)).padStart(2, '0')}` : '--:--'}</span>
          <span className="anime-player-spacer" />
          <button type="button" aria-label="Toggle fullscreen" onClick={toggleFullscreen}>{fullscreen ? <Expand size={15}/> : <Maximize size={15}/>}</button>
        </div>
        <div className="anime-player-quick-controls">
          <button type="button" aria-pressed={autoPlay} className={autoPlay ? 'selected' : ''} onClick={() => setAutoPlay(value => !value)}><Play size={12}/> Auto play</button>
          <button type="button" aria-pressed={autoSkip} className={autoSkip ? 'selected' : ''} onClick={() => setAutoSkip(value => !value)}><Check size={12}/> Auto-skip</button>
          <button type="button" aria-pressed={theaterMode} className={theaterMode ? 'selected' : ''} onClick={() => setTheaterMode(value => !value)}><Expand size={12}/> Theater mode</button>
          <button type="button" aria-pressed={lightsOff} className={lightsOff ? 'selected' : ''} onClick={() => setLightsOff(value => !value)}><Moon size={12}/> Lights off</button>
          <button type="button" onClick={toggleFullscreen}><Maximize size={12}/> Fullscreen</button>
          <span className="anime-player-quick-spacer" />
          <button type="button" onClick={previousEpisode} disabled={currentIndex <= 0}><ChevronLeft size={12}/> Previous episode</button>
          <button type="button" onClick={nextEpisode} disabled={currentIndex < 0 || currentIndex >= playableEpisodes.length - 1}>Next episode <ChevronRight size={12}/></button>
        </div>

        <section className="anime-player-current">
          <h1>{current.number}. {episodeTitle}</h1>
          <p>{current.synopsis || current.description || synopsis || `Now watching ${title}, episode ${current.number}.`}</p>
          <div className="anime-player-actions">
            <button type="button" className={liked ? 'active' : ''} onClick={toggleFavorite}><Check size={13}/> {liked ? 'In library' : 'Add to library'}</button>
            <button type="button" disabled={!hasSub} className={effectiveLang === 'sub' ? 'active' : ''} onClick={() => chooseLanguage('sub')}>SUB</button>
            <button type="button" disabled={!hasDub} className={effectiveLang === 'dub' ? 'active' : ''} onClick={() => chooseLanguage('dub')}>DUB</button>
            <button type="button" onClick={share}><Share2 size={13}/> Share</button>
            {progress > 5 && <span className="anime-player-resume"><Play size={12}/> Resuming {Math.floor(progress / 60)}:{String(Math.floor(progress % 60)).padStart(2, '0')}</span>}
            {shareMessage && <span className="anime-player-share-message" role="status">{shareMessage}</span>}
            {playerState?.quality?.height && <span className="anime-player-quality">{playerState.quality.height}p</span>}
          </div>
        </section>

        <section className="anime-player-series">
          {poster && <img src={poster} alt="" />}
          <div className="anime-player-series-copy">
            <div className="anime-player-series-title">
              <h2>{title}</h2>
              <span>{series.year || titleMeta?.year || ''} · {allEpisodes.length} episodes</span>
            </div>
            <p>{synopsis || 'Anime details are not available for this title yet.'}</p>
          </div>
        </section>
      </section>

      <aside className="anime-player-sidebar">
        <div className="anime-player-sidebar-head">
          <div className="anime-player-select"><ListVideo size={14}/><span>Episode list</span><small>{allEpisodes.length} total</small></div>
          <label className="anime-player-search"><Search size={14}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search episodes" /></label>
          <div className="anime-player-filters">
            <button type="button" onClick={() => setOrder(value => value === 'asc' ? 'desc' : 'asc')}><span>↕</span> {order === 'asc' ? 'Oldest' : 'Newest'}</button>
            {availableEpisodeKinds.has('filler') && <button type="button" className={hideFiller ? 'active' : ''} onClick={() => setHideFiller(value => !value)}>{hideFiller ? 'Show filler' : 'Hide filler'} <small>{allEpisodes.filter(ep => episodeKind(ep) === 'filler').length}</small></button>}
            <button type="button" className={audioFilter === 'sub' ? 'active' : ''} onClick={() => setAudioFilter(value => value === 'sub' ? 'all' : 'sub')}>Sub only <small>{allEpisodes.filter(ep => ep.available?.sub).length}</small></button>
            <button type="button" className={audioFilter === 'dub' ? 'active' : ''} onClick={() => setAudioFilter(value => value === 'dub' ? 'all' : 'dub')}>Dub only <small>{allEpisodes.filter(ep => ep.available?.dub).length}</small></button>
          </div>
          {availableEpisodeKinds.size > 0 && <div className="anime-player-legend">
            {availableEpisodeKinds.has('canon') && <span><i className="canon"/>Canon</span>}
            {availableEpisodeKinds.has('mixed') && <span><i className="mixed"/>Mixed</span>}
            {availableEpisodeKinds.has('filler') && <span><i className="filler"/>Anime original</span>}
          </div>}
        </div>
        <div className="anime-player-episode-list">
          {episodes.length ? episodes.map(ep => {
            const active = Number(ep.number) === Number(episode);
            const available = isPlayableEpisode(ep);
            return <button
              type="button"
              key={ep.number}
              className={`anime-player-episode ${active ? 'active' : ''}`}
              disabled={!available}
              onClick={() => chooseEpisode(ep.number)}
              title={ep.title || `Episode ${ep.number}`}
            >
              <span className="anime-player-thumb">
                {ep.image ? <img src={ep.image} alt="" loading="lazy" decoding="async" onError={event => { event.currentTarget.hidden = true; }}/> : <span>Episode {String(ep.number).padStart(2, '0')}</span>}
                <b>Episode {ep.number}</b>
                {active && <strong><Play size={10} fill="currentColor"/> Now playing</strong>}
                <small>{ep.available?.dub ? 'DUB' : ''}</small>
              </span>
              <span className="anime-player-episode-copy">
                <strong>{ep.title || `Episode ${ep.number}`}</strong>
                <span>{ep.synopsis || ep.description || title}</span>
                {ep.airDate && <time>{ep.airDate}</time>}
              </span>
            </button>;
          }) : <div className="anime-player-no-episodes">No episodes match this filter.</div>}
        </div>
      </aside>
    </main>
  </div>;
}
