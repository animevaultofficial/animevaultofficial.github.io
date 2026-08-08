import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Play, Calendar, Star, Info, Sparkles, Hash, Film, Tv, ChevronRight } from 'lucide-react';
import AnimeCard from '../components/AnimeCard';
import { fetchTrendingMedia, fetchAnimeBySeason, fetchAnimeByIds } from '../api/anilist';
import { fetchLatestMovies, fetchLatestTVShows, fetchTMDBBanner } from '../api/movies';

const SEASONS = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];
const YEARS = [2026, 2025, 2024, 2023, 2022];

const FEATURED_SLIDE_FALLBACKS = [
  {
    id: 1535,
    title: { english: 'Death Note' },
    description:
      'A genius student discovers a notebook with deadly power and begins a cat-and-mouse war against the world’s greatest detective.',
    bannerImage:
      'https://animeblog.github.io/images/death-note-banner.jpg',
    coverImage: { extraLarge: 'https://cdn.europosters.eu/image/hp/60720.jpg' },
    seasonYear: 2006,
    averageScore: 84,
    format: 'TV',
  },
  {
    id: 999999,
    title: { english: 'Spider-Man: Brand New Day' },
    tmdbSearchTitle: 'Spider-Man: Brand New Day',
    tmdbMediaType: 'movie',
    description:
      'Spider-Man faces a brand new day of crime-fighting while balancing school, friends, and a new era of heroes.',
    bannerImage:
      'https://i.imgur.com/7Y3aZgE.jpg',
    coverImage: { extraLarge: 'https://i.imgur.com/7Y3aZgE.jpg' },
    seasonYear: 2024,
    averageScore: 88,
    format: 'MOVIE',
  },
  {
    id: 180745,
    title: { english: 'Solo Leveling' },
    tmdbSearchTitle: 'Solo Leveling',
    tmdbMediaType: 'tv',
    description:
      'A weak hunter discovers the power to grow stronger with every battle, changing his fate forever.',
    bannerImage:
      'https://i.imgur.com/8qTm0XE.jpg',
    coverImage: { extraLarge: 'https://i.imgur.com/8qTm0XE.jpg' },
    seasonYear: 2024,
    averageScore: 89,
    format: 'TV',
  },
  {
    id: 888888,
    title: { english: 'When I Fly Towards You' },
    tmdbSearchTitle: 'When I Fly Towards You',
    tmdbMediaType: 'tv',
    description:
      'A romantic drama about first love, dreams, and the courage to follow your heart as two people grow closer.',
    bannerImage:
      'https://i.imgur.com/3KX9iLz.jpg',
    coverImage: { extraLarge: 'https://i.imgur.com/3KX9iLz.jpg' },
    seasonYear: 2024,
    averageScore: 86,
    format: 'DRAMA',
  },
];

function getTitle(anime) {
  return anime?.title?.english || anime?.title?.romaji || anime?.title?.native || 'Unknown Title';
}

function getImage(anime) {
  return anime?.coverImage?.extraLarge || anime?.coverImage?.large || anime?.coverImage?.medium || anime?.coverImage?.original || '/logo.png';
}

function getBanner(anime) {
  return anime?.bannerImage || getImage(anime);
}

function getDescription(anime) {
  return anime?.description?.replace(/<[^>]+>/g, '') || 'No description available.';
}

