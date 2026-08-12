import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchAnimeById, stripHtml } from '../api/anilist';
import { buildAnimeStreamUrlFromAniList } from '../utils/animeStreamingServer';
import VideoPlayer from '../components/VideoPlayer';
import CommentsSection from '../components/CommentsSection';
import { useUser } from '../api/UserContext';
import { buildDlhubSearchUrl } from '../utils/downloadLinks';
import { isBlockedForProfile } from '../utils/ageRating';
import {
  Play,
  Calendar,
  Star,
  ExternalLink,
  Download,
  Tv,
  Users,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  ChevronDown,
  Zap,
  Clock,
  Heart,
  Flame,
  Globe,
  Share2,
  Bookmark,
  Layers,
  ChevronLeft,
  ChevronRight,
  Info as InfoIcon,
  MessageSquare,
} from 'lucide-react';

import electronBridge from '../utils/electronBridge';
const PROGRESS_KEY = 'animevault_progress';
const RECENTS_KEY = 'animevault_recently_viewed';

function safeTitle(title) {
  if (!title) return 'Unknown Title';
  return title.english || title.romaji || title.native || 'Unknown Title';
}

/** Extract numeric ID from a potentially prefixed ID (e.g., "mal-12345" -> 12345) */
function extractNumericId(id) {
  if (!id) return null;
  const str = String(id).trim();
  const match = str.match(/(\d+)$/);
  return match ? match[1] : null;
}

 /** Build an instant episode list from AniList metadata — no scraper needed */
function buildEpisodeList(media) {
  if (media.status === 'NOT_YET_RELEASED') return [];
  // For airing shows, nextAiringEpisode.episode - 1 = last aired episode
  let count = media.episodes;
  if (media.nextAiringEpisode?.episode) {
    count = media.nextAiringEpisode.episode - 1;
  }
  if (!count || count <= 0) count = media.format === 'MOVIE' ? 1 : 12;

  return Array.from({ length: Math.min(count, 500) }, (_, i) => ({
    id: `ep-${media.id}-${i + 1}`,
    number: i + 1,
    title: `Episode ${i + 1}`,
  }));
}

/** Extract external IDs from AniList externalLinks */
function findExternalId(links, siteName) {
  if (!links) return null;
  const link = links.find(l => l.site.toLowerCase().includes(siteName.toLowerCase()));
  if (!link) return null;

  // Extract ID from URL
  const url = link.url;
  if (siteName.toLowerCase().includes('themoviedb')) {
    const match = url.match(/\/(tv|movie)\/(\d+)/);
    return match ? match[2] : null;
  }
  if (siteName.toLowerCase().includes('imdb')) {
    const match = url.match(/\/title\/(tt\d+)/);
    return match ? match[1] : null;
  }

  return url.split('/').filter(Boolean).pop();
}

// ─────────────────────────────────────────────────────────
// Streaming embeds with fallbacks for episodes missing on the primary host
// ─────────────────────────────────────────────────────────
const DEFAULT_LANGUAGE = 'sub';
const STREAM_LANGUAGES = [
  { id: 'sub', label: 'SUB' },
  { id: 'dub', label: 'DUB' },
];

