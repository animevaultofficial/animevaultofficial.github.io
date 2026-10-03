import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  Plus,
  Share2,
  Lock,
  Globe,
  Edit,
  Trash2,
  Copy,
  User,
  Check,
  X,
  Shuffle,
  Search,
  Loader2,
  Play,
  Calendar,
  Star,
  Info,
  Sparkles
} from 'lucide-react';
import {
  fetchAllCollections,
  fetchUserCollections,
  fetchTrendingCollections,
  fetchCollectionById,
  fetchCollectionItems,
  createCollection,
  updateCollection,
  deleteCollection,
  addItemToCollection,
  removeItemFromCollection,
  toggleLikeCollection,
  toggleFollowCollection,
  duplicateCollection
} from '../api/db';
import {
  searchAnime,
  fetchTrendingMedia,
  fetchAnimeByIds
} from '../api/anilist';
import { useUser } from '../api/UserContext';

// Featured slides for flashcards
const CLASSROOM_OF_THE_ELITE_BANNER =
  "https://occ-0-8407-2219.1.nflxso.net/dnm/api/v6/MgXQGyNr1xbI8tJSYiMWv5kXg5g/AAAABbu2mrfgMEMATRppz3WvutNHbUSBM3rWWq3nIBWGk3n1DgG9GVI1yX5gkfdDK73a0_L0SVQnfKp2HEIMdC9KeAXdmZB7VjTqO8EI0Pyv3C8DvfJtXEYE1mXA9g.jpg?r=6ae";

const FEATURED_SLIDE_FALLBACKS = [
  {
    id: 180745,
    idMal: 54968,
    title: {
      english: "Classroom of the Elite Season 3",
      romaji: "Youkoso Jitsuryoku Shijou Shugi no Kyoushitsu e 3rd Season",
      native: "ようこそ実力至上主義の教室へ 3rd Season",
    },
    description:
      "Class D returns to a brutal merit-based school system where alliances, betrayals, and psychological tests decide who can climb to the top.",
    seasonYear: 2024,
    averageScore: 82,
    format: "TV",
    bannerImage: CLASSROOM_OF_THE_ELITE_BANNER,
    coverImage: {
      extraLarge:
        "https://m.media-amazon.com/images/M/MV5BMDg3MGVhNWUtYTQ2NS00ZDdiLTg5MTMtZmM5MjUzN2IxN2I4XkEyXkFqcGc@._V1_.jpg",
    },
  },
  {
    id: 5114,
    idMal: 5114,
    title: { english: "Fullmetal Alchemist: Brotherhood" },
    description:
      "Two brothers search for the Philosopher's Stone after a forbidden ritual changes their lives forever.",
    seasonYear: 2009,
    averageScore: 91,
    format: "TV",
    bannerImage:
      "https://s4.anilist.co/file/anilistcdn/media/anime/banner/5114.jpg",
  },
  {
    id: 1535,
    idMal: 1535,
    title: { english: "Death Note" },
    description:
      "A genius student discovers a notebook with deadly power and begins a cat-and-mouse war against the world's greatest detective.",
    seasonYear: 2006,
    averageScore: 84,
    format: "TV",
    bannerImage:
      "https://s4.anilist.co/file/anilistcdn/media/anime/banner/1535.jpg",
  },
];

const FEATURED_SLIDE_IDS = FEATURED_SLIDE_FALLBACKS.map((anime) => anime.id);

// Helper functions
function getTitle(anime) {
  return anime?.title?.english || anime?.title?.romaji || anime?.title?.native || "Unknown Title";
}
function getImage(anime) {
  return anime?.coverImage?.extraLarge || anime?.coverImage?.large || anime?.coverImage?.medium;
}
function isClassroomOfTheElite(anime) {
  const title = getTitle(anime).toLowerCase();
  return (
    title.includes("classroom of the elite") ||
    title.includes("youkoso jitsuryoku")
  );
}
function getBanner(anime) {
  if (isClassroomOfTheElite(anime)) return CLASSROOM_OF_THE_ELITE_BANNER;
  return anime?.bannerImage || getImage(anime);
}
function getDescription(anime) {
  return (
    anime?.description?.replace(/<[^>]+>/g, "") ||
    "No description available."
  );
}
function mergeFeaturedAnime(fallback, fetched) {
  if (!fetched) return fallback;
  return {
    ...fallback,
    ...fetched,
    title: fetched.title || fallback.title,
    description: fallback.description || fetched.description,
    bannerImage: fallback.bannerImage || fetched.bannerImage,
    coverImage: fetched.coverImage || fallback.coverImage,
    seasonYear: fetched.seasonYear || fallback.seasonYear,
    averageScore: fetched.averageScore || fallback.averageScore,
    format: fetched.format || fallback.format,
  };
}

