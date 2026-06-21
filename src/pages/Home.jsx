import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AnimeCard from "../components/AnimeCard";
import {
  fetchTrendingMedia,
  fetchAnimeBySeason,
  fetchAnimeByIds,
} from "../api/anilist";
import LatestSection from "../components/LatestSection";
import {
  Play,
  Calendar,
  Star,
  Info,
  ChevronRight,
  Sparkles,
  ShieldAlert,
  Hash,
  Filter,
  Zap,
} from "lucide-react";

const GENRES = [
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Fantasy",
  "Horror",
  "Mystery",
  "Psychological",
  "Romance",
  "Sci-Fi",
  "Slice of Life",
  "Sports",
  "Supernatural",
];

const SEASONS = ["WINTER", "SPRING", "SUMMER", "FALL"];
const YEARS = [2024, 2023, 2022, 2021, 2020];

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
      "https://static0.colliderimages.com/wordpress/wp-content/uploads/2024/01/full-metal-alchemist.jpg",
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
      "https://occ-0-8407-444.1.nflxso.net/dnm/api/v6/MgXQGyNr1xbI8tJSYiMWv5kXg5g/AAAABfx1O1beK9b2mjMEQXxmAB3EGCOt-T7B4X1OfSvZPzNQ2dSbe77KUr2PCPYBMRBmIojLoOj1GykcqDRZp3G8cOXQjqCYOoyVBC5hysqmyE6jzKAZ5I8oH5KFYw.jpg?r=3bd",
  },
  {
    id: 1735,
    idMal: 1735,
    title: { english: "Naruto: Shippuden" },
    description:
      "Naruto continues his journey home with bigger battles, stronger rivals, and the dream of becoming Hokage still burning bright.",
    seasonYear: 2007,
    averageScore: 82,
    format: "TV",
    bannerImage:
      "https://static0.colliderimages.com/wordpress/wp-content/uploads/2025/02/naruto-header.jpg?w=1200&h=675&fit=crop",
  },
  {
    id: 1,
    idMal: 1,
    title: { english: "Cowboy Bebop" },
    description:
      "A crew of bounty hunters chases criminals across space while their pasts slowly catch up with them.",
    seasonYear: 1998,
    averageScore: 86,
    format: "TV",
    bannerImage: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTFKyfoTGfnUGfst-p3uNe3DzlnCBKoEDY37A&s",
  },
];

const FEATURED_SLIDE_IDS = FEATURED_SLIDE_FALLBACKS.map((anime) => anime.id);

function getTitle(anime) {
  return (
    anime?.title?.english ||
    anime?.title?.romaji ||
    anime?.title?.native ||
    "Unknown Title"
  );
}

