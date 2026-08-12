import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search as SearchIcon, Film, Tv, Play, X, Star, Calendar, Info, Sparkles, Hash, Filter } from 'lucide-react';
import { fetchLatestMovies, fetchLatestTVShows, searchMoviesAndSeries } from '../api/movies';
import { FocusableLink, FocusableButton } from '../components/FocusableWrapper';
import { useUser } from '../api/UserContext';
import { isBlockedForProfile } from '../utils/ageRating';

const MOVIE_GENRES = [
  'Action', 'Romance', 'Thriller', 'Horror', 'Comedy', 'Drama', 'Sci-Fi', 'Crime', 'Fantasy', 'Mystery'
];


const KIDS_MOVIE_GENRES = ['Animation', 'Family', 'Adventure', 'Comedy', 'Fantasy'];

const KIDS_TRENDING_SHOWS = [
  { id: '12', name: 'Finding Nemo', type: 'movie', year: '2003', rating: '8.2', poster: 'https://image.tmdb.org/t/p/w500/eHuGQ10FUzK1mdOY69wF5pGgEf5.jpg', banner: 'https://image.tmdb.org/t/p/original/h3b6pzm7tpomYz2ZVD4Rgoz5EEP.jpg', description: 'A little clownfish gets lost, and his dad crosses the ocean with new friends to bring him home.', genre: 'Animation, Family, Adventure' },
  { id: '862', name: 'Toy Story', type: 'movie', year: '1995', rating: '8.3', poster: 'https://image.tmdb.org/t/p/w500/uXDfjJbdP4ijW5hWSBrPrlKpxab.jpg', banner: 'https://image.tmdb.org/t/p/original/3Rfvhy1Nl6sSGJwyjb0QiZzZYlB.jpg', description: 'Woody, Buzz, and a bedroom full of toys learn about friendship, teamwork, and imagination.', genre: 'Animation, Family, Comedy' },
  { id: '508943', name: 'Luca', type: 'movie', year: '2021', rating: '7.4', poster: 'https://image.tmdb.org/t/p/w500/jTswp6KyDYKtvC52GbHagrZbGvD.jpg', banner: 'https://image.tmdb.org/t/p/original/620hnMVLu6RSZW6a5rwO8gqpt0t.jpg', description: 'Two young sea monsters enjoy a summer of discovery, scooters, and friendship on the Italian Riviera.', genre: 'Animation, Family, Fantasy' },
  { id: '14160', name: 'Up', type: 'movie', year: '2009', rating: '8.0', poster: 'https://image.tmdb.org/t/p/w500/mFvoEwSfLqbcWwFsDjQebn9bzFe.jpg', banner: 'https://image.tmdb.org/t/p/original/hGGC9gKo7CFE3fW07RA587e5kol.jpg', description: 'A balloon-powered house carries an unlikely duo into a colorful wilderness adventure.', genre: 'Animation, Family, Adventure' },
  { id: '92685', name: 'The Owl House', type: 'tv', year: '2020', rating: '8.6', poster: 'https://image.tmdb.org/t/p/w500/zhdy3PcNVE15wj1wrxn45ARZBnx.jpg', banner: 'https://image.tmdb.org/t/p/original/4tS0iyKQBDFqVpVcH21MSJwXZdq.jpg', description: 'A creative teen discovers a magical realm filled with odd creatures, big lessons, and found family.', genre: 'Animation, Family, Fantasy' }
];

