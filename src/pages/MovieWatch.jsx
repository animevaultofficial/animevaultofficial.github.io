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
  AlertTriangle,
  Heart,
  Gamepad2,
  Server,
} from "lucide-react";
import { fetchMediaMeta } from "../api/movies";
import CommentsSection from "../components/CommentsSection";
import { useUser } from "../api/UserContext";
import electronBridge from "../utils/electronBridge";
import { FocusableButton, FocusableLink } from "../components/FocusableWrapper";
import { PLAYER_SOURCES, getSourceUrl } from "../utils/playerSources";
import { storage } from "../utils/storage";

// Helper to get episode number
function getEpisodeNumber(episode) {
  return episode?.episode || episode?.number || 1;
}

function MovieWatch() {
  const { type, id } = useParams();
  const { user, addToHistory, updateContinueWatching, toggleLike, isLiked } = useUser();
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSeason, setActiveSeason] = useState(null);
  const [activeEpisode, setActiveEpisode] = useState(null);
  const [activeSourceId, setActiveSourceId] = useState(() => storage.get("playerSource") || PLAYER_SOURCES[0].id);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [showFallbackHint, setShowFallbackHint] = useState(false);
  const [accentColor] = useState(() => storage.get("accentColor") || "ff1a75");
  const [playing, setPlaying] = useState(false);
  const webviewRef = useRef(null);

  // Check if we're in Electron
  const isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined;

  // Load video metadata and set initial player source
  useEffect(() => {
    loadMeta();
  }, [id, type]);

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
      const isSeries = type === "tv" || type === "series";
      electronBridge.setAnimeActivity({
        title,
        episode: isSeries ? getEpisodeNumber(activeEpisode) : null,
        coverUrl: meta.poster || `https://live.metahub.space/poster/medium/${id}/img`,
        url: meta.imdb_id ? `https://www.imdb.com/title/${meta.imdb_id}` : "",
      });
    }
    return () => electronBridge.clearAnimeActivity();
  }, [meta, activeEpisode, type, id]);

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
    setMeta(data);
    // Initialise season/episode for series
    if (data && (type === "tv" || type === "series")) {
      const seasons = {};
      (data.seasons || data.videos || []).forEach((s) => {
        // Case 1: It's a season object with actual episodes array
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
        // Case 2: It's a season object with episode_count
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
        // Case 3: It's an individual episode
        else if (s.season !== undefined && s.episode !== undefined) {
          const seasonNum = s.season;
          if (!seasons[seasonNum]) seasons[seasonNum] = [];
          seasons[seasonNum].push(s);
        }
        // Case 4: It's an individual episode with season_number and number
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
    document.getElementById("watch-player-iframe")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  if (loading)
    return (
      <div className="watch-loading-container">
        <div className="spinner" />
        <p>Loading media credentials...</p>
      </div>
    );
  if (!meta)
    return (
      <div className="watch-error-container">
        <AlertTriangle size={48} className="error-icon" />
        <h2>Failed to Load Media</h2>
        <Link to="/dramas-movies" className="btn-back">
          <ArrowLeft size={16} /> Back
        </Link>
      </div>
    );

  const isSeries = type === "tv" || type === "series";
  const seasonsMap = {};
  if (isSeries && (meta.seasons || meta.videos)) {
    (meta.seasons || meta.videos || []).forEach((s) => {
      // Case 1: It's a season object with actual episodes array
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
      // Case 2: It's a season object with episode_count
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
      // Case 3: It's an individual episode
      else if (s.season !== undefined && s.episode !== undefined) {
        const seasonNum = s.season;
        if (!seasonsMap[seasonNum]) seasonsMap[seasonNum] = [];
        seasonsMap[seasonNum].push(s);
      }
      // Case 4: It's an individual episode with season_number and number
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

  return (
    <div className="watch-detail-container">
      <div className="watch-hero-bg" style={{ backgroundImage: `url(${meta.background})` }}>
        <div className="watch-hero-overlay" />
      </div>
      <div className="watch-main-layout">
        <FocusableLink to="/dramas-movies" className="watch-back-link">
          <ArrowLeft size={18} /> Back to Movies & Dramas
        </FocusableLink>
        <div className="watch-meta-showcase">
          <div className="showcase-poster">
            <img
              src={meta.poster || `https://live.metahub.space/poster/medium/${id}/img`}
              alt={meta.name}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?q=80&w=300&auto=format&fit=crop";
              }}
            />
          </div>
          <div className="showcase-details">
            <div className="showcase-badges">
              {meta.imdbRating && (
                <span className="badge-rating">
                  <Star size={14} fill="currentColor" /> {meta.imdbRating}
                </span>
              )}
              {meta.runtime && (
                <span className="badge-runtime">
                  <Clock size={14} /> {meta.runtime}
                </span>
              )}
              {meta.releaseInfo && (
                <span className="badge-year">
                  <Calendar size={14} /> {meta.releaseInfo}
                </span>
              )}
              <span className="badge-type">{isSeries ? "TV SERIES" : "MOVIE"}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", marginBottom: "12px" }}>
              <h1 style={{ margin: 0 }}>{meta.name}</h1>
              <FocusableButton
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 14px",
                  fontSize: "0.8rem",
                  fontWeight: "800",
                  borderRadius: "10px",
                  color: isLiked(id, type) ? "#ff1a75" : "var(--text-secondary)",
                  borderColor: isLiked(id, type) ? "#ff1a75" : "var(--glass-border)",
                  background: isLiked(id, type) ? "rgba(255, 26, 117, 0.1)" : "var(--glass)",
                  border: "1px solid",
                  boxShadow: isLiked(id, type) ? "0 0 10px rgba(255, 26, 117, 0.2)" : "none",
                  transition: "all 0.2s ease",
                  cursor: "pointer",
                }}
                onClick={() => {
                  const poster = meta.poster_path ? `https://image.tmdb.org/t/p/w500${meta.poster_path}` : "";
                  toggleLike(id, type, meta.name || meta.title, poster);
                }}
              >
                <Heart size={16} fill={isLiked(id, type) ? "#ff1a75" : "none"} />
                {isLiked(id, type) ? "Liked" : "Like"}
              </FocusableButton>
            </div>
            {meta.genres?.length > 0 && (
              <div className="showcase-genres" style={{ marginTop: 0 }}>
                {meta.genres.map((g) => (
                  <span key={g} className="genre-pill">{g}</span>
                ))}
              </div>
            )}
            <p className="showcase-synopsis">{meta.description}</p>
          </div>
        </div>
        <div className="watch-player-wrapper">
          <div className="watch-player-header" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Film size={20} className="glow-icon" />
              <h2 style={{ fontSize: "1.1rem" }}>
                Streaming: {isSeries && activeEpisode ? `S${activeSeason} E${getEpisodeNumber(activeEpisode)}` : meta.name}
              </h2>
            </div>
            <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
              {PLAYER_SOURCES.map((src) => (
                <FocusableButton
                  key={src.id}
                  style={{
                    padding: "6px 12px",
                    fontSize: "0.8rem",
                    borderRadius: "6px",
                    background: activeSourceId === src.id ? "#ff1a75" : "var(--glass)",
                    color: activeSourceId === src.id ? "#fff" : "var(--text-secondary)",
                    border: "1px solid",
                    borderColor: activeSourceId === src.id ? "#ff1a75" : "var(--glass-border)",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.2s ease"
                  }}
                  onClick={() => {
                    setActiveSourceId(src.id);
                    setIframeLoaded(false);
                  }}
                >
                  <Server size={14} style={{ display: "inline-block", marginRight: "6px", verticalAlign: "middle" }} />
                  {src.label}
                </FocusableButton>
              ))}
            </div>
          </div>
          <div className="player-wrap" style={{ marginTop: "12px" }}>
            {currentEmbedUrl ? (
              <>
                {!iframeLoaded && (
                  <div className="player-loading-overlay" style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
                    <div className="spinner" />
                    <p style={{ color: "rgba(255,255,255,0.5)", marginTop: "12px" }}>Loading {PLAYER_SOURCES.find(s => s.id === activeSourceId)?.label}...</p>
                  </div>
                )}
                {isElectron ? (
                  <webview
                    ref={webviewRef}
                    id="watch-player-webview"
                    key={currentEmbedUrl}
                    src={currentEmbedUrl}
                    partition="persist:player"
                    allowpopups="false"
                    title={meta?.name || meta?.title}
                    allowfullscreen
                    style={{
                      width: "100%",
                      height: "100%",
                      position: "absolute",
                      inset: 0,
                      zIndex: 1,
                      border: "none",
                    }}
                    onDidFinishLoad={() => setIframeLoaded(true)}
                    onDidFailLoad={() => setIframeLoaded(true)}
                  />
                ) : (
                  <iframe
                    id="watch-player-iframe"
                    key={currentEmbedUrl}
                    src={currentEmbedUrl}
                    title={meta?.name || meta?.title}
                    allowFullScreen
                    frameBorder="0"
                    allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                    style={{ width: "100%", height: "100%", position: "absolute", inset: 0, zIndex: 1 }}
                    onLoad={() => setIframeLoaded(true)}
                  />
                )}
              </>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "rgba(255,255,255,0.3)" }}>
                <p>No streams available.</p>
              </div>
            )}
          </div>
          <div className={`player-help-banner ${showFallbackHint ? "needs-attention" : ""}`}>
            <div>
              <strong>{showFallbackHint ? "Still loading?" : "Playback tip"}</strong>
              <p>Use your remote arrows or keyboard to control playback. If the stream stalls, reload the page.</p>
            </div>
          </div>
          {isSeries && seasonNumbers.length > 0 && (
            <div className="watch-series-selector">
              <div className="season-tabs-row">
                {seasonNumbers.map((sNum) => (
                  <FocusableButton
                    key={sNum}
                    className={`season-tab-btn ${activeSeason === sNum ? "active" : ""}`}
                    onClick={() => {
                      setActiveSeason(sNum);
                      const sortedEps = seasonsMap[sNum].sort((a, b) => (a.episode || 0) - (b.episode || 0));
                      if (sortedEps.length > 0) setActiveEpisode(sortedEps[0]);
                    }}
                  >
                    Season {sNum === 0 ? "Specials" : sNum}
                  </FocusableButton>
                ))}
              </div>
              <div className="tv-selector-hint">
                <Gamepad2 size={16} /> TV mode: focus a card and use arrow keys, Enter, or OK to select episodes.
              </div>
              <div className="episode-selector-grid">
                {activeSeason !== null &&
                  seasonsMap[activeSeason]
                    ?.sort((a, b) => (a.episode || 0) - (b.episode || 0))
                    .map((ep) => {
                      const isActive = activeEpisode?.episode === ep.episode;
                      return (
                        <FocusableButton
                          key={ep.id || ep.episode}
                          className={`episode-card-btn tv-focus-card ${isActive ? "active" : ""}`}
                          aria-pressed={isActive}
                          onClick={() => handleEpisodeClick(ep)}
                        >
                          <div className="ep-card-thumb">
                            <img
                              src={ep.thumbnail || `https://episodes.metahub.space/${id}/${activeSeason}/${ep.episode}/w780.jpg`}
                              alt={ep.title || `E${ep.episode}`}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=300&auto=format&fit=crop";
                              }}
                            />
                            <div className="ep-card-overlay">
                              <Play fill="white" size={16} />
                            </div>
                            <span className="ep-card-num">EP {ep.episode}</span>
                          </div>
                          <div className="ep-card-details">
                            <h4>{ep.title || `Episode ${ep.episode}`}</h4>
                          </div>
                        </FocusableButton>
                      );
                    })}
              </div>
            </div>
          )}
          <CommentsSection mediaId={id} />
        </div>
      </div>
    </div>
  );
}

export default MovieWatch;