function getImage(anime) {
  return (
    anime?.coverImage?.extraLarge ||
    anime?.coverImage?.large ||
    anime?.coverImage?.medium
  );
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

function Home() {
  const [animeList, setAnimeList] = useState([]);
  const [featuredSlides, setFeaturedSlides] = useState([]);
  const [seasonalList, setSeasonalList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seasonalLoading, setSeasonalLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedSeason, setSelectedSeason] = useState("SPRING");
  const [selectedYear, setSelectedYear] = useState(2024);

  const [favoritesData, setFavoritesData] = useState(() =>
    JSON.parse(localStorage.getItem("animevault_favorites") || '{"animes":[],"studios":[],"characters":[]}'),
  );
  const favorites = favoritesData.animes || [];
  const [activeSlide, setActiveSlide] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [data, featured] = await Promise.all([
          fetchTrendingMedia("ANIME"),
          fetchAnimeByIds(FEATURED_SLIDE_IDS),
        ]);

        const orderedFeatured = FEATURED_SLIDE_FALLBACKS.map((fallback) => {
          const fetched = featured.find(
            (anime) => Number(anime.id) === Number(fallback.id),
          );
          return mergeFeaturedAnime(fallback, fetched);
        });

        setAnimeList(data);
        setFeaturedSlides(orderedFeatured);
      } catch (err) {
        setError(err.message || "Failed to load trending anime");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    async function loadSeasonal() {
      try {
        setSeasonalLoading(true);
        const data = await fetchAnimeBySeason(selectedSeason, selectedYear);
        setSeasonalList(data);
      } catch (err) {
        console.error("Failed to load seasonal", err);
      } finally {
        setSeasonalLoading(false);
      }
    }
    loadSeasonal();
  }, [selectedSeason, selectedYear]);

  // Slideshow interval timer
  useEffect(() => {
    if (featuredSlides.length === 0) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % Math.min(5, featuredSlides.length));
    }, 6000);
    return () => clearInterval(interval);
  }, [featuredSlides]);

  const trending = animeList.slice(0, 12);

  function toggleFavorite(anime) {
    setFavoritesData((current) => {
      const isFav = (current.animes || []).some((item) => item.id === anime.id);
      const next = {
        ...current,
        animes: isFav
          ? (current.animes || []).filter((item) => item.id !== anime.id)
          : [...(current.animes || []), { id: anime.id, title: getTitle(anime), image: getImage(anime) }],
      };
      localStorage.setItem("animevault_favorites", JSON.stringify(next));
      return next;
    });
  }

  if (loading)
    return (
      <div className="status-container">
        <div className="spinner" />
        <p>Loading the vault...</p>
      </div>
    );

  return (
    <section className="home-v2">
      {/* Immersive Hero Slideshow Carousel (Flashcards) */}
      {featuredSlides.length > 0 && (
        <div
          className="hero-v2 hero-carousel-v2 anime-hero-carousel"
          style={{ position: "relative", overflow: "hidden", height: "520px" }}
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
                    <h1 className="hero-title-v2">{getTitle(anime)}</h1>
                    <div className="hero-meta-v2">
                      <span>
                        <Calendar size={16} /> {anime?.seasonYear}
                      </span>
                      <span>
                        <Star size={16} /> {anime?.averageScore}%
                      </span>
                      <span>{anime?.format}</span>
                    </div>
                    <p className="hero-desc-v2">
                      {getDescription(anime).slice(0, 220)}...
                    </p>
                    <div className="hero-btns-v2">
                      <button
                        className="btn-play-v2"
                        onClick={() => navigate(`/anime/${anime.id}`)}
                      >
                        <Play size={20} fill="black" /> Watch Now
                      </button>
                      <button
                        className="btn-info-v2"
                        onClick={() => navigate(`/anime/${anime.id}`)}
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
      )}

      <div className="home-main-v2">
        {/* Security & Updates */}
        <div
          className="security-notice-v2"
          style={{ marginTop: "1rem", zIndex: 10, position: "relative" }}
        >
          <ShieldAlert size={28} color="#ffa500" />
          <div>
            <p>
              <strong>Security & Stability Update</strong>
              Stable Zen Mode added. Removed restrictive attributes for 100%
              server compatibility. AniWave stable mirrors integrated.
            </p>
          </div>
        </div>

        {/* Latest from External Servers */}
        <LatestSection />

        {/* Seasonal Browser */}
        <section className="home-section-v2">
          <div className="section-header-v2">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                flexWrap: "wrap",
              }}
            >
              <h2>Seasonal Browser</h2>
              <div
                className="seasonal-controls-v2"
                style={{ display: "flex", gap: "0.5rem" }}
              >
                <select
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(e.target.value)}
                  className="server-dropdown-v2"
                  style={{
                    minWidth: "120px",
                    padding: "0.4rem 2rem 0.4rem 0.8rem",
                  }}
                >
                  {SEASONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="server-dropdown-v2"
                  style={{
                    minWidth: "100px",
                    padding: "0.4rem 2rem 0.4rem 0.8rem",
                  }}
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div
            className="trending-grid-v2"
            style={{
              opacity: seasonalLoading ? 0.5 : 1,
              transition: "opacity 0.2s",
              marginTop: "1.5rem",
            }}
          >
            {seasonalList.length > 0 ? (
              seasonalList
                .slice(0, 12)
                .map((anime) => (
                  <AnimeCard
                    key={anime.id}
                    anime={anime}
                    isFavorite={favorites.some((f) => f.id === anime.id)}
                    onToggleFavorite={toggleFavorite}
                  />
                ))
            ) : (
              <p>No seasonal data found for this period.</p>
            )}
          </div>
        </section>

        {/* Popular Genres */}
        <section className="home-section-v2">
          <div className="section-header-v2" style={{ marginBottom: "1rem" }}>
            <h2>Popular Genres</h2>
          </div>
          <div
            className="genres-container-v2"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
              marginBottom: "2rem",
            }}
          >
            {GENRES.map((genre) => (
              <Link
                key={genre}
                to={`/search?genre=${genre}`}
                className="genre-tag-v2"
              >
                <Hash size={14} opacity={0.6} />
                {genre}
              </Link>
            ))}
          </div>
        </section>

        {/* Global Trending */}
        <section className="home-section-v2">
          <div className="section-header-v2">
            <h2>Global Trending</h2>
            <Link to="/search?trending=true" className="view-all">
              View All <ChevronRight size={18} />
            </Link>
          </div>
          <div className="trending-grid-v2" style={{ marginTop: "1.5rem" }}>
            {trending.map((anime) => (
              <AnimeCard
                key={anime.id}
                anime={anime}
                isFavorite={favorites.some((f) => f.id === anime.id)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

export default Home;
