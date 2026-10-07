import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Play, Calendar, Star, Info, Sparkles, ChevronRight, Film, Tv, Clapperboard } from 'lucide-react';
import { fetchLatestMovies, fetchLatestTVShows, fetchTMDBBackdrop } from '../api/movies';
import { getAniPMTop, getAniPMRecent, getAniPMTitle } from '../api/anipm';
import TMDBPoster from '../components/TMDBPoster';
import { isHentai } from '../utils/animeContent';
import { useUser } from '../api/UserContext';
import { isBlockedForProfile, isKidsProfile } from '../utils/ageRating';
import { KIDS_ANIME_FEATURES, KIDS_FAMILY_MEDIA } from '../utils/kidsCatalog';
import '../styles/homepage.css';

const CACHE_KEY = 'animevault_home_v7';
const TTL = 30 * 60 * 1000;
const readCache = () => {
  try {
    const x = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (!x || Date.now() - x.ts >= TTL) return null;
    return {
      ...x.data,
      anime: (x.data.anime || []).filter(item => !isHentai(item)),
      animeRecent: (x.data.animeRecent || []).filter(item => !isHentai(item)),
      slides: (x.data.slides || []).filter(item => item._kind !== 'anime' || !isHentai(item)),
    };
  } catch {
    return null;
  }
};
const writeCache = data => { try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch {} };