export default function MixedHome() {
  const [animeList, setAnimeList] = useState([]);
  const [featuredSlides, setFeaturedSlides] = useState([]);
  const [seasonalList, setSeasonalList] = useState([]);
  const [movies, setMovies] = useState([]);
  const [tvShows, setTvShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seasonalLoading, setSeasonalLoading] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState('SPRING');
  const [selectedYear, setSelectedYear] = useState(2026);
  const [activeSlide, setActiveSlide] = useState(0);
  const [favoritesData, setFavoritesData] = useState(() =>
    JSON.parse(localStorage.getItem('animevault_favorites') || '{"animes":[],"studios":[],"characters":[]}'),
  );
  const favorites = favoritesData.animes || [];
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [animeTrending, seasonalAnime, latestMovies, latestTv] = await Promise.all([
          fetchTrendingMedia('ANIME'),
          fetchAnimeBySeason(selectedSeason, selectedYear),
          fetchLatestMovies(1),
          fetchLatestTVShows(1),
        ]);

        const featuredToUse = FEATURED_SLIDE_FALLBACKS;
        const enrichedFeatured = await fetchAnimeByIds(featuredToUse.map((item) => item.id));
        const orderedFeatured = featuredToUse.map((fallback) => {
          const fetched = enrichedFeatured.find((anime) => Number(anime.id) === Number(fallback.id));
          return {
            ...fallback,
            ...fetched,
            title: fetched?.title || fallback.title,
            bannerImage: fallback.bannerImage || fetched?.bannerImage,
            coverImage: fetched?.coverImage || fallback.coverImage,
            seasonYear: fetched?.seasonYear || fallback.seasonYear,
            averageScore: fetched?.averageScore || fallback.averageScore,
            format: fetched?.format || fallback.format,
          };
        });

        setAnimeList(animeTrending || []);
        const featuredWithBanners = await Promise.all(
          orderedFeatured.map(async (slide) => {
            if (!slide.tmdbSearchTitle) return slide;
            const tmdbBanner = await fetchTMDBBanner(slide.tmdbSearchTitle, slide.tmdbMediaType);
            return tmdbBanner ? { ...slide, bannerImage: tmdbBanner } : slide;
          }),
        );
        setFeaturedSlides(featuredWithBanners);
        setSeasonalList(seasonalAnime || []);
        setMovies(latestMovies || []);
        setTvShows(latestTv || []);
      } catch (err) {
        console.error('Failed to load mixed homepage content:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedSeason, selectedYear]);

  useEffect(() => {
    if (featuredSlides.length === 0) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % Math.min(5, featuredSlides.length));
    }, 6500);
    return () => clearInterval(interval);
  }, [featuredSlides]);

  function toggleFavorite(anime) {
    setFavoritesData((current) => {
      const isFav = (current.animes || []).some((item) => item.id === anime.id);
      const next = {
        ...current,
        animes: isFav
          ? (current.animes || []).filter((item) => item.id !== anime.id)
          : [...(current.animes || []), { id: anime.id, title: getTitle(anime), image: getImage(anime) }],
      };
      localStorage.setItem('animevault_favorites', JSON.stringify(next));
      return next;
    });
  }

  const trendingAnime = animeList.slice(0, 12);

  if (loading) {
    return (
      <div className="status-container">
        <div className="spinner" />
        <p>Loading the vault...</p>
      </div>
    );
  }

  return (
    <section className="home-v2">
      <div className="hero-v2 hero-carousel-v2 anime-hero-carousel" style={{ position: 'relative', overflow: 'hidden', height: '520px' }}>
        {featuredSlides.slice(0, 5).map((anime, index) => {
          const isActive = index === activeSlide;
          return (
            <div
              key={anime.id}
              className={`carousel-slide ${isActive ? 'active' : ''}`}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: isActive ? 1 : 0,
                visibility: isActive ? 'visible' : 'hidden',
                transition: 'opacity 0.8s ease-in-out, visibility 0.8s ease-in-out',
                zIndex: isActive ? 2 : 1,
              }}
            >
              <div className="hero-img-wrapper" style={{ width: '100%', height: '100%', zIndex: 0 }}>
                <img
                  src={getBanner(anime)}
                  alt={getTitle(anime)}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div className="hero-overlay-v2" />
              </div>
              <div className="hero-content-v2" style={{ position: 'relative', zIndex: 5 }}>
                <div
                  className="hero-info-v2"
                  style={{
                    transform: isActive ? 'translateY(0)' : 'translateY(20px)',
                    opacity: isActive ? 1 : 0,
                    transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s',
                  }}
                >
                  <span className="hero-rank" style={{
                    color: 'var(--brand-color)',
                    background: 'rgba(0,0,0,0.6)',
                    border: '1px solid var(--brand-color)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    width: 'fit-content',
                  }}>
                    <Sparkles size={14} /> {index + 1} Trending Now
                  </span>
                  <h1 className="hero-title-v2">{getTitle(anime)}</h1>
                  <div className="hero-meta-v2">
                    <span><Calendar size={16} /> {anime?.seasonYear || 'TBA'}</span>
                    <span><Star size={16} /> {anime?.averageScore || '—'}</span>
                    <span>{anime?.format || 'Anime'}</span>
                  </div>
                  <p className="hero-desc-v2">{getDescription(anime).slice(0, 220)}...</p>
                  <div className="hero-btns-v2">
                    <button className="btn-play-v2" onClick={() => navigate(`/anime/${anime.id}`)}>
                      <Play size={20} fill="black" /> Watch Now
                    </button>
                    <button className="btn-info-v2" onClick={() => navigate(`/anime/${anime.id}`)}>
                      <Info size={20} /> Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div className="carousel-dots" style={{ position: 'absolute', bottom: '25px', right: '40px', zIndex: 10, display: 'flex', gap: '8px' }}>
          {featuredSlides.slice(0, 5).map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveSlide(index)}
              style={{
                width: index === activeSlide ? '30px' : '10px',
                height: '10px',
                borderRadius: '5px',
                border: 'none',
                background: index === activeSlide ? 'var(--brand-color)' : 'rgba(255,255,255,0.3)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: index === activeSlide ? '0 0 10px var(--brand-color)' : 'none',
              }}
            />
          ))}
        </div>
      </div>

      <div className="home-main-v2">
        <div className="section-v2">
          <div className="section-header-v2">
            <div>
              <h2>Anime Spotlight</h2>
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                The same anime homepage experience, now alongside movies and dramas.
              </p>
            </div>
            <Link to="/anime" className="view-all">
              Explore Anime <ChevronRight size={18} />
            </Link>
          </div>
          <div className="trending-grid-v2">
            {trendingAnime.map((anime) => (
              <AnimeCard
                key={anime.id}
                anime={anime}
                isFavorite={favorites.some((f) => f.id === anime.id)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        </div>

        <div className="section-v2">
          <div className="section-header-v2">
            <div>
              <h2>Seasonal Anime</h2>
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                Fresh titles from the current anime season.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <select value={selectedSeason} onChange={(e) => setSelectedSeason(e.target.value)} className="server-dropdown-v2">
                {SEASONS.map((season) => (
                  <option key={season} value={season}>{season}</option>
                ))}
              </select>
              <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="server-dropdown-v2">
                {YEARS.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="trending-grid-v2" style={{ opacity: seasonalLoading ? 0.5 : 1 }}>
            {seasonalList.slice(0, 12).map((anime) => (
              <AnimeCard
                key={anime.id}
                anime={anime}
                isFavorite={favorites.some((f) => f.id === anime.id)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        </div>

        <div className="section-v2">
          <div className="section-header-v2">
            <div>
              <h2>Blockbuster Movies</h2>
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                Watch the latest movies and top box office hits.
              </p>
            </div>
            <Link to="/dramas-movies" className="view-all">
              Explore Movies <ChevronRight size={18} />
            </Link>
          </div>
          <div className="trending-grid-v2">
            {movies.slice(0, 8).map((movie) => (
              <Link
                key={movie.id}
                to={`/watch/movie/${movie.id}`}
                className="anime-card-v2"
                style={{ textDecoration: 'none' }}
              >
                <div className="card-media">
                  <img src={movie.poster} alt={movie.title} loading="lazy" />
                  <div className="card-overlay">
                    <div className="play-icon-wrapper">
                      <Play fill="white" size={24} />
                    </div>
                  </div>
                </div>
                <div className="card-info">
                  <h3 className="card-title">{movie.title}</h3>
                  <div className="card-meta">
                    <span>MOVIE</span>
                    {movie.year && <><span className="dot">•</span><span>{movie.year}</span></>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="section-v2">
          <div className="section-header-v2">
            <div>
              <h2>Trending Dramas & Shows</h2>
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                Stream today’s top series and drama picks.
              </p>
            </div>
            <Link to="/dramas-movies" className="view-all">
              Explore Shows <ChevronRight size={18} />
            </Link>
          </div>
          <div className="trending-grid-v2">
            {tvShows.slice(0, 8).map((show) => (
              <Link
                key={show.id}
                to={`/watch/tv/${show.id}`}
                className="anime-card-v2"
                style={{ textDecoration: 'none' }}
              >
                <div className="card-media">
                  <img src={show.poster} alt={show.title} loading="lazy" />
                  <div className="card-overlay">
                    <div className="play-icon-wrapper">
                      <Play fill="white" size={24} />
                    </div>
                  </div>
                </div>
                <div className="card-info">
                  <h3 className="card-title">{show.title}</h3>
                  <div className="card-meta">
                    <span>TV SHOW</span>
                    {show.year && <><span className="dot">•</span><span>{show.year}</span></>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