const TRENDING_SHOWS = [
  {
    id: '200709',
    name: 'Weak Hero Class 1',
    type: 'tv',
    year: '2022',
    rating: '8.6',
    poster: 'https://images.metahub.space/poster/medium/tt20234568/img',
    banner: 'https://images.metahub.space/background/medium/tt20234568/img',
    description: 'Yeon Shi-eun is a model student, who ranks at the top of his high school. Physically, Yeon Shi-eun appears weak, but by using his wits, psychology, and tools, he fights against the violence that takes place inside and outside of his school.',
    genre: 'Action, Drama, Youth'
  },
  {
    id: '228547',
    name: 'When I Fly Towards You',
    type: 'tv',
    year: '2023',
    rating: '8.6',
    poster: 'https://images.metahub.space/poster/medium/tt27923758/img',
    banner: 'https://image.tmdb.org/t/p/original/3nWfjIBUyYUCABI7Fsl1AhNhDAr.jpg',
    description: 'A warm and sweet school love story follows Su Zaizai, an optimistic and cheerful high school student, who falls for Zhang Lurang, a cold and arrogant transfer student.',
    genre: 'Romance, Youth, Comedy'
  },
  {
    id: '218539',
    name: 'My Demon',
    type: 'tv',
    year: '2023',
    rating: '7.7',
    poster: 'https://images.metahub.space/poster/medium/tt29606822/img',
    banner: 'https://image.tmdb.org/t/p/original/pRStZQlU0aB6KaVNBKnyEAygDBw.jpg',
    description: 'A pitiless demon becomes powerless after getting entangled with a cold-hearted heiress, who may hold the key to his lost abilities and his heart.',
    genre: 'Fantasy, Romance, Comedy'
  },
  {
    id: '872585',
    name: 'Oppenheimer',
    type: 'movie',
    year: '2023',
    rating: '8.4',
    poster: 'https://images.metahub.space/poster/medium/tt15398716/img',
    banner: 'https://image.tmdb.org/t/p/original/nb3xI8XI3w4pMVZ38VijbsyBqP4.jpg',
    description: 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.',
    genre: 'Biography, Drama, History'
  },
  {
    id: '693134',
    name: 'Dune: Part Two',
    type: 'movie',
    year: '2024',
    rating: '8.6',
    poster: 'https://images.metahub.space/poster/medium/tt15239678/img',
    banner: 'https://images.metahub.space/background/medium/tt15239678/img',
    description: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.',
    genre: 'Sci-Fi, Adventure, Action'
  }
];

