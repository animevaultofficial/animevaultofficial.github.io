import React, { useState, useEffect } from 'react';
import { Film, Tv, TrendingUp, Search, X, Play, Info, Sparkles, Hash } from 'lucide-react';
import { fetchLatestMovies, fetchLatestTVShows, searchMoviesAndSeries } from '../api/movies';
import { searchAnime, getTitle as getAnimeTitle, getImage as getAnimeImage } from '../api/anilist';

const GENRES = ['Action', 'Romance', 'Thriller', 'Horror', 'Comedy', 'Drama', 'Sci-Fi', 'Crime', 'Fantasy', 'Mystery', 'Adventure', 'Animation'];
const FEATURED_SHOWS = [
  { id: 200709, name: 'Weak Hero Class 1', media_type: 'tv', year: '2022', rating: '8.6', banner: 'https://images.metahub.space/background/medium/tt20234568/img', description: 'A model student uses wits, psychology, and tools to fight school violence.', genre: 'Action, Drama, Youth' },
  { id: 228547, name: 'When I Fly Towards You', media_type: 'tv', year: '2023', rating: '8.6', banner: 'https://image.tmdb.org/t/p/original/3nWfjIBUyYUCABI7Fsl1AhNhDAr.jpg', description: 'A warm school romance between an optimistic student and a cold transfer student.', genre: 'Romance, Youth, Comedy' },
  { id: 218539, name: 'My Demon', media_type: 'tv', year: '2023', rating: '7.7', banner: 'https://image.tmdb.org/t/p/original/pRStZQlU0aB6KaVNBKnyEAygDBw.jpg', description: 'A powerless demon becomes tangled with a cold-hearted heiress.', genre: 'Fantasy, Romance, Comedy' },
  { id: 872585, name: 'Oppenheimer', media_type: 'movie', year: '2023', rating: '8.4', banner: 'https://image.tmdb.org/t/p/original/nb3xI8XI3w4pMVZ38VijbsyBqP4.jpg', description: 'The story of J. Robert Oppenheimer and the atomic bomb.', genre: 'Biography, Drama, History' },
  { id: 693134, name: 'Dune: Part Two', media_type: 'movie', year: '2024', rating: '8.6', banner: 'https://images.metahub.space/background/medium/tt15239678/img', description: 'Paul Atreides unites with Chani and the Fremen seeking revenge.', genre: 'Sci-Fi, Adventure, Action' }
];

function normalizeAnimeResults(data) {
  if (Array.isArray(data)) return data.filter(Boolean);
  if (Array.isArray(data?.Page?.media)) return data.Page.media.filter(Boolean);
  if (Array.isArray(data?.media)) return data.media.filter(Boolean);
  return [];
}

function safeTitle(value) {
  if (!value) return 'Unknown';
  if (typeof value === 'string') return value;
  return value?.english || value?.romaji || value?.native || 'Unknown';
}

