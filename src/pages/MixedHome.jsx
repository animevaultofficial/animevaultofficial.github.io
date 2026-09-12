import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, ChevronRight, Film, Tv } from 'lucide-react';
import { fetchLatestMovies, fetchLatestTVShows } from '../api/movies';

export default function MixedHome() {
  const [movies, setMovies] = useState([]);
  const [tvShows, setTvShows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchLatestMovies(1).catch(() => []), fetchLatestTVShows(1).catch(() => [])])
      .then(([m, t]) => { if (!cancelled) { setMovies(m || []); setTvShows(t || []); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const Card = ({ item, kind }) => (
    <Link to={`/watch/${kind === 'movie' ? 'movie' : 'tv'}/${item.tmdbId || item.id}`} className="anime-card-v2" style={{ textDecoration: 'none' }}>
      <div className="card-media"><img src={item.poster} alt={item.title || item.name} loading="lazy" decoding="async" /><div className="card-overlay"><div className="play-icon-wrapper"><Play fill="white" size={24} /></div></div></div>
      <div className="card-info"><h3 className="card-title">{item.title || item.name}</h3><div className="card-meta"><span>{kind === 'movie' ? 'MOVIE' : 'TV SHOW'}</span>{item.year && <><span className="dot">•</span><span>{item.year}</span></>}</div></div>
    </Link>
  );

  return <section className="home-v2"><div className="home-main-v2">
    <div className="section-v2" style={{ paddingTop: 36 }}><div className="section-header-v2"><div><h1>AnimeVault</h1><p>Movies and TV shows</p></div><Link to="/dramas-movies" className="view-all">Browse all <ChevronRight size={18} /></Link></div></div>
    {loading ? <div className="section-loading">Loading movies and TV shows…</div> : <>
      <div className="section-v2"><div className="section-header-v2"><div><h2><Film size={19} /> Movies</h2><p>Popular movies available to watch.</p></div></div><div className="trending-grid-v2">{movies.slice(0, 12).map(item => <Card key={item.id} item={item} kind="movie" />)}</div></div>
      <div className="section-v2"><div className="section-header-v2"><div><h2><Tv size={19} /> TV Shows</h2><p>Popular series and dramas.</p></div></div><div className="trending-grid-v2">{tvShows.slice(0, 12).map(item => <Card key={item.id} item={item} kind="tv" />)}</div></div>
    </>}
  </div></section>;
}
