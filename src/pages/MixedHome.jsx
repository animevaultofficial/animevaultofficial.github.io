import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Play, Calendar, Star, Info, Sparkles, ChevronRight } from 'lucide-react';
import AnimeCard from '../components/AnimeCard';
import { fetchTrendingMedia, fetchAnimeBySeason } from '../api/anilist';
import { fetchLatestMovies, fetchLatestTVShows } from '../api/movies';

const SEASONS = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];
const YEARS = [2026, 2025, 2024, 2023, 2022];
const FEATURED_SLIDE_FALLBACKS = [
  { id: 1535, title: { english: 'Death Note' }, description: 'A genius student discovers a notebook with deadly power and begins a cat-and-mouse war against the world’s greatest detective.', bannerImage: 'https://animeblog.github.io/images/death-note-banner.jpg', coverImage: { extraLarge: 'https://cdn.europosters.eu/image/hp/60720.jpg' }, seasonYear: 2006, averageScore: 84, format: 'TV' },
  { id: 999999, title: { english: 'Spider-Man: Brand New Day' }, description: 'Spider-Man faces a brand new day of crime-fighting while balancing school, friends, and a new era of heroes.', bannerImage: 'https://i.imgur.com/7Y3aZgE.jpg', coverImage: { extraLarge: 'https://i.imgur.com/7Y3aZgE.jpg' }, seasonYear: 2026, averageScore: 88, format: 'MOVIE' },
  { id: 180745, title: { english: 'Solo Leveling' }, description: 'A weak hunter discovers the power to grow stronger with every battle, changing his fate forever.', bannerImage: 'https://i.imgur.com/8qTm0XE.jpg', coverImage: { extraLarge: 'https://i.imgur.com/8qTm0XE.jpg' }, seasonYear: 2024, averageScore: 89, format: 'TV' },
  { id: 888888, title: { english: 'When I Fly Towards You' }, description: 'A romantic drama about first love, dreams, and the courage to follow your heart as two people grow closer.', bannerImage: 'https://i.imgur.com/3KX9iLz.jpg', coverImage: { extraLarge: 'https://i.imgur.com/3KX9iLz.jpg' }, seasonYear: 2024, averageScore: 86, format: 'DRAMA' },
];

const HOME_CACHE_KEY = 'animevault_home_v3';
const HOME_CACHE_TTL = 5 * 60 * 1000;