function MediaCard({ item, onClick }) {
  const isAnime = item?._type === 'anime';
  const title = isAnime ? getAnimeTitle(item) : safeTitle(item?.title || item?.name);
  const image = isAnime ? getAnimeImage(item) : (item?.poster_path ? `https://image.tmdb.org/t/p/w342${item.poster_path}` : null);
  const date = isAnime ? item?.seasonYear : (item?.release_date || item?.first_air_date || '');
  const year = date ? String(date).split('-')[0] : '';
  const type = isAnime ? '✨' : item?.media_type === 'movie' ? '🎬' : '📺';
  const numericRating = Number(isAnime ? item?.averageScore : item?.vote_average);
  const rating = Number.isFinite(numericRating) && numericRating > 0 ? (isAnime ? `${numericRating}%` : numericRating.toFixed(1)) : '';

  return (
    <div className="gcard" onClick={() => onClick?.(item)}>
      {image ? <img src={image} alt={title} className="gcard-img" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : <div className="gcard-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', background: 'var(--surface2)' }}>{type}</div>}
      <div className="gcard-title">{title}</div>
      <div style={{ padding: '0 0.5rem 0.5rem', fontSize: '0.62rem', color: 'var(--text3)', display: 'flex', gap: '.35rem', alignItems: 'center' }}>
        <span>{year || '—'}</span>
        {rating ? <span>⭐ {rating}</span> : null}
        <span>{isAnime ? 'Anime' : item?.media_type === 'movie' ? 'Movie' : 'Drama/Show'}</span>
      </div>
    </div>
  );
}

function HeroCard({ item, onClick }) {
  const title = safeTitle(item?.title || item?.name);
  const bgUrl = item?.banner || (item?.backdrop_path ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}` : null);
  const rating = Number(item?.rating ?? item?.vote_average);
  const ratingText = Number.isFinite(rating) && rating > 0 ? `⭐ ${item?.rating ?? rating.toFixed(1)}` : '';
  const year = item?.year || item?.release_date?.split?.('-')?.[0] || '';
  return (
    <div className="hero" onClick={() => onClick?.(item)} style={{ height: 280, background: bgUrl ? `linear-gradient(180deg, rgba(3,15,22,.18), rgba(3,15,22,.96)), url(${bgUrl}) center/cover` : 'var(--surface2)' }}>
      <div className="hc">
        <div className="hbadge"><Sparkles size={10} /> Featured</div>
        <div className="htitle">{title}</div>
        <div className="hsub">{ratingText}{year ? ` · ${year}` : ''}{item?.genre ? ` · ${item.genre}` : item?.media_type === 'movie' ? ' · Movie' : ' · Drama/Show'}</div>
        {item?.description && <p style={{ fontSize: '.75rem', color: 'var(--text2)', lineHeight: 1.4, maxHeight: 42, overflow: 'hidden', margin: '.45rem 0 .75rem' }}>{item.description}</p>}
        <div style={{ display: 'flex', gap: '.6rem' }}>
          <button style={{ background: 'var(--brand)', color: '#fff', border: 'none', padding: '.5rem .9rem', borderRadius: 8, fontWeight: 800, fontSize: '.75rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}><Play size={13} fill="currentColor" /> Watch</button>
          <button style={{ background: 'rgba(255,255,255,.1)', color: '#fff', border: '1px solid rgba(255,255,255,.2)', padding: '.5rem .9rem', borderRadius: 8, fontWeight: 700, fontSize: '.75rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}><Info size={13} /> Details</button>
        </div>
      </div>
    </div>
  );
}

export default function DramasMoviesPage({ navigate }) {
  const [tab, setTab] = useState('movies');
  const [movies, setMovies] = useState([]);
  const [tvShows, setTvShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [movieData, tvData] = await Promise.all([fetchLatestMovies(), fetchLatestTVShows()]);
        if (cancelled) return;
        setMovies(Array.isArray(movieData?.results) ? movieData.results.filter(Boolean) : []);
        setTvShows(Array.isArray(tvData?.results) ? tvData.results.filter(Boolean) : []);
      } catch (error) {
        console.warn('[AnimeVault Mobile] media home failed:', error?.message || error);
        if (!cancelled) { setMovies([]); setTvShows([]); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!FEATURED_SHOWS.length) return undefined;
    const i = setInterval(() => setSlide(p => (p + 1) % FEATURED_SHOWS.length), 6000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) { setSearchResults([]); setSearching(false); return undefined; }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const [tmdbResults, animeData] = await Promise.all([
          searchMoviesAndSeries(trimmed),
          searchAnime(trimmed).catch(() => [])
        ]);
        if (cancelled) return;
        const animeResults = normalizeAnimeResults(animeData).map(item => ({ ...item, _type: 'anime' }));
        const safeTmdb = Array.isArray(tmdbResults) ? tmdbResults.filter(Boolean) : [];
        setSearchResults([...safeTmdb, ...animeResults]);
      } catch (error) {
        console.warn('[AnimeVault Mobile] combined search failed:', error?.message || error);
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [searchQuery]);

  const handleMediaClick = (item) => {
    if (!item) return;
    if (item._type === 'anime') {
      if (item.id != null) navigate('anime-detail', { id: item.id });
      return;
    }
    if (item.id == null) return;
    const mediaType = item.media_type === 'movie' ? 'movie' : 'tv';
    navigate('drama-detail', { id: item.id, mediaType, title: item.title || item.name || 'Unknown', poster: item.poster_path || null });
  };

  const displayItems = tab === 'movies' ? movies : tvShows;
  const slides = FEATURED_SHOWS;

  return (
    <div className="page">
      {slides.length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <HeroCard item={slides[slide] || slides[0]} onClick={handleMediaClick} />
          <div className="hdots" style={{ marginTop: '-1.5rem', position: 'relative', zIndex: 3, display: 'flex', gap: 4, justifyContent: 'flex-end', padding: '0 1rem' }}>
            {slides.map((_, i) => <div key={i} className={`hdot ${i === slide ? 'active' : 'inactive'}`} style={{ cursor: 'pointer' }} onClick={() => setSlide(i)} />)}
          </div>
        </div>
      )}

      <div className="sec">
        <div className="search-bar" style={{ marginBottom: 0 }}>
          <Search size={16} color="var(--text3)" />
          <input type="text" placeholder="Search anime, movies, dramas & shows..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          {searchQuery && <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer' }}><X size={16} /></button>}
        </div>
      </div>

      <div className="tbar" style={{ margin: '0 .75rem .75rem' }}>
        {[{ id: 'movies', label: '🎬 Movies' }, { id: 'tv', label: '📺 Dramas & Shows' }].map(t => <button key={t.id} className={`titem ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>

      {searchQuery ? (
        <div className="sec" style={{ padding: '0 .75rem' }}>
          <div className="shdr"><span className="sttl"><Search size={14} /> Results ({searchResults.length})</span></div>
          {searching ? <div className="hscroll">{[1,2,3,4,5,6].map(i => <div key={i} className="skel shimmer" />)}</div> : searchResults.length > 0 ? <div className="g3">{searchResults.map((item, idx) => <MediaCard key={item._type === 'anime' ? `anime-${item.id ?? idx}` : `${item.media_type || 'media'}-${item.id ?? idx}`} item={item} onClick={handleMediaClick} />)}</div> : <div className="empty compact" style={{ minHeight: 80 }}><p>No results found</p></div>}
        </div>
      ) : (
        <>
          <div className="sec" style={{ padding: '0 .75rem' }}>
            <div className="shdr"><span className="sttl"><TrendingUp size={14} /> Trending {tab === 'movies' ? 'Movies' : 'Dramas & Shows'}</span></div>
            {loading ? <div className="hscroll">{[1,2,3,4,5,6].map(i => <div key={i} className="skel shimmer" />)}</div> : <div className="hscroll">{displayItems.map((item, idx) => <div key={item.id ?? idx} className="card" onClick={() => handleMediaClick(item)}><img src={item.poster_path ? `https://image.tmdb.org/t/p/w342${item.poster_path}` : '/logo.png'} alt={safeTitle(item.title || item.name)} className="card-img" /><div className="card-body"><div className="card-title">{safeTitle(item.title || item.name)}</div><div className="card-sub">{Number(item.vote_average) > 0 ? `⭐ ${Number(item.vote_average).toFixed(1)}` : ''}</div></div></div>)}</div>}
          </div>

          <div className="sec" style={{ padding: '0 .75rem' }}>
            <div className="shdr"><span className="sttl"><Film size={14} /> All {tab === 'movies' ? 'Movies' : 'Dramas & Shows'}</span></div>
            {loading ? <div className="g3">{[1,2,3,4,5,6].map(i => <div key={i} className="shimmer" style={{ aspectRatio: '2/3', borderRadius: 'var(--radius)' }} />)}</div> : <div className="g3">{displayItems.slice(0, 30).map((item, idx) => <MediaCard key={item.id ?? idx} item={{ ...item, media_type: tab === 'movies' ? 'movie' : 'tv' }} onClick={handleMediaClick} />)}</div>}
          </div>

          <div className="sec" style={{ padding: '0 .75rem' }}>
            <div className="shdr"><span className="sttl"><Tv size={14} /> Browse by Genre</span></div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{GENRES.map(g => <span key={g} style={{ background: 'var(--surface)', color: 'var(--text3)', padding: '6px 14px', borderRadius: 20, fontSize: '0.78rem', border: '1px solid var(--border)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Hash size={11} />{g}</span>)}</div>
          </div>
        </>
      )}
    </div>
  );
}
