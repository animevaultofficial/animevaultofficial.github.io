import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search as SearchIcon, Film, Tv } from 'lucide-react';
import { searchMoviesAndSeries, fetchLatestMovies, fetchLatestTVShows } from '../api/movies';

export default function Search() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  async function runSearch(value = query) {
    const q = value.trim();
    setLoading(true);
    try {
      if (q) setResults(await searchMoviesAndSeries(q));
      else {
        const [movies, tv] = await Promise.all([fetchLatestMovies(1), fetchLatestTVShows(1)]);
        setResults([...(movies || []), ...(tv || [])]);
      }
    } finally { setLoading(false); }
  }

  useEffect(() => { runSearch(params.get('q') || ''); }, [params]);

  const submit = e => {
    e.preventDefault();
    const q = query.trim();
    setParams(q ? { q, type: 'MOVIES/SERIES' } : { type: 'MOVIES/SERIES' });
  };

  return <div className="premium-search-page">
    <div className="premium-layout"><main style={{ width: '100%' }}>
      <form onSubmit={submit} style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <SearchIcon size={20} />
        <input className="search-input" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search movies and series..." />
      </form>
      <div className="section-header-v2"><div><h2>{query ? `Results for “${query}”` : 'Movies & TV Shows'}</h2><p>Anime is temporarily unavailable and hidden from search.</p></div></div>
      {loading ? <div className="section-loading">Searching…</div> : <div className="trending-grid-v2">
        {results.map(item => {
          const kind = item.mediaType === 'series' || item.type === 'series' ? 'tv' : 'movie';
          const title = item.title || item.name || 'Unknown Title';
          return <Link key={`${kind}-${item.id}`} to={`/watch/${kind}/${item.tmdbId || item.id}`} className="anime-card-v2" style={{ textDecoration: 'none' }}>
            <div className="card-media"><img src={item.poster} alt={title} loading="lazy" /><div className="card-overlay"><div className="play-icon-wrapper">▶</div></div></div>
            <div className="card-info"><h3 className="card-title">{title}</h3><div className="card-meta"><span>{kind === 'movie' ? <><Film size={12}/> MOVIE</> : <><Tv size={12}/> TV SHOW</>}</span>{item.year && <><span className="dot">•</span><span>{item.year}</span></>}</div></div>
          </Link>;
        })}
      </div>}
    </main></div>
  </div>;
}