function getTitle(a) { return a?.title?.english || a?.title?.romaji || a?.title?.native || 'Unknown Title'; }
function getImage(a) { return a?.coverImage?.extraLarge || a?.coverImage?.large || a?.coverImage?.medium || '/logo.png'; }
function getBanner(a) { return a?.bannerImage || getImage(a); }
function getDescription(a) { return a?.description?.replace(/<[^>]+>/g, '') || 'No description available.'; }
function readHomeCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(HOME_CACHE_KEY) || 'null');
    return cached && Date.now() - cached.ts < HOME_CACHE_TTL ? cached.data : null;
  } catch { return null; }
}
function writeHomeCache(data) {
  try { localStorage.setItem(HOME_CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch {}
}
function runWhenIdle(task, delay = 1200) {
  if (typeof window === 'undefined') return () => {};
  let cancelled = false;
  const run = () => { if (!cancelled) task(); };
  const idleId = 'requestIdleCallback' in window
    ? window.requestIdleCallback(run, { timeout: delay })
    : window.setTimeout(run, delay);
  return () => {
    cancelled = true;
    if ('cancelIdleCallback' in window && typeof idleId === 'number') window.cancelIdleCallback(idleId);
    else window.clearTimeout(idleId);
  };
}

export default function MixedHome() {
  const navigate = useNavigate();
  const [animeList, setAnimeList] = useState(() => readHomeCache()?.anime || []);
  const [featuredSlides, setFeaturedSlides] = useState(FEATURED_SLIDE_FALLBACKS);
  const [seasonalList, setSeasonalList] = useState([]);
  const [movies, setMovies] = useState([]);
  const [tvShows, setTvShows] = useState([]);
  const [seasonalLoading, setSeasonalLoading] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState('SPRING');
  const [selectedYear, setSelectedYear] = useState(2026);
  const [activeSlide, setActiveSlide] = useState(0);
  const [favoritesData, setFavoritesData] = useState(() => {
    try {
      const x = JSON.parse(localStorage.getItem('animevault_favorites') || '{}');
      return { animes: Array.isArray(x.animes) ? x.animes : [], studios: Array.isArray(x.studios) ? x.studios : [], characters: Array.isArray(x.characters) ? x.characters : [] };
    } catch { return { animes: [], studios: [], characters: [] }; }
  });
  const favorites = favoritesData.animes;

  useEffect(() => {
    let cancelled = false;
    const cached = readHomeCache();
    if (cached?.anime?.length) setAnimeList(cached.anime);

    fetchTrendingMedia('ANIME', 1, 12).then(data => {
      if (cancelled) return;
      const anime = Array.isArray(data) ? data : [];
      setAnimeList(anime);
      writeHomeCache({ ...(readHomeCache() || {}), anime });
      if (anime.length) {
        setFeaturedSlides(anime.slice(0, 5));
        setActiveSlide(0);
      }
    }).catch(() => {});

    const cancelIdle = runWhenIdle(() => {
      Promise.allSettled([fetchLatestMovies(1), fetchLatestTVShows(1)]).then(results => {
        if (cancelled) return;
        const movieResult = results[0]?.status === 'fulfilled' ? results[0].value : [];
        const tvResult = results[1]?.status === 'fulfilled' ? results[1].value : [];
        setMovies(Array.isArray(movieResult) ? movieResult : []);
        setTvShows(Array.isArray(tvResult) ? tvResult : []);
      });
    }, 1800);
    return () => { cancelled = true; cancelIdle(); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setSeasonalLoading(true);
    const cancelIdle = runWhenIdle(() => {
      fetchAnimeBySeason(selectedSeason, selectedYear).then(data => {
        if (!cancelled) setSeasonalList(Array.isArray(data) ? data.slice(0, 12) : []);
      }).catch(() => {
        if (!cancelled) setSeasonalList([]);
      }).finally(() => { if (!cancelled) setSeasonalLoading(false); });
    }, 900);
    return () => { cancelled = true; cancelIdle(); };
  }, [selectedSeason, selectedYear]);

  useEffect(() => {
    const count = Math.min(5, featuredSlides.length);
    if (count < 2) return undefined;
    const interval = window.setInterval(() => setActiveSlide(prev => (prev + 1) % count), 6500);
    return () => window.clearInterval(interval);
  }, [featuredSlides.length]);

  function toggleFavorite(anime) {
    setFavoritesData(current => {
      const list = Array.isArray(current.animes) ? current.animes : [];
      const isFavorite = list.some(item => item?.id === anime.id);
      const next = { ...current, animes: isFavorite ? list.filter(item => item?.id !== anime.id) : [...list, { id: anime.id, title: getTitle(anime), image: getImage(anime) }] };
      try { localStorage.setItem('animevault_favorites', JSON.stringify(next)); } catch {}
      return next;
    });
  }

  const trendingAnime = animeList.slice(0, 12);

  return (
    <section className="home-v2">
      <div className="hero-v2 hero-carousel-v2 anime-hero-carousel">
        {featuredSlides.slice(0, 5).map((anime, index) => {
          const active = index === activeSlide;
          return (
            <div key={`${anime.id}-${index}`} className={`carousel-slide ${active ? 'active' : ''}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: active ? 1 : 0, visibility: active ? 'visible' : 'hidden', transition: 'opacity .45s ease', zIndex: active ? 2 : 1 }}>
              <div className="hero-img-wrapper">
                <img src={getBanner(anime)} alt={getTitle(anime)} loading={index === 0 ? 'eager' : 'lazy'} fetchPriority={index === 0 ? 'high' : 'low'} decoding="async" />
                <div className="hero-overlay-v2" />
              </div>
              <div className="hero-content-v2">
                <div className="hero-info-v2">
                  <span className="hero-rank"><Sparkles size={14} /> {index + 1} Trending Now</span>
                  <h1 className="hero-title-v2">{getTitle(anime)}</h1>
                  <div className="hero-meta-v2"><span><Calendar size={16} /> {anime?.seasonYear || 'TBA'}</span><span><Star size={16} /> {anime?.averageScore || '—'}%</span><span>{anime?.format || 'Anime'}</span></div>
                  <p className="hero-desc-v2">{getDescription(anime).slice(0, 220)}...</p>
                  <div className="hero-btns-v2"><button className="btn-play-v2" onClick={() => navigate(`/anime/${anime.id}`)}><Play size={20} fill="black" /> Watch Now</button><button className="btn-info-v2" onClick={() => navigate(`/anime/${anime.id}`)}><Info size={20} /> Details</button></div>
                </div>
              </div>
            </div>
          );
        })}
        <div className="carousel-dots">{featuredSlides.slice(0, 5).map((_, i) => <button key={i} aria-label={`Slide ${i + 1}`} onClick={() => setActiveSlide(i)} className={i === activeSlide ? 'active' : ''} />)}</div>
      </div>

      <div className="home-main-v2">
        <div className="section-v2">
          <div className="section-header-v2"><div><h2>Anime Spotlight</h2><p>Trending anime, loaded first for a faster start.</p></div><Link to="/anime" className="view-all">Explore Anime <ChevronRight size={18} /></Link></div>
          <div className="trending-grid-v2">{trendingAnime.map(anime => <AnimeCard key={anime.id} anime={anime} isFavorite={favorites.some(f => f?.id === anime.id)} onToggleFavorite={() => toggleFavorite(anime)} />)}</div>
        </div>

        <div className="section-v2">
          <div className="section-header-v2"><div><h2>Seasonal Anime</h2><p>Loaded after the first screen so mobile stays responsive.</p></div><div className="seasonal-controls-v2"><select value={selectedSeason} onChange={e => setSelectedSeason(e.target.value)} className="server-dropdown-v2">{SEASONS.map(s => <option key={s}>{s}</option>)}</select><select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="server-dropdown-v2">{YEARS.map(y => <option key={y}>{y}</option>)}</select></div></div>
          {seasonalLoading && !seasonalList.length ? <div className="section-loading">Loading seasonal anime…</div> : <div className="trending-grid-v2">{seasonalList.map(anime => <AnimeCard key={anime.id} anime={anime} isFavorite={favorites.some(f => f?.id === anime.id)} onToggleFavorite={() => toggleFavorite(anime)} />)}</div>}
        </div>

        {movies.length > 0 && <div className="section-v2"><div className="section-header-v2"><div><h2>Blockbuster Movies</h2><p>Latest movies and top box office hits.</p></div><Link to="/dramas-movies" className="view-all">Explore Movies <ChevronRight size={18} /></Link></div><div className="trending-grid-v2">{movies.slice(0, 8).map(movie => <Link key={movie.id} to={`/watch/movie/${movie.id}`} className="anime-card-v2" style={{ textDecoration: 'none' }}><div className="card-media"><img src={movie.poster} alt={movie.title} loading="lazy" decoding="async" /><div className="card-overlay"><div className="play-icon-wrapper"><Play fill="white" size={24} /></div></div></div><div className="card-info"><h3 className="card-title">{movie.title}</h3><div className="card-meta"><span>MOVIE</span>{movie.year && <><span className="dot">•</span><span>{movie.year}</span></>}</div></div></Link>)}</div></div>}

        {tvShows.length > 0 && <div className="section-v2"><div className="section-header-v2"><div><h2>Trending Dramas & Shows</h2><p>Top series and drama picks.</p></div><Link to="/dramas-movies" className="view-all">Explore Shows <ChevronRight size={18} /></Link></div><div className="trending-grid-v2">{tvShows.slice(0, 8).map(show => <Link key={show.id} to={`/watch/tv/${show.id}`} className="anime-card-v2" style={{ textDecoration: 'none' }}><div className="card-media"><img src={show.poster} alt={show.title} loading="lazy" decoding="async" /><div className="card-overlay"><div className="play-icon-wrapper"><Play fill="white" size={24} /></div></div></div><div className="card-info"><h3 className="card-title">{show.title}</h3><div className="card-meta"><span>TV SHOW</span>{show.year && <><span className="dot">•</span><span>{show.year}</span></>}</div></div></Link>)}</div></div>}
      </div>
    </section>
  );
}
