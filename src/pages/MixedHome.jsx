import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Play, Calendar, Star, Info, Sparkles, ChevronRight, Film, Tv, Clapperboard } from 'lucide-react';
import { fetchLatestMovies, fetchLatestTVShows } from '../api/movies';
import { getAniPMTop, getAniPMRecent } from '../api/anipm';

const CACHE_KEY = 'animevault_home_v6';
const TTL = 30 * 60 * 1000;
const readCache = () => { try { const x = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); return x && Date.now() - x.ts < TTL ? x.data : null; } catch { return null; } };
const writeCache = data => { try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch {} };

export default function MixedHome({ mobile = false }) {
  const navigate = useNavigate();
  const cached = readCache();
  const [movies, setMovies] = useState(cached?.movies || []);
  const [tvShows, setTvShows] = useState(cached?.tvShows || []);
  const [anime, setAnime] = useState(cached?.anime || []);
  const [animeRecent, setAnimeRecent] = useState(cached?.animeRecent || []);
  const [slides, setSlides] = useState(cached?.slides || []);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      fetchLatestMovies(1),
      fetchLatestTVShows(1),
      getAniPMTop('week', 12),
      getAniPMRecent(1, 12),
    ]).then(results => {
      if (cancelled) return;
      const m = results[0]?.status === 'fulfilled' && Array.isArray(results[0].value) ? results[0].value : [];
      const t = results[1]?.status === 'fulfilled' && Array.isArray(results[1].value) ? results[1].value : [];
      const a = results[2]?.status === 'fulfilled' && Array.isArray(results[2].value) ? results[2].value : [];
      const ar = results[3]?.status === 'fulfilled' && Array.isArray(results[3].value) ? results[3].value : [];
      const animeFeatured = a.slice(0, 2).map(x => ({ ...x, _kind: 'anime' }));
      const mediaFeatured = [
        ...m.slice(0, 2).map(x => ({ ...x, _kind: 'movie' })),
        ...t.slice(0, 2).map(x => ({ ...x, _kind: 'tv' })),
      ];
      const featured = [...animeFeatured, ...mediaFeatured].slice(0, 5);
      setMovies(m);
      setTvShows(t);
      setAnime(a);
      setAnimeRecent(ar);
      setSlides(featured);
      setActive(0);
      setLoading(false);
      writeCache({ movies: m, tvShows: t, anime: a, animeRecent: ar, slides: featured });
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = setInterval(() => setActive(i => (i + 1) % slides.length), 6500);
    return () => clearInterval(timer);
  }, [slides.length]);

  const slide = slides[active];
  const kind = slide?._kind || 'movie';
  const isAnime = kind === 'anime';
  const mediaKind = kind === 'tv' ? 'tv' : 'movie';
  const id = isAnime ? slide?.anilistId : (slide?.tmdbId || slide?.id);
  const title = slide?.title || slide?.name || 'AnimeVault';
  const image = slide?.backdrop || slide?.banner || slide?.poster || '/logo.png';
  const detailsPath = (item, type) => `/drama/${item.tmdbId || item.id}?type=${type === 'movie' ? 'movie' : 'tv'}&title=${encodeURIComponent(item.title || item.name || '')}`;

  const Card = ({ item, type }) => {
    const animeCard = type === 'anime';
    const destination = animeCard
      ? `/anime/${item.anilistId}`
      : (mobile ? detailsPath(item, type) : `/watch/${type === 'movie' ? 'movie' : 'tv'}/${item.tmdbId || item.id}`);
    return <Link to={destination} className="anime-card-v2" style={{ textDecoration: 'none' }}>
      <div className="card-media">
        <img src={item.poster} alt={item.title || item.name} loading="lazy" decoding="async" />
        <div className="card-overlay"><div className="play-icon-wrapper"><Play fill="white" size={24} /></div></div>
      </div>
      <div className="card-info">
        <h3 className="card-title">{item.title || item.name}</h3>
        <div className="card-meta">
          <span>{animeCard ? 'ANIME' : type === 'movie' ? 'MOVIE' : 'TV SHOW'}</span>
          {(item.year || item.format) && <><span className="dot">•</span><span>{item.year || item.format}</span></>}
        </div>
      </div>
    </Link>;
  };

  const watchPath = isAnime ? `/anime/${id}` : (mobile ? detailsPath(slide, mediaKind) : `/watch/${mediaKind}/${id}`);

  return <section className="home-v2">
    <div className="hero-v2 hero-carousel-v2" style={{ position: 'relative' }}>
      {slide && <div className="carousel-slide active" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <div className="hero-img-wrapper"><img src={image} alt={title} loading="eager" fetchPriority="high" decoding="async" /><div className="hero-overlay-v2" /></div>
        <div className="hero-content-v2"><div className="hero-info-v2">
          <span className="hero-rank">{isAnime ? <Sparkles size={14} /> : <Clapperboard size={14} />} {isAnime ? 'Trending Anime' : 'Featured on AnimeVault'}</span>
          <h1 className="hero-title-v2">{title}</h1>
          <div className="hero-meta-v2">
            <span>{isAnime ? <Sparkles size={16} /> : kind === 'movie' ? <Film size={16} /> : <Tv size={16} />}{isAnime ? 'Anime' : kind === 'movie' ? 'Movie' : 'TV Show'}</span>
            {slide.year && <span><Calendar size={16} /> {slide.year}</span>}
            {slide.rating && <span><Star size={16} /> {slide.rating}</span>}
            {isAnime && slide.format && <span>{slide.format}</span>}
          </div>
          <p className="hero-desc-v2">{slide.overview || slide.description || (isAnime ? 'Discover trending anime on AnimeVault.' : 'Watch movies and TV shows on AnimeVault.')}</p>
          <div className="hero-btns-v2">
            <button className="btn-play-v2" onClick={() => navigate(watchPath)}><Play size={20} fill="black" /> Watch Now</button>
            <button className="btn-info-v2" onClick={() => navigate(isAnime ? '/anime' : '/dramas-movies')}><Info size={20} /> Browse</button>
          </div>
        </div></div>
      </div>}
      {slides.length > 1 && <div className="carousel-dots">{slides.map((x, i) => <button key={`${x.id || x.anilistId}-${i}`} aria-label={`Slide ${i + 1}`} onClick={() => setActive(i)} className={i === active ? 'active' : ''} />)}</div>}
    </div>

    <div className="home-main-v2">
      {loading ? <div className="section-loading">Loading AnimeVault…</div> : <>
        <div className="section-v2">
          <div className="section-header-v2"><div><h2><Sparkles size={19} /> Trending Anime</h2><p>What anime viewers are watching this week.</p></div><Link to="/anime" className="view-all">Explore Anime <ChevronRight size={18} /></Link></div>
          <div className="trending-grid-v2">{anime.slice(0, 12).map((x, i) => <Card key={`anime-${x.anilistId}-${i}`} item={x} type="anime" />)}</div>
        </div>

        <div className="section-v2">
          <div className="section-header-v2"><div><h2><Play size={19} /> Recently Added Anime</h2><p>Fresh anime now available to watch.</p></div><Link to="/anime" className="view-all">Browse Anime <ChevronRight size={18} /></Link></div>
          <div className="trending-grid-v2">{animeRecent.slice(0, 12).map((x, i) => <Card key={`recent-anime-${x.anilistId}-${i}`} item={x} type="anime" />)}</div>
        </div>

        <div className="section-v2">
          <div className="section-header-v2"><div><h2><Film size={19} /> Movies</h2><p>Latest movies and top picks.</p></div><Link to="/dramas-movies" className="view-all">Explore Movies <ChevronRight size={18} /></Link></div>
          <div className="trending-grid-v2">{movies.slice(0, 12).map(x => <Card key={x.id} item={x} type="movie" />)}</div>
        </div>

        <div className="section-v2">
          <div className="section-header-v2"><div><h2><Tv size={19} /> TV Shows</h2><p>Popular series and dramas.</p></div><Link to="/dramas-movies" className="view-all">Explore Shows <ChevronRight size={18} /></Link></div>
          <div className="trending-grid-v2">{tvShows.slice(0, 12).map(x => <Card key={x.id} item={x} type="tv" />)}</div>
        </div>
      </>}
    </div>
  </section>;
}