function AnimeDetails() {
  const { id } = useParams();
  const { user, activeSubAccount, addToHistory, toggleLike, isLiked, setShowAuthModal, setAuthTab } = useUser();

  const [anime, setAnime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [episodes, setEpisodes] = useState([]);
  const [currentEpisode, setCurrentEpisode] = useState(null);
  const [progress, setProgress] = useState(() =>
    JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}')
  );

  // AllAnime Player state
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);

  // UI state
  const [activeTab, setActiveTab] = useState('episodes');

  // Episode page/chunk for large episode lists
  const [epPage, setEpPage] = useState(0);
  const EP_PAGE_SIZE = 100;

  // ───── Probe mirrors once per session (fire-and-forget) ─────
  // ───── Main data load ─────
  useEffect(() => {
    setAnime(null);
    setEpisodes([]);
    setCurrentEpisode(null);
    setLanguage(DEFAULT_LANGUAGE);
    setEpPage(0);

    async function load() {
      const safetyTimer = setTimeout(() => setLoading(false), 12000);
      try {
        setLoading(true);
        setError('');

        const media = await fetchAnimeById(id);
        if (!media) {
          setError('Anime not found.');
          return;
        }

        if (isBlockedForProfile(media, activeSubAccount)) {
          setError('This title is blocked for Kids profiles. Switch to an Adults profile to watch it.');
          setLoading(false);
          clearTimeout(safetyTimer);
          return;
        }

        setAnime(media);

        // ── Instantly build episode list from AniList metadata ──
        const epList = buildEpisodeList(media);
        setEpisodes(epList);

        // Always set default episode (episode 1 or last watched)
        const lastWatched = user ? JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}')[media.id] : null;
        const startEp = epList.find(e => e.number === lastWatched) || epList[0];
        setCurrentEpisode(startEp || null);

        // Done — page is interactive immediately
        setLoading(false);
        clearTimeout(safetyTimer);

        // ── Recently viewed ──
        const recents = JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]');
        const updated = [
          { id: media.id, title: safeTitle(media.title), image: media.coverImage?.large },
          ...recents.filter(r => r.id !== media.id),
        ].slice(0, 10);
        localStorage.setItem(RECENTS_KEY, JSON.stringify(updated));

      } catch (err) {
        setError(err.message || 'Failed to load anime details.');
      } finally {
        setLoading(false);
      }
    }

    load();
    window.scrollTo(0, 0);
  }, [id]);

  // Sync watch history to Neon Postgres when user logs in or anime loads
  useEffect(() => {
    if (user && anime) {
      addToHistory(anime.id, 'anime', safeTitle(anime.title), anime.coverImage?.large);
    }
  }, [user, anime]);

  // Update Discord Rich Presence when anime or episode changes
  useEffect(() => {
    if (anime && currentEpisode) {
      const title = safeTitle(anime.title);
      electronBridge.setAnimeActivity({
        title,
        episode: currentEpisode.number,
        coverUrl: anime.coverImage?.large || '',
        url: `https://anilist.co/anime/${anime.id}`,
      });
    }
    return () => {
      electronBridge.clearAnimeActivity();
    };
  }, [anime, currentEpisode]);

  // ───── Episode selection ─────
  // ───── Episode selection ─────
  function selectEpisode(ep) {
    setCurrentEpisode(ep);

    if (user && anime) {
      const updated = { ...progress, [anime.id]: ep.number };
      setProgress(updated);
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(updated));
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const handleNextEpisode = useCallback(() => {
    if (!currentEpisode || !episodes.length) return;
    const currentIndex = episodes.findIndex(e => e.number === currentEpisode.number);
    if (currentIndex !== -1 && currentIndex < episodes.length - 1) {
      selectEpisode(episodes[currentIndex + 1]);
    }
  }, [currentEpisode, episodes]);

  const handlePrevEpisode = useCallback(() => {
    if (!currentEpisode || !episodes.length) return;
    const currentIndex = episodes.findIndex(e => e.number === currentEpisode.number);
    if (currentIndex > 0) {
      selectEpisode(episodes[currentIndex - 1]);
    }
  }, [currentEpisode, episodes]);

  const playerSources = currentEpisode
    ? [{
        url: buildAnimeStreamUrlFromAniList(anime.id, currentEpisode.number, language),
        type: 'iframe',
        serverName: 'MegaFlix',
        priority: 1000,
      }]
    : [];

  // ───── Episode pagination ─────
  const totalPages = Math.ceil(episodes.length / EP_PAGE_SIZE);
  const visibleEpisodes = episodes.slice(epPage * EP_PAGE_SIZE, (epPage + 1) * EP_PAGE_SIZE);

  // ───── Render ─────
  if (loading) return (
    <div className="status-container">
      <div className="spinner" />
      <p>Loading anime details...</p>
    </div>
  );

  if (error) return (
    <div className="status-container">
      <AlertCircle size={48} color="var(--brand-color)" />
      <p className="error">{error}</p>
      <Link to="/anime" className="btn-play-v2">Back to Anime Home</Link>
    </div>
  );

  const animeTitle = safeTitle(anime.title);
  
  const animeDownloadUrls = currentEpisode
    ? {
        dlhub: buildDlhubSearchUrl({
          title: animeTitle,
          type: anime.format === 'MOVIE' ? 'movie' : 'anime',
          episode: anime.format === 'MOVIE' ? null : currentEpisode.number,
          year: anime.seasonYear,
        }),
      }
    : null;
  return (
    <div className="new-player-container">
      {/* ── Hero Banner ── */}
      <div className="detail-hero-v2">
        <img
          className="detail-banner-v2"
          src={anime.bannerImage || anime.coverImage?.extraLarge || anime.coverImage?.large}
          alt="Anime cover"
        />
        <div className="detail-hero-overlay-v2" />

        <div className="detail-hero-content-v2">
          <img
            className="detail-poster-v2"
            src={anime.coverImage?.extraLarge || anime.coverImage?.large}
            alt={animeTitle}
          />
          <div className="detail-info-v2">
            <h1 className="detail-title-v2">
              {animeTitle}
              <small style={{ fontSize: '0.6em', marginLeft: '0.5rem', color: 'var(--text-secondary)' }}>
                watching in anime vault
              </small>
            </h1>
            <div className="detail-meta-v2">
              <span className="score"><Star size={16} fill="currentColor" /> {anime.averageScore}%</span>
              <span><Tv size={16} /> {anime.format}</span>
              <span><Users size={16} /> {anime.status}</span>
              {anime.seasonYear && <span><Calendar size={16} /> {anime.seasonYear}</span>}
              {anime.nextAiringEpisode && (
                <span style={{ color: 'var(--brand-color)' }}>
                  EP {anime.nextAiringEpisode.episode} airing soon
                </span>
              )}
            </div>
            <div className="detail-actions-v2">
              <button
                className="btn-play-v2"
                onClick={() => {
                  if (episodes.length > 0) selectEpisode(episodes[0]);
                }}
              >
                <Play size={20} fill="currentColor" /> Watch Now
              </button>
              <button 
                className="btn-info-v2"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  color: isLiked(anime.id, 'anime') ? '#ff1a75' : 'var(--text-secondary)',
                  borderColor: isLiked(anime.id, 'anime') ? '#ff1a75' : 'var(--glass-border)',
                  background: isLiked(anime.id, 'anime') ? 'rgba(255,26,117,0.1)' : 'var(--glass)',
                  boxShadow: isLiked(anime.id, 'anime') ? '0 0 10px rgba(255,26,117,0.2)' : 'none',
                  transition: 'all 0.2s ease', cursor: 'pointer'
                }}
                onClick={() => toggleLike(anime.id, 'anime', safeTitle(anime.title), anime.coverImage?.large)}
              >
                <Heart size={20} fill={isLiked(anime.id, 'anime') ? '#ff1a75' : 'none'} /> 
                {isLiked(anime.id, 'anime') ? 'Favorited' : 'Add to Collection'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="new-player-grid">
        {/* LEFT COLUMN: Player & Main Info */}
        <div className="new-player-main">
          
          {/* ── Video Player ── */}
          <div className="player-section-v2">
              {currentEpisode ? (
              <VideoPlayer
                sources={playerSources}
                poster={anime.bannerImage || anime.coverImage?.extraLarge}
                title={`${animeTitle} · EP ${currentEpisode.number}`}
                key={`${anime.id}_${currentEpisode.id}_${language}`}
                isZen={false}
                onNextEpisode={handleNextEpisode}
                onPrevEpisode={handlePrevEpisode}
              />
            ) : (
              <div className="video-player-error">
                <PlayCircle size={48} className="spin" />
                <p>No episodes available yet for this title.</p>
              </div>
            )}

          </div>

          {/* ── Language & Zen Toggle ── */}
          {currentEpisode && (
            <div className="player-lang-bar">
              {STREAM_LANGUAGES.map(({ id: lang, label }) => (
                <button
                  key={lang}
                  className={`lang-btn-v2 ${language === lang ? 'active' : ''}`}
                  onClick={() => setLanguage(lang)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}



          {/* ── Tabs Navigation ── */}
          <div className="new-player-tabs-nav">
            <button className={`tab-btn ${activeTab === 'episodes' ? 'active' : ''}`} onClick={() => setActiveTab('episodes')}>Episodes</button>
            <button className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`} onClick={() => setActiveTab('info')}>Info</button>
            <button className={`tab-btn ${activeTab === 'community' ? 'active' : ''}`} onClick={() => setActiveTab('community')}>Community</button>
          </div>

          {/* ── Tab Content ── */}
          <div className="new-player-tab-content">
            {activeTab === 'episodes' && (
              <div className="mobile-episodes-only">
                {totalPages > 1 && (
                  <div className="ep-page-selector">
                    {Array.from({ length: totalPages }, (_, i) => (
                      <button
                        key={i}
                        className={`ep-page-btn ${epPage === i ? 'active' : ''}`}
                        onClick={() => setEpPage(i)}
                      >
                        {i * EP_PAGE_SIZE + 1}–{Math.min((i + 1) * EP_PAGE_SIZE, episodes.length)}
                      </button>
                    ))}
                  </div>
                )}
                <div className="episodes-container-v2">
                  {visibleEpisodes.length > 0 ? (
                    <div className="rich-episodes-list">
                      {visibleEpisodes.map(ep => (
                        <button
                          key={ep.id}
                          className={`rich-episode-card ${currentEpisode?.id === ep.id ? 'active' : ''} ${progress[anime.id] >= ep.number ? 'watched' : ''}`}
                          onClick={() => selectEpisode(ep)}
                        >
                          <div className="ep-card-img">
                            <img 
                              src={ep.image || anime.bannerImage || anime.coverImage?.large} 
                              alt={`Episode ${ep.number}`} 
                              onError={(e) => { e.target.src = anime.coverImage?.large }}
                            />
                            <div className="ep-card-overlay">
                              <PlayCircle size={24} className="play-icon" />
                            </div>
                            {progress[anime.id] >= ep.number && <div className="watched-badge"><CheckCircle2 size={12} /> Watched</div>}
                          </div>
                          <div className="ep-card-info">
                            <span className="ep-card-number">Episode {ep.number}</span>
                            <span className="ep-card-title" title={ep.title || `Episode ${ep.number}`}>{ep.title || `Episode ${ep.number}`}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p>No episodes available for this title yet.</p>
                  )}
                </div>
              </div>
            )}
            {activeTab === 'info' && (
              <div className="info-tab-content">
                <div className="details-section-v2">
                  <h2>Synopsis</h2>
                  <p>{stripHtml(anime.description)}</p>
                </div>
                {anime.relations?.nodes?.length > 0 && (() => {
                  const SHOW_TYPES = ['PREQUEL', 'SEQUEL', 'PARENT', 'SIDE_STORY', 'SUMMARY'];
                  const filtered = anime.relations.nodes
                    .map((rel, i) => ({ rel, type: anime.relations.edges[i]?.relationType }))
                    .filter(({ type }) => SHOW_TYPES.includes(type));
                  if (!filtered.length) return null;
                  return (
                    <div className="details-section-v2">
                      <h2>Seasons & Related</h2>
                      <div className="relations-grid-v2">
                        {filtered.map(({ rel, type }) => (
                          <Link key={rel.id} to={`/anime/${rel.id}`} className="relation-card-v2">
                            <div className="relation-image">
                              <img src={rel.coverImage?.large} alt={safeTitle(rel.title)} />
                              <span className="relation-type">{type.replace('_', ' ')}</span>
                            </div>
                            <div className="relation-info">
                              <h4>{safeTitle(rel.title)}</h4>
                              <span>{rel.format} · {rel.status}</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })()}
                
                <div className="sidebar-block-v2">
                  <h3>Details</h3>
                  <div className="info-list-v2">
                    <div className="info-row-v2">
                      <span className="info-label-v2">Native Title</span>
                      <span className="info-value-v2">{anime.title?.native}</span>
                    </div>
                    <div className="info-row-v2">
                      <span className="info-label-v2">Studios</span>
                      <span className="info-value-v2">{anime.studios?.nodes?.map(n => n.name).join(', ')}</span>
                    </div>
                    <div className="info-row-v2">
                      <span className="info-label-v2">Episodes</span>
                      <span className="info-value-v2">
                        {anime.nextAiringEpisode
                          ? `${anime.nextAiringEpisode.episode - 1} aired / ${anime.episodes || '?'} total`
                          : anime.episodes || 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'community' && (
              <CommentsSection mediaId={anime.id} />
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Desktop Sidebar */}
        <aside className="new-player-sidebar">
          {/* Desktop Episode Browser */}
          <div className="desktop-episodes-container details-section-v2">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0 }}>
                Episodes
                <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                  ({episodes.length})
                </span>
              </h2>
            </div>
            {totalPages > 1 && (
              <div className="ep-page-selector">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    className={`ep-page-btn ${epPage === i ? 'active' : ''}`}
                    onClick={() => setEpPage(i)}
                  >
                    {i * EP_PAGE_SIZE + 1}–{Math.min((i + 1) * EP_PAGE_SIZE, episodes.length)}
                  </button>
                ))}
              </div>
            )}
            <div className="episodes-container-v2">
              {visibleEpisodes.length > 0 ? (
                <div className="rich-episodes-list">
                  {visibleEpisodes.map(ep => (
                    <button
                      key={ep.id}
                      className={`rich-episode-card ${currentEpisode?.id === ep.id ? 'active' : ''} ${progress[anime.id] >= ep.number ? 'watched' : ''}`}
                      onClick={() => selectEpisode(ep)}
                    >
                      <div className="ep-card-img">
                        <img 
                          src={ep.image || anime.bannerImage || anime.coverImage?.large} 
                          alt={`Episode ${ep.number}`} 
                          onError={(e) => { e.target.src = anime.coverImage?.large }}
                        />
                        <div className="ep-card-overlay">
                          <PlayCircle size={24} className="play-icon" />
                        </div>
                        {progress[anime.id] >= ep.number && <div className="watched-badge"><CheckCircle2 size={12} /> Watched</div>}
                      </div>
                      <div className="ep-card-info">
                        <span className="ep-card-number">Episode {ep.number}</span>
                        <span className="ep-card-title" title={ep.title || `Episode ${ep.number}`}>{ep.title || `Episode ${ep.number}`}</span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p>No episodes available for this title yet.</p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default AnimeDetails;