export default function MixedHome({ mobile = false }) {
  const navigate = useNavigate();
  const { activeSubAccount } = useUser();
  const isKidsMode = isKidsProfile(activeSubAccount);
  const cached = readCache();
  const [rawMovies, setMovies] = useState(cached?.movies || []);
  const [rawTvShows, setTvShows] = useState(cached?.tvShows || []);
  const [rawAnime, setAnime] = useState(cached?.anime || []);
  const [rawAnimeRecent, setAnimeRecent] = useState(cached?.animeRecent || []);
  const [rawSlides, setSlides] = useState(cached?.slides || []);
  const isAllowed = item => !isBlockedForProfile(item, activeSubAccount);
  const movies = isKidsMode ? KIDS_FAMILY_MEDIA.filter(item => item.type === 'movie') : rawMovies.filter(isAllowed);
  const tvShows = isKidsMode ? KIDS_FAMILY_MEDIA.filter(item => item.type === 'tv') : rawTvShows.filter(isAllowed);
  const anime = isKidsMode ? KIDS_ANIME_FEATURES : rawAnime.filter(isAllowed);
  const animeRecent = isKidsMode ? KIDS_ANIME_FEATURES : rawAnimeRecent.filter(isAllowed);
  const slides = isKidsMode
    ? [
      ...KIDS_ANIME_FEATURES.slice(0, 2).map(item => ({ ...item, _kind: 'anime' })),
      ...KIDS_FAMILY_MEDIA.slice(0, 2).map(item => ({ ...item, _kind: item.type })),
    ]
    : rawSlides.filter(isAllowed);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.allSettled([
      fetchLatestMovies(1),
      fetchLatestTVShows(1),
      getAniPMTop('week', 12),
      getAniPMRecent(1, 12),
    ]).then(async results => {
      if (cancelled) return;
      const rawMovies = results[0]?.status === 'fulfilled' && Array.isArray(results[0].value) ? results[0].value : [];
      const rawTvShows = results[1]?.status === 'fulfilled' && Array.isArray(results[1].value) ? results[1].value : [];
      const rawAnime = results[2]?.status === 'fulfilled' && Array.isArray(results[2].value) ? results[2].value.filter(item => !isHentai(item)) : [];
      const rawAnimeRecent = results[3]?.status === 'fulfilled' && Array.isArray(results[3].value) ? results[3].value.filter(item => !isHentai(item)) : [];
      const animeFeatured = rawAnime.slice(0, 2).map(x => ({ ...x, _kind: 'anime' }));
      const mediaFeatured = [
        ...rawMovies.slice(0, 2).map(x => ({ ...x, _kind: 'movie' })),
        ...rawTvShows.slice(0, 2).map(x => ({ ...x, _kind: 'tv' })),
      ];
      const rawFeatured = [...animeFeatured, ...mediaFeatured].slice(0, 5);
      setMovies(rawMovies);
      setTvShows(rawTvShows);
      setAnime(rawAnime);
      setAnimeRecent(rawAnimeRecent);
      setSlides(rawFeatured);
      setActive(0);
      setLoading(false);
      writeCache({ movies: rawMovies, tvShows: rawTvShows, anime: rawAnime, animeRecent: rawAnimeRecent, slides: rawFeatured });

      const animeBackdropResults = await Promise.allSettled(animeFeatured.map(async item => {
        const title = item.title?.english || item.title?.romaji || item.title?.native || item.title || item.name || '';
        const alternateTitles = [item.nativeTitle, item.title?.romaji, item.title?.native, item.title?.english].filter(Boolean);
        const mediaType = item.format === 'MOVIE' ? 'movie' : 'tv';
        const [tmdbResult, titleResult] = await Promise.allSettled([
          fetchTMDBBackdrop(title, item.year || item.seasonYear, mediaType, true, alternateTitles),
          item.anilistId ? getAniPMTitle(item.anilistId) : Promise.resolve(null),
        ]);
        const detail = titleResult.status === 'fulfilled' ? titleResult.value : null;
        const providerBanner = [
          detail?.banner,
          detail?.bannerImage,
          detail?.backdrop,
          detail?.backdropImage,
          item.banner,
          item.bannerImage,
          item.backdrop,
        ].find(image => typeof image === 'string' && image);
        const tmdbBackdrop = tmdbResult.status === 'fulfilled' ? tmdbResult.value : null;
        if (tmdbResult.status === 'rejected') {
          console.warn(`[AnimeVault] Could not resolve a high-resolution backdrop for "${title}":`, tmdbResult.reason);
        }
        return { ...item, backdrop: tmdbBackdrop || providerBanner || item.poster || '' };
      }));

      if (!cancelled) {
        const backdropById = new Map(animeBackdropResults
          .filter(result => result.status === 'fulfilled')
          .map(result => [String(result.value.anilistId || result.value.id), result.value.backdrop]));
        const enrichedSlides = rawFeatured.map(item => {
          if (item._kind !== 'anime') return item;
          const backdrop = backdropById.get(String(item.anilistId || item.id));
          return backdrop ? { ...item, backdrop } : item;
        });
        setSlides(enrichedSlides);
        writeCache({ movies: rawMovies, tvShows: rawTvShows, anime: rawAnime, animeRecent: rawAnimeRecent, slides: enrichedSlides });
      }
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeSubAccount]);

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
  const title = slide?.title?.english || slide?.title?.romaji || slide?.title?.native || slide?.title || slide?.name || 'AnimeVault';
  const image = slide?.backdrop || slide?.banner || slide?.poster || '/logo.png';
  const detailsPath = (item, type) => {
    const mediaId = item?.tmdbId || item?.id;
    return mediaId ? `/media/${type === 'movie' ? 'movie' : 'tv'}/${mediaId}` : '/';
  };

  const Card = ({ item, type }) => {
    const animeCard = type === 'anime';
    const title = item.title?.english || item.title?.romaji || item.title?.native || item.title || item.name || '';
    const destination = animeCard
      ? `/anime/${item.anilistId}`
      : detailsPath(item, type);
    return <Link to={destination} className="anime-card-v2" style={{ textDecoration: 'none' }}>
      <div className="card-media">
        <TMDBPoster
          alt={title}
          title={title}
          year={item.year || item.seasonYear}
          mediaType={animeCard ? (item.format === 'MOVIE' ? 'movie' : 'tv') : type}
          requireAnimation={animeCard}
          alternateTitles={animeCard ? [item.nativeTitle, item.title?.romaji, item.title?.native] : []}
          fallbackSrc={item.poster}
          loading="lazy"
          decoding="async"
        />
        <div className="card-overlay"><div className="play-icon-wrapper"><Play fill="white" size={24} /></div></div>
      </div>
      <div className="card-info">
        <h3 className="card-title">{title}</h3>
        <div className="card-meta">
          <span>{animeCard ? 'ANIME' : type === 'movie' ? 'MOVIE' : 'TV SHOW'}</span>
          {(item.year || item.format) && <><span className="dot">•</span><span>{item.year || item.format}</span></>}
        </div>
      </div>
    </Link>;
  };

  const watchPath = !slide ? '/' : isAnime ? `/anime/${id}` : `/watch/${mediaKind}/${id}`;
  const infoPath = !slide ? '/' : isAnime ? `/anime/${id}` : detailsPath(slide, mediaKind);

  return <section className="home-v2 home-v2-reference">
    <div className="hero-v2 hero-carousel-v2" style={{ position: 'relative' }}>
      {slide && <div className="carousel-slide active" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <div className="hero-img-wrapper"><img src={image} alt={title} loading="eager" decoding="async" /><div className="hero-overlay-v2" /></div>
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
            <button className="btn-play-v2" onClick={() => navigate(watchPath)}><Play size={18} fill="currentColor" /> Play</button>
            <button className="btn-info-v2" onClick={() => navigate(infoPath)}><Info size={18} /> More info</button>
          </div>
        </div></div>
      </div>}
      {slides.length > 1 && <div className="carousel-dots">{slides.map((x, i) => <button key={`${x.id || x.anilistId}-${i}`} aria-label={`Slide ${i + 1}`} onClick={() => setActive(i)} className={i === active ? 'active' : ''} />)}</div>}
    </div>
    {anime.length > 0 && <section className="home-featured-rail" aria-label="Top weekly anime">
      <div className="home-featured-heading">
        <h2>Top Weekly <span>·</span> Animes</h2>
        <Link to="/anime">View all <ChevronRight size={14} /></Link>
      </div>
      <div className="home-featured-grid">
        {anime.slice(0, 8).map((item, index) => <Card key={`weekly-${item.anilistId}-${index}`} item={item} type="anime" />)}
      </div>
    </section>}

    <div className="home-main-v2">
      {loading ? <div className="section-loading">Loading AnimeVault…</div> : <>
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
