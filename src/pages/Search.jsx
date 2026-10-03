import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowDownWideNarrow, Clapperboard, Film, Search as SearchIcon, SlidersHorizontal,
  Sparkles, Star, Tv, X,
} from 'lucide-react';
import { searchMoviesAndSeries, fetchLatestMovies, fetchLatestTVShows } from '../api/movies';
import { searchAniPM, getAniPMRecent } from '../api/anipm';
import TMDBPoster from '../components/TMDBPoster';
import '../styles/searchPage.css';

const PAGE_SIZE = 20;
const MEDIA_FILTERS = [
  { id: 'all', label: 'All results', icon: SlidersHorizontal },
  { id: 'anime', label: 'Anime', icon: Sparkles },
  { id: 'movie', label: 'Movies', icon: Film },
  { id: 'tv', label: 'TV shows', icon: Tv },
];
const COMMON_GENRES = [
  'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary', 'Drama',
  'Fantasy', 'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life',
  'Sports', 'Supernatural', 'Thriller',
];
const SORT_OPTIONS = [
  ['relevance', 'Relevance'],
  ['popular', 'Most popular'],
  ['rating', 'Top rated'],
  ['newest', 'Newest'],
  ['title', 'Title A–Z'],
];

function getTitle(item) {
  const value = item.title || item.name;
  if (typeof value === 'string') return value;
  return value?.english || value?.romaji || value?.native || 'Untitled';
}

function normalizeGenres(item) {
  const source = item.genres || item.genre || item.tags || [];
  const values = Array.isArray(source) ? source : [source];
  return values
    .flatMap(value => {
      const label = typeof value === 'string' ? value : value?.name || value?.label || value?.description;
      return typeof label === 'string' ? label.split(',') : [];
    })
    .filter(Boolean)
    .map(value => String(value).trim())
    .filter(Boolean);
}

function normalizeAnime(item) {
  const poster = typeof item.poster === 'string'
    ? item.poster
    : item.poster?.large || item.poster?.url || item.image || item.coverImage?.extraLarge || item.coverImage?.large || '';
  return {
    ...item,
    id: item.anilistId || item.id,
    title: getTitle(item),
    poster,
    mediaType: 'anime',
    genres: normalizeGenres(item),
    year: item.year || item.seasonYear || '',
    rating: Number(item.rating ?? item.score ?? item.averageScore) || 0,
    popularity: Number(item.popularity) || 0,
  };
}

