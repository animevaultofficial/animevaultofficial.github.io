import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import PremiumAnimeCard from '../components/PremiumAnimeCard';
import { searchAnime, fetchTrendingMedia } from '../api/anilist';
import { searchMoviesAndSeries, fetchLatestMovies, fetchLatestTVShows } from '../api/movies';
import { getFavoritesLocal, addFavoriteLocal, removeFavoriteLocal } from '../api/db';
import { Search as SearchIcon, Filter, TrendingUp, Calendar, Star, Zap, ChevronRight, Clock, AlertTriangle, Sparkles, Film } from 'lucide-react';

const GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy',
  'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life',
  'Sports', 'Supernatural', 'Thriller', 'Ecchi', 'Mecha',
  'Psychological', 'Historical', 'Music', 'Military'
];

const TYPES = ['ALL', 'ANIME', 'MANGA', 'MOVIES/SERIES'];
const SORT_OPTIONS = [
  { value: 'TRENDING', label: 'Trending' },
  { value: 'POPULARITY', label: 'Popularity' },
  { value: 'SCORE', label: 'Score' },
  { value: 'FAVOURITES', label: 'Favorites' },
  { value: 'UPDATED', label: 'Updated' }
];
const STATUS_OPTIONS = [
  { value: 'All', label: 'All' },
  { value: 'RELEASING', label: 'Airing' },
  { value: 'FINISHED', label: 'Completed' },
  { value: 'NOT_YET_RELEASED', label: 'Upcoming' },
  { value: 'HIATUS', label: 'Hiatus' },
  { value: 'CANCELLED', label: 'Cancelled' }
];

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = ['All', ...Array.from({ length: 30 }, (_, i) => currentYear - i)];