const DashboardView = ({ user, onGoToMyCollections, onGoToCollection, onGoToCommunity, onGoToMakeCollection }) => {
  const [trending, setTrending] = useState([]);
  const [myCollections, setMyCollections] = useState([]);
  const [featuredSlides, setFeaturedSlides] = useState([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      const [trendingColls, myColls, featured] = await Promise.all([
        fetchTrendingCollections(user?.id),
        user ? fetchUserCollections(user.id) : [],
        fetchAnimeByIds(FEATURED_SLIDE_IDS)
      ]);
      
      const orderedFeatured = FEATURED_SLIDE_FALLBACKS.map((fallback) => {
        const fetched = featured.find(
          (anime) => Number(anime.id) === Number(fallback.id),
        );
        return mergeFeaturedAnime(fallback, fetched);
      });
      
      setTrending(trendingColls);
      setMyCollections(myColls);
      setFeaturedSlides(orderedFeatured);
      setLoading(false);
    };
    loadData();
  }, [user]);
  
  // Slideshow interval timer
  useEffect(() => {
    if (featuredSlides.length === 0) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % Math.min(5, featuredSlides.length));
    }, 6000);
    return () => clearInterval(interval);
  }, [featuredSlides]);

  const featured = trending[0] || myCollections[0];

  if (loading) {
    return (
      <div className="page-container" style={{ padding: '2rem', textAlign: 'center' }}>
        Loading...
      </div>
    );
  }

  return (
    <div className="page-container" style={{ padding: '2rem' }}>
      {/* Hero Flashcard Carousel */}
      {featuredSlides.length > 0 && (
        <div style={{ marginBottom: '3rem' }}>
          <div
            className="hero-v2 hero-carousel-v2 anime-hero-carousel"
            style={{ position: "relative", overflow: "hidden", height: "520px", borderRadius: "20px" }}
          >
            {featuredSlides.slice(0, 5).map((anime, index) => {
              const isActive = index === activeSlide;
              return (
                <div
                  key={anime.id}
                  className={`carousel-slide ${isActive ? "active" : ""}`}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    opacity: isActive ? 1 : 0,
                    visibility: isActive ? "visible" : "hidden",
                    transition:
                      "opacity 0.8s ease-in-out, visibility 0.8s ease-in-out",
                    zIndex: isActive ? 2 : 1,
                  }}
                >
                  <div
                    className="hero-img-wrapper"
                    style={{ width: "100%", height: "100%", zIndex: 0 }}
                  >
                    <img
                      src={getBanner(anime)}
                      alt={getTitle(anime)}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                    <div className="hero-overlay-v2" />
                  </div>
                  <div
                    className="hero-content-v2"
                    style={{ position: "relative", zIndex: 5 }}
                  >
                    <div
                      className="hero-info-v2"
                      style={{
                        transform: isActive ? "translateY(0)" : "translateY(20px)",
                        opacity: isActive ? 1 : 0,
                        transition:
                          "all 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s",
                      }}
                    >
                      <span
                        className="hero-rank"
                        style={{
                          color: "var(--brand-color)",
                          background: "rgba(0,0,0,0.6)",
                          border: "1px solid var(--brand-color)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "4px 12px",
                          borderRadius: "20px",
                          fontSize: "0.75rem",
                          fontWeight: "bold",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          width: "fit-content",
                        }}
                      >
                        <Sparkles size={14} /> #{index + 1} Trending Classic
                      </span>
                      <h1 className="hero-title-v2" style={{ fontSize: "2.5rem", margin: "1rem 0" }}>{getTitle(anime)}</h1>
                      <div className="hero-meta-v2" style={{ display: "flex", gap: "1.5rem", marginBottom: "1rem" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Calendar size={16} /> {anime?.seasonYear}
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Star size={16} /> {anime?.averageScore}%
                        </span>
                        <span>{anime?.format}</span>
                      </div>
                      <p className="hero-desc-v2" style={{ fontSize: "1rem", color: "#cfc2d6", maxWidth: "600px", marginBottom: "1.5rem" }}>
                        {getDescription(anime).slice(0, 220)}...
                      </p>
                      <div className="hero-btns-v2" style={{ display: "flex", gap: "1rem" }}>
                        <button
                          className="btn-play-v2"
                          onClick={() => navigate(`/anime/${anime.id}`)}
                          style={{
                            background: 'linear-gradient(135deg, #ff1a75 0%, #ff4d94 100%)',
                            border: 'none',
                            color: '#fff',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '10px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            boxShadow: '0 4px 15px rgba(255,26,117,0.4)'
                          }}
                        >
                          <Play size={20} fill="black" /> Watch Now
                        </button>
                        <button
                          className="btn-info-v2"
                          onClick={() => navigate(`/anime/${anime.id}`)}
                          style={{
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            color: '#fff',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '10px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}
                        >
                          <Info size={20} /> Details
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Carousel Slide Indicators / Dots */}
            <div
              className="carousel-dots"
              style={{
                position: "absolute",
                bottom: "25px",
                right: "40px",
                zIndex: 10,
                display: "flex",
                gap: "8px",
              }}
            >
              {featuredSlides.slice(0, 5).map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveSlide(index)}
                  style={{
                    width: index === activeSlide ? "30px" : "10px",
                    height: "10px",
                    borderRadius: "5px",
                    border: "none",
                    background:
                      index === activeSlide
                        ? "var(--brand-color)"
                        : "rgba(255, 255, 255, 0.3)",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    boxShadow:
                      index === activeSlide
                        ? "0 0 10px var(--brand-color)"
                        : "none",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '2rem', marginBottom: '3rem' }}>
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '1px solid rgba(255,26,117,0.3)',
          boxShadow: '0 0 20px rgba(255,26,117,0.2)'
        }}>
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.1rem' }}>Collections Dashboard</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ff1a75' }}>{myCollections.length}</div>
              <div style={{ fontSize: '0.85rem', color: '#cfc2d6' }}>Collections Created</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ff1a75' }}>{myCollections.reduce((acc, c) => acc + (c.count || 0), 0)}</div>
              <div style={{ fontSize: '0.85rem', color: '#cfc2d6' }}>Anime Saved</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ff1a75' }}>{myCollections.reduce((acc, c) => acc + (c.followers_count || 0), 0)}</div>
              <div style={{ fontSize: '0.85rem', color: '#cfc2d6' }}>Followers</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ff1a75' }}>0</div>
              <div style={{ fontSize: '0.85rem', color: '#cfc2d6' }}>Following</div>
            </div>
          </div>
        </div>

        {featured && (
          <div style={{ position: 'relative', borderRadius: '20px', overflow: 'hidden', height: '280px', cursor: 'pointer' }} onClick={() => onGoToCollection(featured)}>
            {featured.cover && <img
              src={featured.cover}
              alt={featured.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.6)' }}
            />}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(90deg, rgba(3,15,22,0.95) 0%, rgba(3,15,22,0.6) 50%, rgba(3,15,22,0.3) 100%)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: '2.5rem'
            }}>
              <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem' }}>{featured.title}</h2>
              <p style={{ margin: '0 0 1.5rem 0', color: '#cfc2d6', maxWidth: '500px' }}>{featured.description}</p>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button onClick={(e) => { e.stopPropagation(); onGoToCollection(featured); }} style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '10px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}>
                  View Collection
                </button>
                <button onClick={(e) => { e.stopPropagation(); }} style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '10px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <Shuffle size={18} /> Shuffle Watch
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.5rem', fontWeight: '700' }}>Trending Collections</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
          {trending.map(c => (
            <div key={c.id} style={{
              borderRadius: '14px',
              overflow: 'hidden',
              cursor: 'pointer',
              transition: 'transform 0.3s ease'
            }}
                 onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-6px)'}
                 onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                 onClick={() => onGoToCollection(c)}
            >
              {c.cover && <img src={c.cover} alt={c.title} style={{ width: '100%', height: '180px', objectFit: 'cover' }} />}
              <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>{c.title}</h4>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: '#cfc2d6' }}>
                  <span>❤️ {c.likes_count || 0}</span>
                  <span>👥 {c.followers_count || 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700' }}>My Collections</h2>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={onGoToCommunity} style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff',
              padding: '0.6rem 1.25rem',
              borderRadius: '10px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <User size={16} /> View Community
            </button>
            <button onClick={onGoToMakeCollection} style={{
              background: 'linear-gradient(135deg, #ff1a75 0%, #ff4d94 100%)',
              border: 'none',
              color: '#fff',
              padding: '0.6rem 1.25rem',
              borderRadius: '10px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 15px rgba(255,26,117,0.4)'
            }}>
              <Plus size={16} /> Make Collection
            </button>
          </div>
        </div>
        <button
          onClick={onGoToMyCollections}
          style={{
            width: '100%',
            textAlign: 'center',
            padding: '2rem',
            background: 'rgba(255,255,255,0.03)',
            border: '2px dashed rgba(255,255,255,0.2)',
            borderRadius: '16px',
            color: '#cfc2d6',
            fontSize: '1rem',
            cursor: 'pointer'
          }}
        >
          View All My Collections →
        </button>
      </section>
    </div>
  );
};

const CommunityView = ({ user, onBack, onGoToCollection }) => {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const data = await fetchAllCollections(user?.id);
      setCollections(data);
      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) {
    return (
      <div className="page-container" style={{ padding: '2rem', textAlign: 'center' }}>
        Loading...
      </div>
    );
  }

  return (
    <div className="page-container" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: '#cfc2d6', cursor: 'pointer', fontSize: '1rem' }}
        >
          ← Back
        </button>
        <h1 style={{ margin: 0, fontSize: '2rem' }}>Community Collections</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
        {collections.map(c => (
          <div key={c.id} style={{
            borderRadius: '16px',
            overflow: 'hidden',
            cursor: 'pointer',
            border: '1px solid rgba(255,255,255,0.1)',
            transition: 'transform 0.3s ease, border-color 0.3s ease'
          }}
               onMouseEnter={(e) => {
                 e.currentTarget.style.transform = 'translateY(-6px)';
                 e.currentTarget.style.borderColor = 'rgba(255,26,117,0.4)';
               }}
               onMouseLeave={(e) => {
                 e.currentTarget.style.transform = 'translateY(0)';
                 e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
               }}
               onClick={() => onGoToCollection(c)}
          >
            <div style={{ position: 'relative', minHeight: '200px', background: 'linear-gradient(135deg, rgba(255,26,117,.14), rgba(3,15,22,.95))' }}>
              {c.cover && <img src={c.cover} alt={c.title} style={{ width: '100%', height: '200px', objectFit: 'cover' }} />}
              <div style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                padding: '0.25rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: '700',
                background: c.is_private ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)'
              }}>
                {c.is_private ? <Lock size={14} style={{ display: 'inline' }} /> : <Globe size={14} style={{ display: 'inline' }} />}
                {' '}{c.is_private ? 'Private' : 'Public'}
              </div>
            </div>
            <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>{c.title}</h3>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#cfc2d6' }}>
                Created by {c.username}
              </p>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#cfc2d6' }}>
                {c.count || 0} items · {c.followers_count || 0} followers
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const MakeCollectionView = ({ user, onBack, onSave }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [cover, setCover] = useState('');
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [initialAnime, setInitialAnime] = useState([]);
  const searchTimerRef = React.useRef(null);

  // Load initial trending anime
  useEffect(() => {
    const loadInitial = async () => {
      try {
        const trending = await fetchTrendingMedia();
        setInitialAnime(trending || []);
        // Don't auto-select any items initially
        setItems([]);
      } catch (err) {
        console.error('Failed to load initial anime:', err);
      }
    };
    loadInitial();
  }, []);

  const handleSearch = async (q) => {
    if (!q || !q.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      setSearchError('');
      return;
    }
    setSearching(true);
    setSearchError('');
    setHasSearched(true);
    try {
      const results = await searchAnime(q.trim());
      setSearchResults(Array.isArray(results) ? results : []);
    } catch (err) {
      console.error('Search failed:', err);
      setSearchError('Search failed. Please try again.');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchInput = (value) => {
    setSearchQuery(value);
    // Debounce search to avoid hitting AniList rate limits
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    searchTimerRef.current = setTimeout(() => {
      handleSearch(value);
    }, 400);
  };

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  const addAnime = (anime) => {
    if (!anime || anime.id == null) return;
    const alreadyAdded = items.some(i => i.id === anime.id);
    if (alreadyAdded) return;
    // Normalize the anime object to ensure all needed fields are present
    const normalized = {
      id: anime.id,
      title: anime.title || { romaji: 'Unknown Title', english: '', native: '' },
      coverImage: anime.coverImage || {},
      averageScore: anime.averageScore ?? anime.meanScore ?? null,
      status: anime.status || null,
    };
    setItems([...items, normalized]);
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
  };

  const removeItem = (id) => {
    setItems(items.filter(i => i.id !== id));
  };

  const handleSave = async () => {
    if (user && title) {
      const newCollection = await createCollection(user.id, user.username, title, description, cover, isPrivate);
      for (const item of items) {
        await addItemToCollection(
          newCollection.id,
          String(item.id),
          'anime',
          getTitle(item),
          getImage(item),
          item.averageScore,
          item.status
        );
      }
      onSave();
    }
  };

  return (
    <div className="page-container" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: '#cfc2d6', cursor: 'pointer', fontSize: '1rem' }}
        >
          ← Back
        </button>
        <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Make Collection</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '2rem' }}>
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem' }}>Information & Settings</h3>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#cfc2d6' }}>Collection Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title..."
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.05)',
                color: '#fff',
                fontSize: '1rem'
              }}
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#cfc2d6' }}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Describe your collection..."
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.05)',
                color: '#fff',
                fontSize: '1rem',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.9rem', color: '#cfc2d6' }}>Visibility</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '0.9rem' }}>Public</span>
              <div
                onClick={() => setIsPrivate(!isPrivate)}
                style={{
                  width: '60px',
                  height: '30px',
                  borderRadius: '15px',
                  background: isPrivate ? '#ff1a75' : 'rgba(255,255,255,0.2)',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.3s ease'
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: '3px',
                  left: isPrivate ? '33px' : '3px',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: '#fff',
                  transition: 'left 0.3s ease'
                }} />
              </div>
              <span style={{ fontSize: '0.9rem' }}>Private</span>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.9rem', color: '#cfc2d6' }}>Custom Banner</label>
            <div style={{
              border: '2px dashed rgba(255,255,255,0.2)',
              borderRadius: '12px',
              padding: '2.5rem 1rem',
              textAlign: 'center',
              background: 'rgba(255,255,255,0.03)',
              cursor: 'pointer'
            }}>
              <div style={{
                fontSize: '2.5rem',
                marginBottom: '0.75rem',
                background: 'rgba(255,255,255,0.1)',
                width: '60px',
                height: '60px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 0.75rem'
              }}>
                🖼️
              </div>
              <button onClick={() => {
                const url = prompt('Enter banner URL');
                if (url) setCover(url);
              }} style={{
                padding: '0.6rem 1.25rem',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.08)',
                color: '#fff',
                fontWeight: '600',
                cursor: 'pointer'
              }}>
                Upload
              </button>
            </div>
          </div>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '1px solid rgba(255,255,255,0.08)'
        }}>
          <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem' }}>Manage Items</h3>

          {/* Search Bar */}
          <div style={{
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.05)'
          }}>
            {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            <input
              type="text"
              placeholder="Search for anime to add..."
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '1rem',
                outline: 'none'
              }}
            />
          </div>

          {/* Search error */}
          {searchError && (
            <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.3)', borderRadius: '8px', color: '#ff8888', fontSize: '0.85rem' }}>
              {searchError}
            </div>
          )}

          {/* Search Results */}
          {hasSearched && !searching && searchResults.length === 0 && !searchError && (
            <div style={{ marginBottom: '1.5rem', padding: '1.5rem', textAlign: 'center', color: '#cfc2d6', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
              <p style={{ margin: 0 }}>No anime found for "{searchQuery}". Try a different search term.</p>
            </div>
          )}

          {searchResults.length > 0 && (
            <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <h4 style={{ marginBottom: '1rem', color: '#cfc2d6' }}>Search Results ({searchResults.length})</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                {searchResults.map(anime => (
                  <div key={anime.id} style={{ position: 'relative' }}>
                    <div style={{
                      borderRadius: '12px',
                      overflow: 'hidden',
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(255,255,255,0.03)',
                      cursor: 'pointer'
                    }}
                         onClick={() => addAnime(anime)}
                    >
                      {getImage(anime) ? (
                        <img src={getImage(anime)} alt={getTitle(anime)} style={{ width: '100%', height: '160px', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '160px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>No Image</div>
                      )}
                      <div style={{ padding: '0.75rem' }}>
                        <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem' }}>{getTitle(anime)}</h4>
                        <div style={{ fontSize: '0.75rem', color: '#ffc107', fontWeight: '600' }}>⭐ {anime.averageScore || 'N/A'}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => addAnime(anime)}
                      style={{
                        position: 'absolute',
                        top: '0.5rem',
                        right: '0.5rem',
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: 'rgba(255,26,117,0.9)',
                        border: 'none',
                        color: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Added Items */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            {items.map(item => (
              <div key={item.id} style={{ position: 'relative' }}>
                <div style={{
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.03)'
                }}>
                  <img src={getImage(item)} alt={getTitle(item)} style={{ width: '100%', height: '160px', objectFit: 'cover' }} />
                  <div style={{ padding: '0.75rem' }}>
                    <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem' }}>{getTitle(item)}</h4>
                    <div style={{ fontSize: '0.75rem', color: '#ffc107', fontWeight: '600' }}>⭐ {item.averageScore}</div>
                  </div>
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  style={{
                    position: 'absolute',
                    top: '0.5rem',
                    right: '0.5rem',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.8)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'flex-end',
            padding: '1rem',
            background: 'rgba(0,0,0,0.2)',
            borderRadius: '12px',
            margin: '0 -1.5rem -1.5rem -1.5rem'
          }}>
            <button
              onClick={handleSave}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #ff1a75 0%, #ff4d94 100%)',
                color: '#fff',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 15px rgba(255,26,117,0.4)'
              }}
            >
              <Check size={16} /> Create Collection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const MyCollectionsView = ({ user, onBack, onGoToCollection, onEditCollection }) => {
  const [filter, setFilter] = useState('All');
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (user) {
        const data = await fetchUserCollections(user.id);
        setCollections(data);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const filters = ['All', 'Anime', 'Manga', 'Private', 'Community'];

  const filteredCollections = collections.filter(c => {
    if (filter === 'All') return true;
    if (filter === 'Private') return c.is_private;
    if (filter === 'Public') return !c.is_private;
    return true;
  });

  if (loading) {
    return (
      <div className="page-container" style={{ padding: '2rem', textAlign: 'center' }}>
        Loading...
      </div>
    );
  }

  return (
    <div className="page-container" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: '#cfc2d6', cursor: 'pointer', fontSize: '1rem' }}
        >
          ← Back
        </button>
        <h1 style={{ margin: 0, fontSize: '2rem' }}>My Collections</h1>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: '999px',
              border: filter === f ? '1px solid #ff1a75' : '1px solid rgba(255,255,255,0.15)',
              background: filter === f ? 'rgba(255,26,117,0.15)' : 'rgba(255,255,255,0.05)',
              color: filter === f ? '#fff' : '#cfc2d6',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {f}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
        {filteredCollections.map(c => (
          <div key={c.id} style={{
            borderRadius: '16px',
            overflow: 'hidden',
            cursor: 'pointer',
            border: '1px solid rgba(255,255,255,0.1)',
            transition: 'transform 0.3s ease, border-color 0.3s ease'
          }}
               onMouseEnter={(e) => {
                 e.currentTarget.style.transform = 'translateY(-6px)';
                 e.currentTarget.style.borderColor = 'rgba(255,26,117,0.4)';
               }}
               onMouseLeave={(e) => {
                 e.currentTarget.style.transform = 'translateY(0)';
                 e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
               }}
               onClick={() => onGoToCollection(c)}
          >
            <div style={{ position: 'relative', minHeight: '200px', background: 'linear-gradient(135deg, rgba(255,26,117,.14), rgba(3,15,22,.95))' }}>
              {c.cover && <img src={c.cover} alt={c.title} style={{ width: '100%', height: '200px', objectFit: 'cover' }} />}
              <div style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                padding: '0.25rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: '700',
                background: c.is_private ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)'
              }}>
                {c.is_private ? <Lock size={14} style={{ display: 'inline' }} /> : <Globe size={14} style={{ display: 'inline' }} />}
                {' '}{c.is_private ? 'Private' : 'Public'}
              </div>
            </div>
            <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>{c.title}</h3>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#cfc2d6' }}>
                {c.count || 0} items · {c.followers_count || 0} followers · {c.is_private ? 'Private' : 'Public'}
              </p>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); onEditCollection(c); }}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'rgba(255,255,255,0.05)',
                    color: '#fff',
                    cursor: 'pointer'
                  }}
                >
                  <Edit size={16} style={{ display: 'inline' }} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); }}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'rgba(255,255,255,0.05)',
                    color: '#fff',
                    cursor: 'pointer'
                  }}
                >
                  <Share2 size={16} style={{ display: 'inline' }} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const CollectionDetailsView = ({ collection, user, onBack, onEdit, onDuplicate }) => {
  const [items, setItems] = useState([]);
  const [following, setFollowing] = useState(collection.is_following);
  const [liked, setLiked] = useState(collection.is_liked);
  const [likesCount, setLikesCount] = useState(collection.likes_count || 0);
  const [followersCount, setFollowersCount] = useState(collection.followers_count || 0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadItems = async () => {
      const data = await fetchCollectionItems(collection.id);
      setItems(data);
      setLoading(false);
    };
    loadItems();
  }, [collection.id]);

  const handleFollow = async () => {
    if (user) {
      const result = await toggleFollowCollection(collection.id, user.id);
      setFollowing(result.following);
      setFollowersCount(result.following ? followersCount + 1 : followersCount - 1);
    }
  };

  const handleLike = async () => {
    if (user) {
      const result = await toggleLikeCollection(collection.id, user.id);
      setLiked(result.liked);
      setLikesCount(result.liked ? likesCount + 1 : likesCount - 1);
    }
  };

  if (loading) {
    return (
      <div className="page-container" style={{ padding: '2rem', textAlign: 'center' }}>
        Loading...
      </div>
    );
  }

  return (
    <div className="page-container" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: '#cfc2d6', cursor: 'pointer', fontSize: '1rem' }}
        >
          ← Back
        </button>
        <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Collection Details & Analytics</h1>
      </div>

      <div style={{ position: 'relative', minHeight: '320px', borderRadius: '20px', overflow: 'hidden', marginBottom: '2.5rem', background: 'linear-gradient(135deg, rgba(255,26,117,.14), rgba(3,15,22,.95))' }}>
        {collection.cover && <img
          src={collection.cover}
          alt={collection.title}
          style={{ width: '100%', height: '320px', objectFit: 'cover', filter: 'brightness(0.45)' }}
        />}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(0deg, rgba(3,15,22,1) 0%, rgba(3,15,22,0.6) 60%, rgba(3,15,22,0.3) 100%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '2.5rem'
        }}>
          <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '2.2rem' }}>
            <Layers size={28} style={{ marginRight: '0.75rem', color: '#ff1a75' }} />
            {collection.title}
          </h2>
          <p style={{ margin: '0 0 1rem 0', color: '#cfc2d6', maxWidth: '600px', fontSize: '1.05rem' }}>
            {collection.description}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ff1a75 0%, #ff4d94 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                fontWeight: '700'
              }}>
                {collection.username?.[0] || 'A'}
              </div>
              <div>
                <div style={{ fontWeight: '600' }}>Created by {collection.username}</div>
                <div style={{ fontSize: '0.85rem', color: '#cfc2d6' }}>
                  {likesCount} likes · {followersCount} followers
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={handleLike}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,26,117,0.5)',
                  background: liked ? 'rgba(255,26,117,0.2)' : 'rgba(255,255,255,0.08)',
                  color: '#fff',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                ❤️ {liked ? 'Liked' : 'Like'}
              </button>
              <button
                onClick={handleFollow}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,26,117,0.5)',
                  background: following ? 'rgba(255,26,117,0.2)' : 'rgba(255,255,255,0.08)',
                  color: '#fff',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                {following ? <Check size={16} /> : <User size={16} />}
                {following ? 'Following' : 'Follow Creator'}
              </button>
              <button
                onClick={onDuplicate}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #ff1a75 0%, #ff4d94 100%)',
                  color: '#fff',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 15px rgba(255,26,117,0.4)'
                }}
              >
                <Copy size={16} /> Duplicate Collection
              </button>
              {user && collection.user_id === user.id && (
                <button
                  onClick={onEdit}
                  style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.08)',
                    color: '#fff',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Edit size={16} /> Edit Collection
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '2rem' }}>
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
            {items.length > 0 ? items.map(item => (
              <div key={item.id} style={{
                borderRadius: '14px',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.03)',
                cursor: 'pointer',
                transition: 'transform 0.3s ease'
              }}
                   onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                   onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ position: 'relative' }}>
                  <img src={item.poster || item.cover} alt={item.title} style={{ width: '100%', height: '220px', objectFit: 'cover' }} />
                  <div style={{
                    position: 'absolute',
                    bottom: '0.75rem',
                    left: '0.75rem',
                    background: 'rgba(0,0,0,0.7)',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    color: '#ffc107'
                  }}>
                    ⭐ {item.score}
                  </div>
                </div>
                <div style={{ padding: '1rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>{item.title}</h4>
                  <div style={{ fontSize: '0.8rem', color: '#cfc2d6' }}>{item.status}</div>
                </div>
              </div>
            )) : (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: '#cfc2d6' }}>
                No items in this collection yet.
              </div>
            )}
          </div>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.1rem' }}>Collection Analytics</h3>

          <div style={{ marginBottom: '2rem' }}>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', color: '#cfc2d6' }}>Genre Distribution</h4>
            <div style={{
              width: '180px',
              height: '180px',
              margin: '0 auto 1rem',
              borderRadius: '50%',
              background: 'conic-gradient(#ff1a75 0deg 180deg, #7c3aed 180deg 270deg, #06b6d4 270deg 315deg, #f59e0b 315deg 360deg)',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                inset: '40px',
                background: '#030f16',
                borderRadius: '50%'
              }} />
            </div>
            <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff1a75' }} />
                <span>Psychological (50%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#7c3aed' }} />
                <span>Thriller (25%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#06b6d4' }} />
                <span>Mystery (12%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b' }} />
                <span>Horror (13%)</span>
              </div>
            </div>
          </div>

          <div>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', color: '#cfc2d6' }}>Completion Statistics</h4>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', height: '120px' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '100%',
                  height: '80px',
                  background: 'rgba(255,26,117,0.6)',
                  borderRadius: '8px 8px 0 0'
                }} />
                <span style={{ fontSize: '0.75rem' }}>Watching</span>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '100%',
                  height: '100px',
                  background: 'rgba(255,26,117,0.6)',
                  borderRadius: '8px 8px 0 0'
                }} />
                <span style={{ fontSize: '0.75rem' }}>Completed</span>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '100%',
                  height: '40px',
                  background: 'rgba(255,26,117,0.6)',
                  borderRadius: '8px 8px 0 0'
                }} />
                <span style={{ fontSize: '0.75rem' }}>On Hold</span>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '100%',
                  height: '60px',
                  background: 'rgba(255,26,117,0.6)',
                  borderRadius: '8px 8px 0 0'
                }} />
                <span style={{ fontSize: '0.75rem' }}>Dropped</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const EditCollectionView = ({ collection, user, onBack, onSave, onDelete }) => {
  const [title, setTitle] = useState(collection.title);
  const [description, setDescription] = useState(collection.description || '');
  const [isPrivate, setIsPrivate] = useState(collection.is_private);
  const [cover, setCover] = useState(collection.cover || '');
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState('');
  const searchTimerRef = React.useRef(null);

  useEffect(() => {
    const load = async () => {
      const data = await fetchCollectionItems(collection.id);
      setItems(data);
    };
    load();
  }, [collection.id]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  const handleSearch = async (q) => {
    if (!q || !q.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      setSearchError('');
      return;
    }
    setSearching(true);
    setSearchError('');
    setHasSearched(true);
    try {
      const results = await searchAnime(q.trim());
      setSearchResults(Array.isArray(results) ? results : []);
    } catch (err) {
      console.error('Search failed:', err);
      setSearchError('Search failed. Please try again.');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchInput = (value) => {
    setSearchQuery(value);
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    searchTimerRef.current = setTimeout(() => {
      handleSearch(value);
    }, 400);
  };

  const addAnime = (anime) => {
    if (!anime || anime.id == null) return;
    const alreadyAdded = items.some(i => i.media_id === String(anime.id) || i.id === anime.id);
    if (alreadyAdded) return;
    const newItem = {
      id: Date.now(),
      media_id: String(anime.id),
      media_type: 'anime',
      title: getTitle(anime),
      poster: getImage(anime),
      score: anime.averageScore ?? anime.meanScore ?? null,
      status: anime.status || null,
      added_at: new Date().toISOString()
    };
    setItems([...items, newItem]);
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
  };

  const removeItem = (id) => {
    setItems(items.filter(i => i.id !== id));
  };

  const handleSave = async () => {
    if (!user) return;
    // 1) Sync collection metadata
    await updateCollection(collection.id, user.id, title, description, cover, isPrivate);

    // 2) Sync items: fetch the current server-side items, then add new ones and
    //    remove deleted ones. This ensures the items the user added/removed in
    //    the edit view actually get persisted to the database.
    try {
      const serverItems = await fetchCollectionItems(collection.id);
      const serverIds = new Set(serverItems.map(i => String(i.media_id)));
      const localIds = new Set(items.map(i => String(i.media_id)));

      // Add items present locally but not on the server
      for (const item of items) {
        if (!serverIds.has(String(item.media_id))) {
          await addItemToCollection(
            collection.id,
            String(item.media_id),
            item.media_type || 'anime',
            item.title || getTitle(item),
            item.poster || getImage(item),
            item.score ?? null,
            item.status ?? null
          );
        }
      }

      // Remove items present on the server but no longer in local state
      for (const serverItem of serverItems) {
        if (!localIds.has(String(serverItem.media_id))) {
          await removeItemFromCollection(collection.id, serverItem.id);
        }
      }
    } catch (err) {
      console.error('Failed to sync collection items:', err);
    }

    onSave();
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this collection?')) {
      if (user) {
        await deleteCollection(collection.id, user.id);
        onDelete();
      }
    }
  };

  return (
    <div className="page-container" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: '#cfc2d6', cursor: 'pointer', fontSize: '1rem' }}
        >
          ← Back
        </button>
        <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Edit Collection</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '2rem' }}>
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem' }}>Information & Settings</h3>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#cfc2d6' }}>Collection Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.05)',
                color: '#fff',
                fontSize: '1rem'
              }}
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#cfc2d6' }}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.05)',
                color: '#fff',
                fontSize: '1rem',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.9rem', color: '#cfc2d6' }}>Visibility</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '0.9rem' }}>Public</span>
              <div
                onClick={() => setIsPrivate(!isPrivate)}
                style={{
                  width: '60px',
                  height: '30px',
                  borderRadius: '15px',
                  background: isPrivate ? '#ff1a75' : 'rgba(255,255,255,0.2)',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.3s ease'
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: '3px',
                  left: isPrivate ? '33px' : '3px',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: '#fff',
                  transition: 'left 0.3s ease'
                }} />
              </div>
              <span style={{ fontSize: '0.9rem' }}>Private</span>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.9rem', color: '#cfc2d6' }}>Custom Banner</label>
            <div style={{
              border: '2px dashed rgba(255,255,255,0.2)',
              borderRadius: '12px',
              padding: '2.5rem 1rem',
              textAlign: 'center',
              background: 'rgba(255,255,255,0.03)',
              cursor: 'pointer'
            }}>
              <div style={{
                fontSize: '2.5rem',
                marginBottom: '0.75rem',
                background: 'rgba(255,255,255,0.1)',
                width: '60px',
                height: '60px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 0.75rem'
              }}>
                🖼️
              </div>
              <button onClick={() => {
                const url = prompt('Enter banner URL');
                if (url) setCover(url);
              }} style={{
                padding: '0.6rem 1.25rem',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.08)',
                color: '#fff',
                fontWeight: '600',
                cursor: 'pointer'
              }}>
                Upload
              </button>
            </div>
          </div>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '1px solid rgba(255,255,255,0.08)'
        }}>
          <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem' }}>Manage Items</h3>

          <div style={{
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.05)'
          }}>
            {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            <input
              type="text"
              placeholder="Add Anime"
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '1rem',
                outline: 'none'
              }}
            />
          </div>

          {searchError && (
            <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.3)', borderRadius: '8px', color: '#ff8888', fontSize: '0.85rem' }}>
              {searchError}
            </div>
          )}

          {hasSearched && !searching && searchResults.length === 0 && !searchError && (
            <div style={{ marginBottom: '1.5rem', padding: '1.5rem', textAlign: 'center', color: '#cfc2d6', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
              <p style={{ margin: 0 }}>No anime found for "{searchQuery}". Try a different search term.</p>
            </div>
          )}

          {searchResults.length > 0 && (
            <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <h4 style={{ marginBottom: '1rem', color: '#cfc2d6' }}>Search Results ({searchResults.length})</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                {searchResults.map(anime => (
                  <div key={anime.id} style={{ position: 'relative' }}>
                    <div style={{
                      borderRadius: '12px',
                      overflow: 'hidden',
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(255,255,255,0.03)',
                      cursor: 'pointer'
                    }}
                         onClick={() => addAnime(anime)}
                    >
                      {getImage(anime) ? (
                        <img src={getImage(anime)} alt={getTitle(anime)} style={{ width: '100%', height: '160px', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '160px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>No Image</div>
                      )}
                      <div style={{ padding: '0.75rem' }}>
                        <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem' }}>{getTitle(anime)}</h4>
                        <div style={{ fontSize: '0.75rem', color: '#ffc107', fontWeight: '600' }}>⭐ {anime.averageScore || 'N/A'}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => addAnime(anime)}
                      style={{
                        position: 'absolute',
                        top: '0.5rem',
                        right: '0.5rem',
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: 'rgba(255,26,117,0.9)',
                        border: 'none',
                        color: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            {items.map(item => (
              <div key={item.id} style={{ position: 'relative' }}>
                <div style={{
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.03)'
                }}>
                  <img src={item.poster || item.cover} alt={item.title} style={{ width: '100%', height: '160px', objectFit: 'cover' }} />
                  <div style={{ padding: '0.75rem' }}>
                    <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem' }}>{item.title}</h4>
                    <div style={{ fontSize: '0.75rem', color: '#ffc107', fontWeight: '600' }}>⭐ {item.score}</div>
                  </div>
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  style={{
                    position: 'absolute',
                    top: '0.5rem',
                    right: '0.5rem',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.8)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'flex-end',
            padding: '1rem',
            background: 'rgba(0,0,0,0.2)',
            borderRadius: '12px',
            margin: '0 -1.5rem -1.5rem -1.5rem'
          }}>
            <button
              onClick={handleDelete}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '10px',
                border: '1px solid rgba(255, 80, 80, 0.5)',
                background: 'rgba(255, 80, 80, 0.1)',
                color: '#ff5050',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Trash2 size={16} /> Delete Collection
            </button>
            <button
              onClick={handleSave}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #ff1a75 0%, #ff4d94 100%)',
                color: '#fff',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 15px rgba(255,26,117,0.4)'
              }}
            >
              <Check size={16} /> Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Collections() {
  const { user } = useUser();
  const [view, setView] = useState('dashboard');
  const [selectedCollection, setSelectedCollection] = useState(null);

  const handleGoToMyCollections = () => setView('my-collections');
  const handleGoToCommunity = () => setView('community');
  const handleGoToMakeCollection = () => setView('make');

  const handleGoToCollection = async (c) => {
    const fullCollection = await fetchCollectionById(c.id, user?.id);
    setSelectedCollection(fullCollection || c);
    setView('collection-details');
  };

  const handleEditCollection = (c) => {
    setSelectedCollection(c);
    setView('edit-collection');
  };

  const handleSaveCollection = () => {
    setView('my-collections');
  };

  const handleDeleteCollection = () => {
    setView('my-collections');
  };

  const handleDuplicateCollection = async () => {
    if (selectedCollection && user) {
      await duplicateCollection(selectedCollection.id, user.id, user.username);
    }
  };

  const handleBack = () => {
    setView('dashboard');
  };

  return (
    <>
      {view === 'dashboard' && (
        <DashboardView
          user={user}
          onGoToMyCollections={handleGoToMyCollections}
          onGoToCollection={handleGoToCollection}
          onGoToCommunity={handleGoToCommunity}
          onGoToMakeCollection={handleGoToMakeCollection}
        />
      )}
      {view === 'my-collections' && (
        <MyCollectionsView
          user={user}
          onBack={handleBack}
          onGoToCollection={handleGoToCollection}
          onEditCollection={handleEditCollection}
        />
      )}
      {view === 'community' && (
        <CommunityView
          user={user}
          onBack={handleBack}
          onGoToCollection={handleGoToCollection}
        />
      )}
      {view === 'make' && (
        <MakeCollectionView
          user={user}
          onBack={handleBack}
          onSave={handleSaveCollection}
        />
      )}
      {view === 'collection-details' && selectedCollection && (
        <CollectionDetailsView
          collection={selectedCollection}
          user={user}
          onBack={() => setView('dashboard')}
          onEdit={() => handleEditCollection(selectedCollection)}
          onDuplicate={handleDuplicateCollection}
        />
      )}
      {view === 'edit-collection' && selectedCollection && (
        <EditCollectionView
          collection={selectedCollection}
          user={user}
          onBack={() => setView('collection-details')}
          onSave={handleSaveCollection}
          onDelete={handleDeleteCollection}
        />
      )}
    </>
  );
}