function DramasMovies() {
  const [activeTab, setActiveTab] = useState('movies'); // 'movies' or 'tv'
  const [selectedGenre, setSelectedGenre] = useState('');
  const [movies, setMovies] = useState([]);
  const [tvShows, setTvShows] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [moviePage, setMoviePage] = useState(1);
  const [tvPage, setTvPage] = useState(1);
  const [activeSlide, setActiveSlide] = useState(0);

  const navigate = useNavigate();
  const { activeSubAccount } = useUser();
  const isKidsProfile = activeSubAccount?.ageRating === 'kids';
  const heroShows = isKidsProfile ? KIDS_TRENDING_SHOWS : TRENDING_SHOWS;
  const genresToShow = isKidsProfile ? KIDS_MOVIE_GENRES : MOVIE_GENRES;

  useEffect(() => {
    loadLatest();
  }, [activeTab, moviePage, tvPage, selectedGenre, activeSubAccount]);

  // Auto-advance slideshow
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % heroShows.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [heroShows.length]);

  async function loadLatest() {
    setLoading(true);
    if (activeTab === 'movies') {
      const data = isKidsProfile && !selectedGenre ? KIDS_TRENDING_SHOWS.filter(item => item.type === 'movie') : await fetchLatestMovies(moviePage, selectedGenre);
      setMovies((data || []).filter(item => !isBlockedForProfile(item, activeSubAccount)));
    } else {
      const data = isKidsProfile && !selectedGenre ? KIDS_TRENDING_SHOWS.filter(item => item.type === 'tv') : await fetchLatestTVShows(tvPage, selectedGenre);
      setTvShows((data || []).filter(item => !isBlockedForProfile(item, activeSubAccount)));
    }
    setLoading(false);
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) {
      setSearching(false);
      setSearchResults([]);
      return;
    }
    setLoading(true);
    setSearching(true);
    setSelectedGenre(''); // Clear genre filter on global query search
    const results = await searchMoviesAndSeries(query);
    setSearchResults((results || []).filter(item => !isBlockedForProfile(item, activeSubAccount)));
    setLoading(false);
  }

  function handleGenreClick(genre) {
    setSearching(false);
    setQuery('');
    if (selectedGenre === genre) {
      setSelectedGenre(''); // Toggle off
    } else {
      setSelectedGenre(genre);
    }
    setMoviePage(1);
    setTvPage(1);
  }

  function clearSearch() {
    setQuery('');
    setSearching(false);
    setSearchResults([]);
  }

  function clearAllFilters() {
    setSelectedGenre('');
    setQuery('');
    setSearching(false);
    setSearchResults([]);
    setMoviePage(1);
    setTvPage(1);
  }

  return (
    <section className="home-v2 dramas-movies-page" style={{ paddingBottom: '3rem' }}>
      {/* Immersive Hero Slideshow Carousel (Flashcards) */}
      {!searching && !selectedGenre && (
        <div className="hero-v2 hero-carousel-v2" style={{ position: 'relative', overflow: 'hidden', height: '520px', marginBottom: '2.5rem' }}>
          {heroShows.map((show, index) => {
            const isActive = index === activeSlide;
            return (
              <div
                key={show.id}
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
                  zIndex: isActive ? 2 : 1
                }}
              >
                <div className="hero-img-wrapper" style={{ width: '100%', height: '100%' }}>
                  <img src={show.banner} alt={show.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div className="hero-overlay-v2" />
                </div>
                <div className="hero-content-v2" style={{ zIndex: 5 }}>
                  <div className="hero-info-v2" style={{
                    transform: isActive ? 'translateY(0)' : 'translateY(20px)',
                    opacity: isActive ? 1 : 0,
                    transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s'
                  }}>
                    <span className="hero-rank" style={{
                      color: 'var(--brand-color)',
                      background: 'rgba(0,0,0,0.6)',
                      border: '1px solid var(--brand-color)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      width: 'fit-content',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      <Sparkles size={14} /> #{index + 1} Trending {show.type === 'tv' ? 'Series' : 'Movie'}
                    </span>
                    <h1 className="hero-title-v2">{show.name}</h1>
                    <div className="hero-meta-v2">
                      <span><Calendar size={16} /> {show.year}</span>
                      <span><Star size={16} /> {show.rating}/10</span>
                      <span>{show.genre}</span>
                    </div>
                    <p className="hero-desc-v2">{show.description}</p>
                    <div className="hero-btns-v2">
                      <FocusableButton className="btn-play-v2" onClick={() => {
                        localStorage.setItem(`media_title_${show.id}`, show.name);
                        navigate(`/watch/${show.type}/${show.id}`);
                      }}>
                        <Play size={20} fill="black" /> Watch Now
                      </FocusableButton>
                      <FocusableButton className="btn-info-v2" onClick={() => {
                        localStorage.setItem(`media_title_${show.id}`, show.name);
                        navigate(`/watch/${show.type}/${show.id}`);
                      }}>
                        <Info size={20} /> Details
                      </FocusableButton>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Carousel Slide Indicators / Dots */}
          <div className="carousel-dots" style={{
            position: 'absolute',
            bottom: '25px',
            right: '40px',
            zIndex: 10,
            display: 'flex',
            gap: '8px'
          }}>
            {heroShows.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveSlide(index)}
                style={{
                  width: index === activeSlide ? '30px' : '10px',
                  height: '10px',
                  borderRadius: '5px',
                  border: 'none',
                  background: index === activeSlide ? 'var(--brand-color)' : 'rgba(255, 255, 255, 0.3)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: index === activeSlide ? '0 0 10px var(--brand-color)' : 'none'
                }}
              />
            ))}
          </div>
        </div>
      )}

      <div className="home-main-v2" style={{ padding: '0 2rem', marginTop: (searching || selectedGenre) ? '2rem' : '0' }}>
        {/* Sleek Search & Filter Row */}
        <div className="search-header-row" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '20px',
          marginBottom: '2rem',
          flexWrap: 'wrap'
        }}>
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '800', background: 'linear-gradient(45deg, #fff, #999)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
              {searching ? 'Search Results' : selectedGenre ? `Genre: ${selectedGenre}` : 'Explore Collections'}
            </h2>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', marginTop: '4px', margin: '4px 0 0 0' }}>
              {isKidsProfile ? 'A safer homepage with family movies and kid-friendly TV picks.' : 'Ad-neutral, high-speed streaming for Blockbusters & Series.'}
            </p>
          </div>

          <form onSubmit={handleSearch} className="movies-search-bar" style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--glass)',
            border: '1px solid var(--glass-border)',
            borderRadius: '12px',
            padding: '4px 8px 4px 16px',
            width: '100%',
            maxWidth: '450px'
          }}>
            <SearchIcon className="search-icon" size={18} style={{ color: 'var(--text-tertiary)', marginRight: '8px' }} />
            <input
              type="text"
              placeholder={isKidsProfile ? 'Search kids movies and shows...' : 'Search movies, K-Dramas...'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                outline: 'none',
                width: '100%',
                fontSize: '0.9rem'
              }}
            />
            {query && <X className="clear-search-btn" size={18} style={{ cursor: 'pointer', color: 'var(--text-tertiary)', marginRight: '8px' }} onClick={clearSearch} />}
            <button type="submit" style={{
              background: 'var(--brand-color)',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 16px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}>Search</button>
          </form>
        </div>

        {/* Active Filter Bar */}
        {(selectedGenre || searching) && (
          <div className="active-filters-bar" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            padding: '8px 16px',
            borderRadius: '10px',
            marginBottom: '1.5rem'
          }}>
            <Filter size={14} style={{ color: 'var(--brand-color)' }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Active Filters:</span>
            {selectedGenre && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '3px 10px',
                borderRadius: '20px',
                fontSize: '0.75rem',
                color: '#fff'
              }}>
                Genre: {selectedGenre}
                <X size={12} style={{ cursor: 'pointer', color: 'red' }} onClick={() => setSelectedGenre('')} />
              </span>
            )}
            {searching && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '3px 10px',
                borderRadius: '20px',
                fontSize: '0.75rem',
                color: '#fff'
              }}>
                Query: "{query}"
                <X size={12} style={{ cursor: 'pointer', color: 'red' }} onClick={clearSearch} />
              </span>
            )}
            <button
              onClick={clearAllFilters}
              style={{
                marginLeft: 'auto',
                background: 'transparent',
                border: 'none',
                color: 'var(--brand-color)',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Clear All
            </button>
          </div>
        )}

        {searching ? (
          <div className="movies-results-wrapper">
            {loading ? (
              <div className="loading-grid">
                {Array(10).fill(0).map((_, i) => (
                  <div key={i} className="skeleton-card" />
                ))}
              </div>
            ) : searchResults.length > 0 ? (
              <div className="trending-grid-v2">
                {searchResults.map((item) => {
                  const watchType = item.type === 'series' || item.mediaType === 'series' ? 'tv' : 'movie';
                  const posterUrl = item.poster;

                  return (
                    <FocusableLink
                      to={`/watch/${watchType}/${item.id}`}
                      key={item.id}
                      className="movie-card"
                      onClick={() => {
                        localStorage.setItem(`media_title_${item.id}`, item.name || item.title);
                      }}
                      style={{ textDecoration: 'none' }}
                    >
                      <div className="movie-card-poster" style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', aspectRatio: '2/3' }}>
                        <img
                          src={posterUrl}
                          alt={item.name}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?q=80&w=300&auto=format&fit=crop';
                          }}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          loading="lazy"
                        />
                        <div className="movie-card-overlay">
                          <Play fill="white" size={24} />
                        </div>
                        <span className="movie-type-badge" style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.75)', color: '#fff', fontSize: '0.65rem', fontWeight: 'bold', padding: '3px 8px', borderRadius: '4px' }}>
                          {watchType === 'tv' ? 'TV SHOW' : 'MOVIE'}
                        </span>
                      </div>
                      <div className="movie-card-info" style={{ marginTop: '10px' }}>
                        <h3 style={{ fontSize: '0.9rem', fontWeight: '600', color: '#fff', margin: '0 0 4px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.name || item.title}
                        </h3>
                        {item.releaseInfo && <span className="movie-year" style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{item.releaseInfo}</span>}
                      </div>
                    </FocusableLink>
                  );
                })}
              </div>
            ) : (
              <div className="no-results" style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-tertiary)' }}>
                No movies or TV shows found matching "{query}".
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Category Tab Selector - Anime Style */}
            <div className="movies-tabs-container" style={{
              display: 'flex',
              gap: '10px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
              paddingBottom: '1rem',
              marginBottom: '2rem'
            }}>
              <FocusableButton
                className={`movies-tab-btn ${activeTab === 'movies' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('movies');
                  setSearching(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: activeTab === 'movies' ? 'var(--brand-color)' : 'rgba(255,255,255,0.03)',
                  color: activeTab === 'movies' ? '#000' : '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.85rem'
                }}
              >
                <Film size={16} /> {isKidsProfile ? 'Kids Movies' : 'Blockbuster Movies'}
              </FocusableButton>
              <FocusableButton
                className={`movies-tab-btn ${activeTab === 'tv' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('tv');
                  setSearching(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: activeTab === 'tv' ? 'var(--brand-color)' : 'rgba(255,255,255,0.03)',
                  color: activeTab === 'tv' ? '#000' : '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.85rem'
                }}
              >
                <Tv size={16} /> {isKidsProfile ? 'Kids TV Shows' : 'TV Shows & K-Dramas'}
              </FocusableButton>
            </div>

            {/* Popular Genres Row - WORKING FILTER */}
            <div className="genres-section" style={{ marginBottom: '2.5rem' }}>
              <div className="section-header-v2" style={{ marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff', margin: 0 }}>Popular Genres</h2>
              </div>
              <div className="genres-container-v2" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                {genresToShow.map(genre => (
                  <button
                    key={genre}
                    onClick={() => handleGenreClick(genre)}
                    className={`genre-tag-v2 ${selectedGenre === genre ? 'active' : ''}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: selectedGenre === genre ? 'var(--brand-color)' : 'rgba(255, 255, 255, 0.03)',
                      color: selectedGenre === genre ? '#000' : 'var(--text-secondary)',
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      cursor: 'pointer',
                      fontWeight: selectedGenre === genre ? 'bold' : 'normal',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Hash size={12} opacity={0.6} />
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="loading-grid">
                {Array(10).fill(0).map((_, i) => (
                  <div key={i} className="skeleton-card" style={{ height: '270px', background: 'var(--glass)', borderRadius: '12px' }} />
                ))}
              </div>
            ) : (
              <div className="latest-listings-wrapper">
                <div className="trending-grid-v2">
                  {(activeTab === 'movies' ? movies : tvShows).map((item) => {
                    const cleanTitle = item.title;
                    const posterUrl = item.poster;

                    return (
                      <FocusableLink
                        to={`/watch/${activeTab === 'tv' ? 'tv' : 'movie'}/${item.id}`}
                        key={item.id}
                        className="movie-card"
                        onClick={() => {
                          localStorage.setItem(`media_title_${item.id}`, item.title || item.name);
                        }}
                        style={{ textDecoration: 'none' }}
                      >
                        <div className="movie-card-poster" style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', aspectRatio: '2/3' }}>
                          <img
                            src={posterUrl}
                            alt={cleanTitle}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?q=80&w=300&auto=format&fit=crop';
                            }}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            loading="lazy"
                          />
                          <div className="movie-card-overlay">
                            <Play fill="white" size={24} />
                          </div>
                          {item.quality && (
                            <span className="movie-quality-badge" style={{ position: 'absolute', top: 'auto', bottom: '10px', right: '10px', background: 'var(--brand-color)', color: '#000', fontSize: '0.65rem', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px' }}>
                              {item.quality}
                            </span>
                          )}
                          <span className="movie-type-badge" style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.75)', color: '#fff', fontSize: '0.65rem', fontWeight: 'bold', padding: '3px 8px', borderRadius: '4px' }}>
                            {activeTab === 'tv' ? 'TV SHOW' : 'MOVIE'}
                          </span>
                        </div>
                        <div className="movie-card-info" style={{ marginTop: '10px' }}>
                          <h3 style={{ fontSize: '0.9rem', fontWeight: '600', color: '#fff', margin: '0 0 4px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {cleanTitle}
                          </h3>
                        </div>
                      </FocusableLink>
                    );
                  })}
                </div>

                {/* Sleek Pagination Controls - Premium Dark style */}
                <div className="movies-pagination" style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '16px',
                  marginTop: '3rem',
                  marginBottom: '2rem'
                }}>
                  <button
                    disabled={activeTab === 'movies' ? moviePage === 1 : tvPage === 1}
                    onClick={() => {
                      if (activeTab === 'movies') {
                        setMoviePage(prev => Math.max(1, prev - 1));
                      } else {
                        setTvPage(prev => Math.max(1, prev - 1));
                      }
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--glass-border)',
                      color: (activeTab === 'movies' ? moviePage === 1 : tvPage === 1) ? 'var(--text-tertiary)' : '#fff',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      opacity: (activeTab === 'movies' ? moviePage === 1 : tvPage === 1) ? 0.5 : 1
                    }}
                  >
                    Previous Page
                  </button>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '600' }}>
                    Page {activeTab === 'movies' ? moviePage : tvPage}
                  </span>
                  <button
                    onClick={() => {
                      if (activeTab === 'movies') {
                        setMoviePage(prev => prev + 1);
                      } else {
                        setTvPage(prev => prev + 1);
                      }
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--glass-border)',
                      color: '#fff',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    Next Page
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export default DramasMovies;