function dedupe(items) {
  const seen = new Set();
  return items.filter(item => {
    const key = `${item.mediaType}:${item.tmdbId || item.anilistId || item.id}`;
    if (!item.id || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function matchesGenre(item, genre) {
  if (!genre) return true;
  return normalizeGenres(item).some(name => name.toLowerCase().includes(genre.toLowerCase()));
}

function mediaKind(item) {
  return item.mediaType === 'anime' ? 'anime' : item.mediaType === 'series' || item.type === 'series' || item.mediaType === 'tv' ? 'tv' : 'movie';
}

export default function Search() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  const searchQuery = params.get('q') || '';
  const mediaFilter = params.get('media') || 'all';
  const genreFilter = params.get('genre') || '';
  const sortBy = params.get('sort') || 'relevance';
  const page = Math.max(1, Number(params.get('page')) || 1);

  useEffect(() => {
    let active = true;
    setQuery(searchQuery);
    setLoading(true);
    setError('');
    if (page === 1) setResults([]);

    async function loadResults() {
      const responses = searchQuery.trim()
        ? await Promise.allSettled([
            searchMoviesAndSeries(searchQuery.trim(), page),
            searchAniPM(searchQuery.trim(), page, PAGE_SIZE),
          ])
        : await Promise.allSettled([
            fetchLatestMovies(page),
            fetchLatestTVShows(page),
            getAniPMRecent(page, PAGE_SIZE),
          ]);

      if (!active) return;
      const failures = responses.filter(result => result.status === 'rejected').length;
      const valueAt = index => responses[index]?.status === 'fulfilled' ? responses[index].value : [];
      if (failures === responses.length) {
        setError('Search is unavailable right now. Please try again.');
        if (page === 1) setResults([]);
        setLoading(false);
        return;
      }

      const movieItems = valueAt(0);
      const tvItems = searchQuery.trim() ? [] : valueAt(1);
      const animeResponse = searchQuery.trim() ? valueAt(1) : valueAt(2);
      const animeItems = Array.isArray(animeResponse)
        ? animeResponse
        : animeResponse?.data || [];
      const normalized = [
        ...animeItems.map(normalizeAnime),
        ...movieItems,
        ...tvItems,
      ];
      setResults(previous => dedupe(page === 1 ? normalized : [...previous, ...normalized]));
      if (failures === responses.length) setError('Search providers did not return results.');
      setLoading(false);
    }

    void loadResults().catch(loadError => {
      if (!active) return;
      setError(loadError?.message || 'Search is unavailable right now. Please try again.');
      setLoading(false);
    });
    return () => { active = false; };
  }, [page, searchQuery, retryKey]);

  const genres = useMemo(() => {
    const found = new Set(results.flatMap(normalizeGenres));
    return [...new Set([...COMMON_GENRES.filter(name => [...found].some(value => value.toLowerCase() === name.toLowerCase())), ...found])]
      .sort((a, b) => a.localeCompare(b));
  }, [results]);

  const filteredResults = useMemo(() => {
    const list = results.filter(item => {
      const kind = mediaKind(item);
      return (mediaFilter === 'all' || mediaFilter === kind) && matchesGenre(item, genreFilter);
    });
    if (sortBy === 'popular') return [...list].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    if (sortBy === 'rating') return [...list].sort((a, b) => (b.rating || b.averageScore || 0) - (a.rating || a.averageScore || 0));
    if (sortBy === 'newest') return [...list].sort((a, b) => String(b.year || '').localeCompare(String(a.year || '')));
    if (sortBy === 'title') return [...list].sort((a, b) => getTitle(a).localeCompare(getTitle(b)));
    return list;
  }, [results, mediaFilter, genreFilter, sortBy]);

  const hasMore = results.length > 0 && results.length >= page * PAGE_SIZE;

  function updateFilters(changes) {
    setParams(previous => {
      const next = new URLSearchParams(previous);
      Object.entries(changes).forEach(([key, value]) => {
        if (!value || value === 'all' || value === 'relevance') next.delete(key);
        else next.set(key, value);
      });
      next.delete('page');
      return next;
    });
  }

  function submit(event) {
    event.preventDefault();
    const next = new URLSearchParams(params);
    const value = query.trim();
    if (value) next.set('q', value);
    else next.delete('q');
    next.delete('page');
    setParams(next);
  }

  function loadMore() {
    setParams(previous => {
      const next = new URLSearchParams(previous);
      next.set('page', String(page + 1));
      return next;
    });
  }

  return (
    <div className="search-page-redesign">
      <header className="search-intro">
        <span className="search-eyebrow"><Clapperboard size={14} /> ANIMEVAULT DISCOVERY</span>
        <h1>Find your next <span>favorite.</span></h1>
        <p>Search anime, movies, and series in one place.</p>
        <form className="search-main-form" onSubmit={submit} role="search">
          <SearchIcon size={20} aria-hidden="true" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search titles, shows, anime…"
            aria-label="Search all titles"
          />
          {query && <button className="search-clear" type="button" onClick={() => setQuery('')} aria-label="Clear search"><X size={17} /></button>}
          <button className="search-submit" type="submit">Search</button>
        </form>
      </header>

      <section className="search-toolbar" aria-label="Search filters">
        <div className="search-media-filters" role="group" aria-label="Filter by media type">
          {MEDIA_FILTERS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => updateFilters({ media: id })} className={mediaFilter === id ? 'active' : ''} aria-pressed={mediaFilter === id}>
              <Icon size={15} />{label}
            </button>
          ))}
        </div>
        <div className="search-refinements">
          <label className="search-select-wrap">
            <span>Genre</span>
            <select value={genreFilter} onChange={event => updateFilters({ genre: event.target.value })} aria-label="Filter by genre">
              <option value="">All genres</option>
              {genres.map(genre => <option key={genre} value={genre}>{genre}</option>)}
            </select>
          </label>
          <label className="search-select-wrap search-sort-wrap">
            <ArrowDownWideNarrow size={15} />
            <select value={sortBy} onChange={event => updateFilters({ sort: event.target.value })} aria-label="Sort results">
              {SORT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
      </section>

      <section className="search-results-section" aria-live="polite">
        <div className="search-results-heading">
          <div>
            <span className="search-results-kicker">{searchQuery ? 'SEARCH RESULTS' : 'CURATED FOR YOU'}</span>
            <h2>{searchQuery ? <>Results for <span>“{searchQuery}”</span></> : 'Explore titles'}</h2>
          </div>
          {!loading && <span className="search-result-count">{filteredResults.length} {filteredResults.length === 1 ? 'title' : 'titles'}</span>}
        </div>

        {loading && results.length === 0 ? (
          <div className="search-results-grid" aria-label="Loading results">
            {Array.from({ length: 12 }, (_, index) => <div className="search-card-skeleton" key={index} />)}
          </div>
        ) : error && results.length === 0 ? (
          <div className="search-empty-state" role="alert"><SearchIcon size={28} /><h3>Couldn’t load results</h3><p>{error}</p>          <button type="button" onClick={() => setRetryKey(value => value + 1)}>Try again</button></div>
        ) : filteredResults.length === 0 ? (
          <div className="search-empty-state"><SearchIcon size={28} /><h3>No titles found</h3><p>Try a different search, media type, or genre.</p>{(mediaFilter !== 'all' || genreFilter) && <button type="button" onClick={() => updateFilters({ media: 'all', genre: '' })}>Clear filters</button>}</div>
        ) : (
          <>
            <div className="search-results-grid">
              {filteredResults.map((item, index) => {
                const kind = mediaKind(item);
                const title = getTitle(item);
                const id = item.tmdbId || item.anilistId || item.id;
                const poster = item.poster || item.image || item.coverImage?.extraLarge || item.coverImage?.large || '';
                const destination = kind === 'anime' ? `/anime/${id}` : `/media/${kind}/${id}`;
                const rating = Number(item.rating ?? item.averageScore ?? item.score) || 0;
                const genres = normalizeGenres(item).slice(0, 2);
                return (
                  <Link key={`${kind}-${id}-${index}`} to={destination} className="search-result-card">
                    <div className="search-result-poster">
                      <TMDBPoster
                        title={title}
                        year={item.year || item.seasonYear}
                        mediaType={kind === 'movie' ? 'movie' : 'tv'}
                        requireAnimation={kind === 'anime'}
                        alternateTitles={[item.nativeTitle, item.title?.romaji, item.title?.native, item.title?.english]}
                        fallbackSrc={poster}
                        alt={title}
                        loading={index < 8 ? 'eager' : 'lazy'}
                        fetchpriority={index < 4 ? 'high' : 'auto'}
                        decoding="async"
                      />
                      <span className={`search-result-type ${kind}`}>{kind === 'anime' ? 'Anime' : kind === 'movie' ? 'Movie' : 'TV series'}</span>
                      {rating > 0 && <span className="search-result-rating"><Star size={12} fill="currentColor" /> {rating > 10 ? (rating / 10).toFixed(1) : rating.toFixed(1)}</span>}
                      <span className="search-result-open"><SearchIcon size={18} /></span>
                    </div>
                    <div className="search-result-info">
                      <h3>{title}</h3>
                      <div className="search-result-meta">{item.year || item.seasonYear || 'Year unknown'}{item.format && kind === 'anime' ? ` · ${item.format}` : ''}</div>
                      {genres.length > 0 && <div className="search-result-genres">{genres.map(name => <span key={name}>{name}</span>)}</div>}
                    </div>
                  </Link>
                );
              })}
            </div>
            {hasMore && <div className="search-load-more-wrap"><button type="button" className="search-load-more" onClick={loadMore} disabled={loading}>{loading ? 'Loading…' : 'Load more titles'}</button></div>}
            {error && <p className="search-inline-error" role="status">{error} Some results may be missing.</p>}
          </>
        )}
      </section>
    </div>
  );
}
