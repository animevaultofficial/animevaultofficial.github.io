// src/pages/MovieWatch.jsx
import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Star,
  Clock,
  Calendar,
  Film,
  Play,
  PlayCircle,
  CheckCircle2,
  AlertTriangle,
  Heart,
  Gamepad2,
  Server,
  Tv,
  Users
} from "lucide-react";
import { fetchMediaMeta } from "../api/movies";
import CommentsSection from "../components/CommentsSection";
import { useUser } from "../api/UserContext";
import electronBridge from "../utils/electronBridge";
import { FocusableButton, FocusableLink } from "../components/FocusableWrapper";
import { PLAYER_SOURCES, getSourceUrl } from "../utils/playerSources";
import { storage } from "../utils/storage";
import { isBlockedForProfile } from "../utils/ageRating";
import VideoPlayer from "../components/VideoPlayer";

// Helper to get episode number
function getEpisodeNumber(episode) {
  return episode?.episode || episode?.number || 1;
}

// Strip HTML tags for clean text (useful for descriptions)
function stripHtml(html) {
  if (!html) return "";
  return html.replace(/<[^>]*>?/gm, "");
}

function MovieWatch() {
  const { type, id } = useParams();
  const { user, activeSubAccount, addToHistory, updateContinueWatching, toggleLike, isLiked } = useUser();
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSeason, setActiveSeason] = useState(null);
  const [activeEpisode, setActiveEpisode] = useState(null);
  const [activeSourceId, setActiveSourceId] = useState(() => storage.get("playerSource") || PLAYER_SOURCES[0].id);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [showFallbackHint, setShowFallbackHint] = useState(false);
  const [accentColor] = useState(() => storage.get("accentColor") || "ff1a75");
  const [playing, setPlaying] = useState(false);
  
  // Tabs: 'episodes', 'info', 'community'
  const isSeries = type === "tv" || type === "series";
  const [activeTab, setActiveTab] = useState(isSeries ? "episodes" : "info");
  
  const webviewRef = useRef(null);

  // Check if we're in Electron
  const isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined;

  // Load video metadata and set initial player source
  useEffect(() => {
    loadMeta();
  }, [id, type, activeSubAccount]);

  // Ensure active tab makes sense when meta loads
  useEffect(() => {
    if (meta) {
      if (isSeries && activeTab === 'info') setActiveTab('episodes');
      if (!isSeries && activeTab === 'episodes') setActiveTab('info');
    }
  }, [meta, isSeries]);

  // Save player source when changed
  useEffect(() => {
    storage.set("playerSource", activeSourceId);
  }, [activeSourceId]);

  // Sync watch history to backend
  useEffect(() => {
    if (user && meta) {
      addToHistory(
        id,
        type,
        meta.name || meta.title,
        meta.poster || (meta.poster_path ? `https://image.tmdb.org/t/p/w500${meta.poster_path}` : "")
      );
    }
  }, [user, meta, id, type]);

  // Sync continue watching progress
  useEffect(() => {
    if (user && meta) {
      const poster = meta.poster || (meta.poster_path ? `https://image.tmdb.org/t/p/w500${meta.poster_path}` : "");
      updateContinueWatching(
        id,
        type,
        meta.name || meta.title,
        poster,
        activeSeason || 1,
        getEpisodeNumber(activeEpisode),
        0,
        0
      );
    }
  }, [user, meta, activeSeason, activeEpisode]);

  // Update Discord Rich Presence
  useEffect(() => {
    if (meta) {
      const title = meta.name || meta.title || "Unknown";
      electronBridge.setAnimeActivity({
        title,
        episode: isSeries ? getEpisodeNumber(activeEpisode) : null,
        coverUrl: meta.poster || `https://live.metahub.space/poster/medium/${id}/img`,
        url: meta.imdb_id ? `https://www.imdb.com/title/${meta.imdb_id}` : "",
      });
    }
    return () => electronBridge.clearAnimeActivity();
  }, [meta, activeEpisode, type, id, isSeries]);

  // Compute current embed URL
  const getCurrentEmbedUrl = () => {
    if (!meta) return null;
    const tmdbId = meta.tmdbId;
    if (!tmdbId) return null;
    const sNum = activeSeason || 1;
    const eNum = getEpisodeNumber(activeEpisode);
    const sourceType = type === 'movie' ? 'movie' : 'tv';
    return getSourceUrl(activeSourceId, sourceType, tmdbId, sNum, eNum, {}, accentColor);
  };

  const currentEmbedUrl = getCurrentEmbedUrl();

  async function loadMeta() {
    setLoading(true);
    let data = await fetchMediaMeta(type, id);

    // Normalise episode numbers for UI
    if (data && data.videos) {
      data.videos = data.videos.map((v) => ({
        ...v,
        episode: v.number !== undefined ? v.number : v.episode,
      }));
    }
    if (isBlockedForProfile(data, activeSubAccount)) {
      setMeta({ blocked: true, title: data?.title || data?.name || 'This title' });
      setLoading(false);
      return;
    }

    setMeta(data);
    // Initialise season/episode for series
    if (data && (type === "tv" || type === "series")) {
      const seasons = {};
      (data.seasons || data.videos || []).forEach((s) => {
        if (s.season_number !== undefined && s.episodes && s.episodes.length > 0) {
          const seasonNum = s.season_number;
          if (seasonNum > 0) {
            seasons[seasonNum] = s.episodes.map((ep) => ({
              ...ep,
              episode: ep.episode_number,
              number: ep.episode_number,
              title: ep.name || `Episode ${ep.episode_number}`,
              thumbnail: ep.still_path ? `https://image.tmdb.org/t/p/w780${ep.still_path}` : null
            }));
          }
        }
        else if ((s.season_number !== undefined || s.season !== undefined) && s.episode_count !== undefined) {
          const seasonNum = s.season_number !== undefined ? s.season_number : s.season;
          if (seasonNum > 0) {
            const epCount = s.episode_count;
            seasons[seasonNum] = [];
            for (let i = 1; i <= epCount; i++) {
              seasons[seasonNum].push({
                episode: i,
                number: i,
                title: `Episode ${i}`,
              });
            }
          }
        } 
        else if (s.season !== undefined && s.episode !== undefined) {
          const seasonNum = s.season;
          if (!seasons[seasonNum]) seasons[seasonNum] = [];
          seasons[seasonNum].push(s);
        }
        else if (s.season_number !== undefined && s.number !== undefined) {
          const seasonNum = s.season_number;
          if (!seasons[seasonNum]) seasons[seasonNum] = [];
          seasons[seasonNum].push({ ...s, episode: s.number });
        }
      });
      const nums = Object.keys(seasons)
        .map(Number)
        .sort((a, b) => a - b);
      if (nums.length > 0) {
        const first = nums.find((s) => s > 0) || nums[0];
        setActiveSeason(first);
        const eps = seasons[first].sort((a, b) => (a.episode || 0) - (b.episode || 0));
        if (eps.length > 0) setActiveEpisode(eps[0]);
      }
    }
    setLoading(false);
  }

  function handleEpisodeClick(ep) {
    setActiveEpisode(ep);
    document.querySelector(".av-player-shell")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const handleNextEpisode = () => {
    if (!isSeries || activeSeason === null || !activeEpisode) return;
    
    // Check if seasonsMap is built
    const seasonsMap = {};
    if (meta.seasons || meta.videos) {
      (meta.seasons || meta.videos || []).forEach((s) => {
        if (s.season_number !== undefined && s.episodes && s.episodes.length > 0) {
          if (s.season_number > 0) seasonsMap[s.season_number] = s.episodes.map(ep => ({...ep, episode: ep.episode_number, number: ep.episode_number, title: ep.name}));
        } else if ((s.season_number !== undefined || s.season !== undefined) && s.episode_count !== undefined) {
          const sNum = s.season_number !== undefined ? s.season_number : s.season;
          if (sNum > 0) {
            seasonsMap[sNum] = Array.from({length: s.episode_count}, (_, i) => ({episode: i+1, number: i+1, title: `Episode ${i+1}`}));
          }
        } else if (s.season !== undefined && s.episode !== undefined) {
          if (!seasonsMap[s.season]) seasonsMap[s.season] = [];
          seasonsMap[s.season].push(s);
        } else if (s.season_number !== undefined && s.number !== undefined) {
          if (!seasonsMap[s.season_number]) seasonsMap[s.season_number] = [];
          seasonsMap[s.season_number].push({...s, episode: s.number});
        }
      });
    }
    const seasonNumbers = Object.keys(seasonsMap).map(Number).sort((a, b) => a - b);
    
    if (!seasonsMap[activeSeason]) return;
    const sortedEps = seasonsMap[activeSeason].sort((a, b) => (a.episode || 0) - (b.episode || 0));
    const currentIndex = sortedEps.findIndex(ep => ep.episode === activeEpisode.episode);
    
    if (currentIndex >= 0 && currentIndex < sortedEps.length - 1) {
      handleEpisodeClick(sortedEps[currentIndex + 1]);
    } else {
      const nextSeasonIdx = seasonNumbers.findIndex(s => s === activeSeason) + 1;
      if (nextSeasonIdx < seasonNumbers.length) {
        const nextSeason = seasonNumbers[nextSeasonIdx];
        setActiveSeason(nextSeason);
        const nextSeasonEps = seasonsMap[nextSeason].sort((a, b) => (a.episode || 0) - (b.episode || 0));
        if (nextSeasonEps.length > 0) handleEpisodeClick(nextSeasonEps[0]);
      }
    }
  };

  const handlePrevEpisode = () => {
    if (!isSeries || activeSeason === null || !activeEpisode) return;
    
    const seasonsMap = {};
    if (meta.seasons || meta.videos) {
      (meta.seasons || meta.videos || []).forEach((s) => {
        if (s.season_number !== undefined && s.episodes && s.episodes.length > 0) {
          if (s.season_number > 0) seasonsMap[s.season_number] = s.episodes.map(ep => ({...ep, episode: ep.episode_number, number: ep.episode_number, title: ep.name}));
        } else if ((s.season_number !== undefined || s.season !== undefined) && s.episode_count !== undefined) {
          const sNum = s.season_number !== undefined ? s.season_number : s.season;
          if (sNum > 0) {
            seasonsMap[sNum] = Array.from({length: s.episode_count}, (_, i) => ({episode: i+1, number: i+1, title: `Episode ${i+1}`}));
          }
        } else if (s.season !== undefined && s.episode !== undefined) {
          if (!seasonsMap[s.season]) seasonsMap[s.season] = [];
          seasonsMap[s.season].push(s);
        } else if (s.season_number !== undefined && s.number !== undefined) {
          if (!seasonsMap[s.season_number]) seasonsMap[s.season_number] = [];
          seasonsMap[s.season_number].push({...s, episode: s.number});
        }
      });
    }
    const seasonNumbers = Object.keys(seasonsMap).map(Number).sort((a, b) => a - b);

    if (!seasonsMap[activeSeason]) return;
    const sortedEps = seasonsMap[activeSeason].sort((a, b) => (a.episode || 0) - (b.episode || 0));
    const currentIndex = sortedEps.findIndex(ep => ep.episode === activeEpisode.episode);
    
    if (currentIndex > 0) {
      handleEpisodeClick(sortedEps[currentIndex - 1]);
    } else {
      const prevSeasonIdx = seasonNumbers.findIndex(s => s === activeSeason) - 1;
      if (prevSeasonIdx >= 0) {
        const prevSeason = seasonNumbers[prevSeasonIdx];
        setActiveSeason(prevSeason);
        const prevSeasonEps = seasonsMap[prevSeason].sort((a, b) => (a.episode || 0) - (b.episode || 0));
        if (prevSeasonEps.length > 0) handleEpisodeClick(prevSeasonEps[prevSeasonEps.length - 1]);
      }
    }
  };

  if (loading)
    return (
      <div className="watch-loading-container">
        <div className="spinner" />
        <p>Loading media credentials...</p>
      </div>
    );
  if (!meta || meta.blocked)
    return (
      <div className="watch-error-container">
        <AlertTriangle size={48} className="error-icon" />
        <h2>{meta?.blocked ? 'Blocked for Kids Profile' : 'Failed to Load Media'}</h2>
        {meta?.blocked && <p>This title is above the selected Kids 0-12 age rating. Switch to an Adults profile to watch it.</p>}
        <Link to="/dramas-movies" className="btn-back">
          <ArrowLeft size={16} /> Back
        </Link>
      </div>
    );

  const seasonsMap = {};
  if (isSeries && (meta.seasons || meta.videos)) {
    (meta.seasons || meta.videos || []).forEach((s) => {
      if (s.season_number !== undefined && s.episodes && s.episodes.length > 0) {
        const seasonNum = s.season_number;
        if (seasonNum > 0) {
          seasonsMap[seasonNum] = s.episodes.map((ep) => ({
            ...ep,
            episode: ep.episode_number,
            number: ep.episode_number,
            title: ep.name || `Episode ${ep.episode_number}`,
            thumbnail: ep.still_path ? `https://image.tmdb.org/t/p/w780${ep.still_path}` : null
          }));
        }
      }
      else if ((s.season_number !== undefined || s.season !== undefined) && s.episode_count !== undefined) {
        const seasonNum = s.season_number !== undefined ? s.season_number : s.season;
        if (seasonNum > 0) {
          const epCount = s.episode_count;
          seasonsMap[seasonNum] = [];
          for (let i = 1; i <= epCount; i++) {
            seasonsMap[seasonNum].push({
              episode: i,
              number: i,
              title: `Episode ${i}`,
            });
          }
        }
      } 
      else if (s.season !== undefined && s.episode !== undefined) {
        const seasonNum = s.season;
        if (!seasonsMap[seasonNum]) seasonsMap[seasonNum] = [];
        seasonsMap[seasonNum].push(s);
      }
      else if (s.season_number !== undefined && s.number !== undefined) {
        const seasonNum = s.season_number;
        if (!seasonsMap[seasonNum]) seasonsMap[seasonNum] = [];
        seasonsMap[seasonNum].push({ ...s, episode: s.number });
      }
    });
  }
  const seasonNumbers = Object.keys(seasonsMap)
    .map(Number)
    .sort((a, b) => a - b);

  const sNum = activeSeason || 1;
  const eNum = getEpisodeNumber(activeEpisode);
  const mediaTitle = meta.name || meta.title || "Unknown";
  const posterUrl = meta.poster || (meta.poster_path ? `https://image.tmdb.org/t/p/w500${meta.poster_path}` : "");
  const bannerUrl = meta.background || meta.backdrop_path ? `https://image.tmdb.org/t/p/original${meta.backdrop_path}` : posterUrl;

  return (
    <div className="new-player-container">
      {/* ── Hero Banner ── */}
      <div className="detail-hero-v2">
        <img
          className="detail-banner-v2"
          src={bannerUrl}
          alt="Media cover"
        />
        <div className="detail-hero-overlay-v2" />

        <div className="detail-hero-content-v2">
          <img
            className="detail-poster-v2"
            src={posterUrl}
            alt={mediaTitle}
          />
          <div className="detail-info-v2">
            <h1 className="detail-title-v2">
              {mediaTitle}
              <small style={{ fontSize: '0.6em', marginLeft: '0.5rem', color: 'var(--text-secondary)' }}>
                watching in anime vault
              </small>
            </h1>
            <div className="detail-meta-v2">
              {meta.imdbRating && <span className="score"><Star size={16} fill="currentColor" /> {meta.imdbRating}</span>}
              <span><Tv size={16} /> {isSeries ? "TV SERIES" : "MOVIE"}</span>
              {meta.runtime && <span><Clock size={16} /> {meta.runtime}</span>}
              {meta.releaseInfo && <span><Calendar size={16} /> {meta.releaseInfo}</span>}
            </div>
            <div className="detail-actions-v2">
              <button
                className="btn-play-v2"
                onClick={() => {
                  document.querySelector(".av-player-shell")?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
              >
                <Play size={20} fill="currentColor" /> Watch Now
              </button>
              <button 
                className="btn-info-v2"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  color: isLiked(id, type) ? '#ff1a75' : 'var(--text-secondary)',
                  borderColor: isLiked(id, type) ? '#ff1a75' : 'var(--glass-border)',
                  background: isLiked(id, type) ? 'rgba(255,26,117,0.1)' : 'var(--glass)',
                  boxShadow: isLiked(id, type) ? '0 0 10px rgba(255,26,117,0.2)' : 'none',
                  transition: 'all 0.2s ease', cursor: 'pointer'
                }}
                onClick={() => toggleLike(id, type, mediaTitle, posterUrl)}
              >
                <Heart size={20} fill={isLiked(id, type) ? '#ff1a75' : 'none'} /> 
                {isLiked(id, type) ? 'Favorited' : 'Add to Collection'}
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
            {!currentEmbedUrl ? (
              <div className="video-player-error">
                <AlertTriangle size={48} className="spin" />
                <p>No streams available.</p>
              </div>
            ) : (
              <VideoPlayer
                sources={[]}
                poster={posterUrl}
                title={isSeries && activeEpisode ? `S${activeSeason} E${getEpisodeNumber(activeEpisode)}` : mediaTitle}
                key={currentEmbedUrl || activeEpisode?.id}
                embedUrl={currentEmbedUrl}
                isZen={false}
                onNextEpisode={isSeries ? handleNextEpisode : undefined}
                onPrevEpisode={isSeries ? handlePrevEpisode : undefined}
              />
            )}
          </div>

          {/* ── Server Selection Bar ── */}
          <div className="player-lang-bar">
            {PLAYER_SOURCES.map((src) => (
              <button
                key={src.id}
                className={`lang-btn-v2 ${activeSourceId === src.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveSourceId(src.id);
                  setIframeLoaded(false);
                }}
              >
                <Server size={14} />
                {src.label}
              </button>
            ))}
          </div>

          {/* ── Tabs Navigation ── */}
          <div className="new-player-tabs-nav">
            {isSeries && (
              <button className={`tab-btn ${activeTab === 'episodes' ? 'active' : ''}`} onClick={() => setActiveTab('episodes')}>Episodes</button>
            )}
            <button className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`} onClick={() => setActiveTab('info')}>Info</button>
            <button className={`tab-btn ${activeTab === 'community' ? 'active' : ''}`} onClick={() => setActiveTab('community')}>Community</button>
          </div>

          {/* ── Tab Content ── */}
          <div className="new-player-tab-content">
            {isSeries && activeTab === 'episodes' && (
              <div className="mobile-episodes-only">
                <div className="ep-page-selector" style={{ marginBottom: "1rem" }}>
                  {seasonNumbers.map((sNum) => (
                    <button
                      key={sNum}
                      className={`ep-page-btn ${activeSeason === sNum ? 'active' : ''}`}
                      onClick={() => {
                        setActiveSeason(sNum);
                        const sortedEps = seasonsMap[sNum].sort((a, b) => (a.episode || 0) - (b.episode || 0));
                        if (sortedEps.length > 0) setActiveEpisode(sortedEps[0]);
                      }}
                    >
                      Season {sNum === 0 ? "Specials" : sNum}
                    </button>
                  ))}
                </div>
                <div className="episodes-container-v2">
                  {seasonsMap[activeSeason] && seasonsMap[activeSeason].length > 0 ? (
                    <div className="rich-episodes-list">
                      {seasonsMap[activeSeason]
                        .sort((a, b) => (a.episode || 0) - (b.episode || 0))
                        .map((ep) => {
                          const isActive = activeEpisode?.episode === ep.episode;
                          return (
                            <button
                              key={ep.id || ep.episode}
                              className={`rich-episode-card ${isActive ? 'active' : ''}`}
                              onClick={() => handleEpisodeClick(ep)}
                            >
                              <div className="ep-card-img">
                                <img 
                                  src={ep.thumbnail || `https://episodes.metahub.space/${id}/${activeSeason}/${ep.episode}/w780.jpg`}
                                  alt={ep.title || `E${ep.episode}`} 
                                  onError={(e) => { e.target.src = posterUrl; }}
                                />
                                <div className="ep-card-overlay">
                                  <PlayCircle size={24} className="play-icon" />
                                </div>
                              </div>
                              <div className="ep-card-info">
                                <span className="ep-card-number">Episode {ep.episode}</span>
                                <span className="ep-card-title" title={ep.title || `Episode ${ep.episode}`}>{ep.title || `Episode ${ep.episode}`}</span>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  ) : (
                    <p>No episodes available for this season.</p>
                  )}
                </div>
              </div>
            )}
            
            {activeTab === 'info' && (
              <div className="info-tab-content">
                <div className="details-section-v2">
                  <h2>Synopsis</h2>
                  <p>{stripHtml(meta.description)}</p>
                </div>
                {meta.genres?.length > 0 && (
                  <div className="details-section-v2">
                    <h2>Genres</h2>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {meta.genres.map(g => (
                        <span key={g} style={{
                          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                          padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem'
                        }}>
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="sidebar-block-v2">
                  <h3>Details</h3>
                  <div className="info-list-v2">
                    <div className="info-row-v2">
                      <span className="info-label-v2">Type</span>
                      <span className="info-value-v2">{isSeries ? "TV SERIES" : "MOVIE"}</span>
                    </div>
                    {meta.releaseInfo && (
                      <div className="info-row-v2">
                        <span className="info-label-v2">Release</span>
                        <span className="info-value-v2">{meta.releaseInfo}</span>
                      </div>
                    )}
                    {meta.runtime && (
                      <div className="info-row-v2">
                        <span className="info-label-v2">Runtime</span>
                        <span className="info-value-v2">{meta.runtime}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'community' && (
              <CommentsSection mediaId={id} />
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Desktop Sidebar (Only for Series) */}
        {isSeries && (
          <aside className="new-player-sidebar">
            <div className="desktop-episodes-container details-section-v2">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h2 style={{ margin: 0 }}>Episodes</h2>
              </div>
              <div className="ep-page-selector" style={{ marginBottom: "1rem" }}>
                {seasonNumbers.map((sNum) => (
                  <button
                    key={sNum}
                    className={`ep-page-btn ${activeSeason === sNum ? 'active' : ''}`}
                    onClick={() => {
                      setActiveSeason(sNum);
                      const sortedEps = seasonsMap[sNum].sort((a, b) => (a.episode || 0) - (b.episode || 0));
                      if (sortedEps.length > 0) setActiveEpisode(sortedEps[0]);
                    }}
                  >
                    Season {sNum === 0 ? "Specials" : sNum}
                  </button>
                ))}
              </div>
              <div className="episodes-container-v2">
                {seasonsMap[activeSeason] && seasonsMap[activeSeason].length > 0 ? (
                  <div className="rich-episodes-list">
                    {seasonsMap[activeSeason]
                      .sort((a, b) => (a.episode || 0) - (b.episode || 0))
                      .map((ep) => {
                        const isActive = activeEpisode?.episode === ep.episode;
                        return (
                          <button
                            key={ep.id || ep.episode}
                            className={`rich-episode-card ${isActive ? 'active' : ''}`}
                            onClick={() => handleEpisodeClick(ep)}
                          >
                            <div className="ep-card-img">
                              <img 
                                src={ep.thumbnail || `https://episodes.metahub.space/${id}/${activeSeason}/${ep.episode}/w780.jpg`}
                                alt={ep.title || `E${ep.episode}`} 
                                onError={(e) => { e.target.src = posterUrl; }}
                              />
                              <div className="ep-card-overlay">
                                <PlayCircle size={24} className="play-icon" />
                              </div>
                            </div>
                            <div className="ep-card-info">
                              <span className="ep-card-number">Episode {ep.episode}</span>
                              <span className="ep-card-title" title={ep.title || `Episode ${ep.episode}`}>{ep.title || `Episode ${ep.episode}`}</span>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                ) : (
                  <p>No episodes available for this season.</p>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

export default MovieWatch;