function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [results, setResults] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [selectedGenre, setSelectedGenre] = useState(searchParams.get('genre') || '');
  const [selectedType, setSelectedType] = useState(searchParams.get('type') || 'ALL');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'TRENDING');
  const [status, setStatus] = useState(searchParams.get('status') || 'All');
  const [year, setYear] = useState(searchParams.get('year') || 'All');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [favoritesData, setFavoritesData] = useState({ animes: [], studios: [], characters: [] });
  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('animevault_search_history') || '[]');
    } catch {
      return [];
    }
  });

  // Load favorites from db
  useEffect(() => {
    const loadFavs = async () => {
      const favs = await getFavoritesLocal(); // dummy user id
      setFavoritesData(favs);
    };
    loadFavs();
  }, []);

  // Load trending on mount
  useEffect(() => {
    const loadTrending = async () => {
      try {
        const data = await fetchTrendingMedia('ANIME');
        setTrending(data.slice(0, 10));
      } catch (err) {
        console.error('Failed to load trending:', err);
      }
    };
    loadTrending();
  }, []);

  useEffect(() => {
    const q = searchParams.get('q');
    const genre = searchParams.get('genre');
    const type = searchParams.get('type') || 'ANIME';
    const sort = searchParams.get('sort') || 'TRENDING';
    const st = searchParams.get('status') || 'All';
    const yr = searchParams.get('year') || 'All';

    setQuery(q || '');
    setSelectedGenre(genre || '');
    setSelectedType(type || 'ALL');
    setSortBy(sort);
    setStatus(st);
    setYear(yr);

    if (q || genre || st !== 'All' || yr !== 'All') {
      runSearch(q, genre, type, sort, st, yr);
    } else {
      loadTrendingForResults(type);
    }
  }, [searchParams]);

  async function loadTrendingForResults(typeToLoad) {
    try {
      setLoading(true);
      setError('');
      let data;
      if (typeToLoad === 'ALL') {
        const [anime, manga, movies, tv] = await Promise.all([
          fetchTrendingMedia('ANIME').catch(() => []),
          fetchTrendingMedia('MANGA').catch(() => []),
          fetchLatestMovies(1).catch(() => []),
          fetchLatestTVShows(1).catch(() => []),
        ]);
        data = [
          ...(anime || []).slice(0, 12).map(i => ({ ...i, _resultType: 'ANIME' })),
          ...(manga || []).slice(0, 8).map(i => ({ ...i, _resultType: 'MANGA' })),
          ...(movies || []).slice(0, 6).map(i => ({ ...i, _resultType: 'MOVIE' })),
          ...(tv || []).slice(0, 6).map(i => ({ ...i, _resultType: 'SERIES' })),
        ];
      } else if (typeToLoad === 'MOVIES/SERIES') {
        const [movies, tv] = await Promise.all([
          fetchLatestMovies(1),
          fetchLatestTVShows(1),
        ]);
        data = [...(movies || []).map(i => ({ ...i, _resultType: 'MOVIE' })), ...(tv || []).map(i => ({ ...i, _resultType: 'SERIES' }))];
      } else {
        data = await fetchTrendingMedia(typeToLoad);
        data = (data || []).map(i => ({ ...i, _resultType: typeToLoad }));
      }
      setResults(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load trending');
    } finally {
      setLoading(false);
    }
  }

  async function runSearch(searchTerm, genreFilter, typeFilter, sortFilter, statusFilter, yearFilter) {
    try {
      setLoading(true);
      setError('');
      const trimmedSearch = (searchTerm || '').trim();
      
      // Save search history if query exists
      if (trimmedSearch) {
        setSearchHistory(prev => {
          const newHistory = [trimmedSearch, ...prev.filter(h => h.toLowerCase() !== trimmedSearch.toLowerCase())].slice(0, 10);
          localStorage.setItem('animevault_search_history', JSON.stringify(newHistory));
          return newHistory;
        });
      }

      let data;
      if (typeFilter === 'ALL') {
        // Fetch from ALL categories in parallel
        const [anime, manga, moviesData] = await Promise.all([
          searchAnime(
            trimmedSearch || null, 'ANIME', genreFilter || null, 1, 20,
            sortFilter, statusFilter === 'All' ? null : statusFilter,
            yearFilter === 'All' ? null : parseInt(yearFilter)
          ).catch(() => []),
          searchAnime(
            trimmedSearch || null, 'MANGA', genreFilter || null, 1, 15,
            sortFilter, statusFilter === 'All' ? null : statusFilter,
            yearFilter === 'All' ? null : parseInt(yearFilter)
          ).catch(() => []),
          trimmedSearch
            ? searchMoviesAndSeries(trimmedSearch).catch(() => [])
            : Promise.all([fetchLatestMovies(1).catch(() => []), fetchLatestTVShows(1).catch(() => [])]).then(([m, t]) => [...(m || []), ...(t || [])])
        ]);
        data = [
          ...(anime || []).map(i => ({ ...i, _resultType: 'ANIME' })),
          ...(manga || []).map(i => ({ ...i, _resultType: 'MANGA' })),
          ...(moviesData || []).map(i => ({ ...i, _resultType: i.mediaType === 'series' ? 'SERIES' : 'MOVIE' })),
        ];
      } else if (typeFilter === 'MOVIES/SERIES') {
        if (trimmedSearch) {
          data = await searchMoviesAndSeries(trimmedSearch);
        } else {
          const [movies, tv] = await Promise.all([
            fetchLatestMovies(1, genreFilter || ''),
            fetchLatestTVShows(1, genreFilter || ''),
          ]);
          data = [...(movies || []), ...(tv || [])];
        }
        data = (data || []).map(i => ({ ...i, _resultType: i.mediaType === 'series' ? 'SERIES' : 'MOVIE' }));
      } else {
        data = await searchAnime(
          trimmedSearch || null,
          typeFilter,
          genreFilter || null,
          1,
          50,
          sortFilter,
          statusFilter === 'All' ? null : statusFilter,
          yearFilter === 'All' ? null : parseInt(yearFilter)
        );
        data = (data || []).map(i => ({ ...i, _resultType: typeFilter }));
      }
      setResults(data || []);
    } catch (err) {
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  }

  function updateSearchParams({ 
    nextQuery = query, 
    nextGenre = selectedGenre, 
    nextType = selectedType, 
    nextSort = sortBy, 
    nextStatus = status, 
    nextYear = year 
  } = {}) {
    const params = new URLSearchParams();
    params.set('type', nextType);
    params.set('sort', nextSort);
    if (nextStatus !== 'All') params.set('status', nextStatus);
    if (nextYear !== 'All') params.set('year', nextYear);
    const trimmedQuery = nextQuery.trim();
    if (trimmedQuery) params.set('q', trimmedQuery);
    if (nextGenre) params.set('genre', nextGenre);
    setSearchParams(params);
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    updateSearchParams();
  }

  function handleGenreToggle(genre) {
    const newGenre = selectedGenre === genre ? '' : genre;
    setSelectedGenre(newGenre);
    updateSearchParams({ nextGenre: newGenre });
  }

  function getTitle(item) {
    return item?.title?.english || item?.title?.romaji || item?.title?.native || item?.title || item?.name || 'Unknown Title';
  }
  
  function getImage(item) {
    return item?.coverImage?.extraLarge || item?.coverImage?.large || item?.poster || '';
  }

  function toggleFavorite(item) {
    setFavoritesData(prev => {
      const isFav = prev.animes.some(f => f.id === item.id);
      let newFavs;
      if (isFav) {
        newFavs = prev.animes.filter(f => f.id !== item.id);
        removeFavoriteLocal('animes', item.id);
      } else {
        const newItem = { id: item.id, title: getTitle(item), image: getImage(item) };
        newFavs = [...prev.animes, newItem];
        addFavoriteLocal('animes', newItem);
      }
      
      const newData = { ...prev, animes: newFavs };
      return newData;
    });
  }

  const placeholders = selectedType === 'MOVIES/SERIES' ? [
    'Search for "Interstellar"',
    'Search for "Breaking Bad"',
    'Search for "Action Movies"',
    'Search for "Marvel"',
    'Search for "Studio Ghibli Movies"'
  ] : [
    'Search for "Solo Leveling"',
    'Search for "One Piece"',
    'Search for "Romance Anime"',
    'Search for "Time Travel Anime"',
    'Search for "Studio Ghibli"'
  ];
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPlaceholder(prev => (prev + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Debounced real-time search: update search params when user types
  useEffect(() => {
    if (query.trim().length < 2) {
      // show trending when query is too short
      return;
    }
    const debounceTimer = setTimeout(() => {
      updateSearchParams({ nextQuery: query });
    }, 400);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  return (
    <div className="premium-search-page">
      {/* Mobile Sidebar Toggle */}
      <button 
        className="premium-sidebar-toggle" 
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <Filter size={20} />
        <span>Filters</span>
      </button>

      <div className={`premium-layout ${sidebarOpen ? 'sidebar-open' : ''}`}>
        {/* Sidebar */}
        <div className="premium-sidebar">
          <div className="sidebar-header">
            <div className="sidebar-title">
              <Filter size={22} />
              <h2>Filters</h2>
            </div>
            <button 
              className="reset-all-btn" 
              onClick={() => {
                setQuery('');
                setSelectedGenre('');
                setSelectedType('ALL');
                setSortBy('TRENDING');
                setStatus('All');
                setYear('All');
                setSearchParams({ type: 'ALL', sort: 'TRENDING' });
              }}
            >
              Reset
            </button>
          </div>

          {/* Category */}
          <div className="sidebar-section">
            <h3 className="sidebar-section-title">
              <Zap size={16} />
              Category
            </h3>
            <div className="category-tabs">
              {TYPES.map(t => (
                <button
                  key={t}
                  className={`category-tab ${selectedType === t ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedType(t);
                    updateSearchParams({ nextType: t });
                  }}
                >
                  {t === 'MOVIES/SERIES' ? <><Film size={14} /> Movies/Series</> : t}
                </button>
              ))}
            </div>
          </div>

          {/* Sort By */}
          <div className="sidebar-section">
            <h3 className="sidebar-section-title">
              <ChevronRight size={16} />
              Sort By
            </h3>
            <div className="sort-buttons">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  className={`sort-btn ${sortBy === opt.value ? 'active' : ''}`}
                  onClick={() => {
                    setSortBy(opt.value);
                    updateSearchParams({ nextSort: opt.value });
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          {selectedType !== 'MOVIES/SERIES' && (
            <div className="sidebar-section">
              <h3 className="sidebar-section-title">
                <Calendar size={16} />
                Status
              </h3>
              <div className="status-selector">
                {STATUS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    className={`status-option ${status === opt.value ? 'active' : ''}`}
                    onClick={() => {
                      setStatus(opt.value);
                      updateSearchParams({ nextStatus: opt.value });
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Year */}
          {selectedType !== 'MOVIES/SERIES' && (
            <div className="sidebar-section">
              <h3 className="sidebar-section-title">
                <Star size={16} />
                Year
              </h3>
              <select
                className="year-selector"
                value={year}
                onChange={(e) => {
                  setYear(e.target.value);
                  updateSearchParams({ nextYear: e.target.value });
                }}
              >
                {YEAR_OPTIONS.map(yr => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>
          )}

          {/* Genres */}
          {selectedType !== 'MOVIES/SERIES' && (
            <div className="sidebar-section">
              <h3 className="sidebar-section-title">
                <Sparkles size={16} />
                Genres
              </h3>
              <div className="genre-grid">
                {GENRES.map(g => (
                  <button 
                    key={g}
                    className={`genre-pill ${selectedGenre === g ? 'active' : ''}`}
                    onClick={() => handleGenreToggle(g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="premium-main">
          {/* Hero Search */}
          <section className="premium-hero">
            <div className="hero-content">
              <h1>{'Discover Anime, Manga & Movies'}</h1>
              <p>{'Explore over 100,000+ anime, manga, movies & series — all in one place'}</p>
              <form className="hero-search-form" onSubmit={handleSearchSubmit}>
                <SearchIcon className="hero-search-icon" size={24} />
                <input
                  type="text"
                  placeholder={placeholders[currentPlaceholder]}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query && (
                  <button
                    type="button"
                    className="hero-clear-btn"
                    onClick={() => {
                      setQuery('');
                      updateSearchParams({ nextQuery: '' });
                    }}
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}
                <button type="submit" className="hero-search-btn">
                  Search
                </button>
              </form>

              {/* Hero Stats */}
              <div className="hero-stats">
                {selectedType === 'MOVIES/SERIES' ? (
                  <>
                    <div className="hero-stat">
                      <span className="stat-number">500K+</span>
                      <span className="stat-label">Movies</span>
                    </div>
                    <div className="hero-stat">
                      <span className="stat-number">100K+</span>
                      <span className="stat-label">Series</span>
                    </div>
                    <div className="hero-stat">
                      <span className="stat-number">Daily</span>
                      <span className="stat-label">Updates</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="hero-stat">
                      <span className="stat-number">100K+</span>
                      <span className="stat-label">Anime</span>
                    </div>
                    <div className="hero-stat">
                      <span className="stat-number">50K+</span>
                      <span className="stat-label">Manga</span>
                    </div>
                    <div className="hero-stat">
                      <span className="stat-number">Daily</span>
                      <span className="stat-label">Updates</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>



          {/* Search History */}
          {searchHistory.length > 0 && !query && (
            <section className="premium-section">
              <div className="section-header">
                <div className="section-title">
                  <Clock size={20} />
                  <h2>Recent Searches</h2>
                </div>
                <button 
                  className="see-all-btn"
                  onClick={() => {
                    setSearchHistory([]);
                    localStorage.removeItem('animevault_search_history');
                  }}
                >
                  Clear All
                </button>
              </div>
              <div className="search-history-grid">
                {searchHistory.map((term, idx) => (
                  <button
                    key={idx}
                    className="history-item"
                    onClick={() => {
                      setQuery(term);
                      updateSearchParams({ nextQuery: term });
                    }}
                  >
                    {term}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Results */}
          <section className="premium-section">
            <div className="section-header">
              <div className="section-title">
                <Sparkles size={20} />
                <h2>{query ? 'Search Results' : 'Discover'}</h2>
                <span className="results-count">
                  {loading ? 'Loading...' : `${results.length} results`}
                </span>
              </div>
              {/* Active Filters */}
              <div className="active-filters">
                {selectedGenre && (
                  <span className="filter-chip">
                    {selectedGenre}
                    <button onClick={() => handleGenreToggle(selectedGenre)}>✕</button>
                  </span>
                )}
                {status !== 'All' && (
                  <span className="filter-chip">
                    {STATUS_OPTIONS.find(opt => opt.value === status)?.label}
                    <button onClick={() => { setStatus('All'); updateSearchParams({ nextStatus: 'All' }); }}>✕</button>
                  </span>
                )}
                {year !== 'All' && (
                  <span className="filter-chip">
                    {year}
                    <button onClick={() => { setYear('All'); updateSearchParams({ nextYear: 'All' }); }}>✕</button>
                  </span>
                )}
              </div>
            </div>

            <div className="premium-results-container">
              {loading && (
                <div className="loading-grid">
                  {Array(12).fill(0).map((_, i) => (
                    <div key={i} className="card-skeleton" />
                  ))}
                </div>
              )}
              {!loading && error && (
                <div className="error-display">
                  <AlertTriangle size={48} />
                  <h3>Something went wrong</h3>
                  <p>{error}</p>
                  <button onClick={() => loadTrendingForResults(selectedType)}>Try Again</button>
                </div>
              )}
              {!loading && !error && results.length === 0 && (
                <div className="empty-results">
                  <Clock size={48} />
                  <h3>No results found</h3>
                  <p>Try adjusting your filters or search term</p>
                </div>
              )}
              {!loading && !error && results.length > 0 && (
                <div className="premium-results-grid">
                  {results.map((media) => {
                    const rType = media._resultType || selectedType;
                    const isMovieSeries = rType === 'MOVIE' || rType === 'SERIES';
                    const isManga = rType === 'MANGA';
                    const linkTo = isMovieSeries
                      ? `/watch/${rType === 'SERIES' ? 'series' : 'movie'}/${media.tmdbId || media.id}`
                      : isManga
                      ? `/manga/${media.id}`
                      : `/anime/${media.id}`;
                    const typeBadge = selectedType === 'ALL' ? rType : null;

                    if (isMovieSeries) {
                      return (
                        <Link
                          key={`${rType}-${media.tmdbId || media.id}`}
                          to={linkTo}
                          className="premium-anime-card"
                        >
                          <div className="premium-card-thumbnail">
                            <img src={getImage(media)} alt={getTitle(media)} className="premium-card-image" />
                            {typeBadge && <div className="premium-card-type-badge">{typeBadge}</div>}
                            <div className="premium-card-score">HD</div>
                          </div>
                          <div className="premium-card-details">
                            <h3 className="premium-card-title">{getTitle(media)}</h3>
                            <div className="premium-card-genres">
                              <span className="premium-genre-tag">{rType === 'SERIES' ? 'Series' : 'Movie'}</span>
                              {media.year && <span className="premium-genre-tag">{media.year}</span>}
                            </div>
                          </div>
                        </Link>
                      );
                    }

                    return (
                      <div key={`${rType}-${media.id}`} style={{ position: 'relative' }}>
                        {typeBadge && (
                          <div style={{
                            position: 'absolute', top: 8, left: 8, zIndex: 5,
                            background: isManga ? 'linear-gradient(135deg, #e91e63, #9c27b0)' : 'linear-gradient(135deg, #2196f3, #00bcd4)',
                            color: '#fff', fontSize: '0.65rem', fontWeight: 700,
                            padding: '2px 8px', borderRadius: '4px', letterSpacing: '0.5px',
                            textTransform: 'uppercase'
                          }}>{typeBadge}</div>
                        )}
                        <PremiumAnimeCard
                          anime={media}
                          isFavorite={favoritesData.animes.some(item => item.id === media.id)}
                          onToggleFavorite={toggleFavorite}
                          linkPrefix={isManga ? '/manga/' : '/anime/'}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default Search;