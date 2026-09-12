import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Star, Film } from 'lucide-react';
import { searchMoviesAndSeries } from '../api/movies';

const HISTORY_KEY = 'animevault_search_history';
const MAX_HISTORY = 12;

function loadHistory() {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export default function SearchModal({ onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState(loadHistory);
  const inputRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    const tid = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(tid);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    let mounted = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const movieData = await searchMoviesAndSeries(query.trim());
        if (mounted) {
          setResults((movieData || []).map(item => ({
            ...item,
            _type: item.mediaType === 'series' ? 'series' : 'movie',
          })));
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }, 380);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [query]);

  const addToHistory = useCallback((term) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setHistory((prev) => {
      const next = [trimmed, ...prev.filter((h) => h.toLowerCase() !== trimmed.toLowerCase())].slice(0, MAX_HISTORY);
      saveHistory(next);
      return next;
    });
  }, []);

  const removeFromHistory = useCallback((e, term) => {
    e.stopPropagation();
    setHistory((prev) => {
      const next = prev.filter((h) => h !== term);
      saveHistory(next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    saveHistory([]);
  }, []);

  const handleSelect = (media) => {
    const trimmed = query.trim();
    if (trimmed) addToHistory(trimmed);
    onClose();
    if (media._type === 'movie') navigate(`/watch/movie/${media.tmdbId || media.id}`);
    else navigate(`/watch/series/${media.tmdbId || media.id}`);
  };

  const handleHistoryClick = useCallback((term) => {
    setQuery(term);
    inputRef.current?.focus();
  }, []);

  const handleKey = (e) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'Enter' && query.trim()) {
      const trimmed = query.trim();
      addToHistory(trimmed);
      onClose();
      navigate(`/search?q=${encodeURIComponent(trimmed)}&type=MOVIES%2FSERIES`);
    }
  };

  const showHistory = !query && history.length > 0;

  function getTitle(media) {
    return media?.title || media?.name || 'Unknown Title';
  }

  function getImage(media) {
    return media?.poster || '';
  }

  function getType(media) {
    return media._type === 'movie' ? 'Movie' : 'Series';
  }

  function getYear(media) {
    return media?.year || media?.releaseInfo || '';
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="search-box">
        <div className="search-input-wrap">
          <Search className="search-icon" />
          <input
            ref={inputRef}
            className="search-input"
            placeholder="Search movies and series..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
          />
          <button className="btn-clear" onClick={query ? () => setQuery('') : onClose}><X size={20} /></button>
        </div>

        <div className="search-results">
          {!loading && query && results.length === 0 && <div className="search-empty">No results for "{query}"</div>}

          {!loading && results.map((media) => (
            <div key={`${media._type}-${media.id}`} className="search-result" onClick={() => handleSelect(media)}>
              <img src={getImage(media)} alt={getTitle(media)} onError={(e) => { e.target.style.visibility = 'hidden'; }} />
              <div className="search-result-info">
                <div className="search-result-title">{getTitle(media)}</div>
                <div className="search-result-meta">
                  {getYear(media)}
                  {media.averageScore ? <> · <Star size={12} /> {media.averageScore / 10}</> : ''}
                </div>
              </div>
              <span className={`search-result-type type-${media._type}`}><Film size={12} /> {getType(media)}</span>
            </div>
          ))}

          {showHistory && (
            <div className="search-history">
              <div className="search-history-header">
                <span className="search-history-label">Recent searches</span>
                <button className="search-history-clear" onClick={clearHistory}>Clear all</button>
              </div>
              {history.map((term) => (
                <div key={term} className="search-history-item" onClick={() => handleHistoryClick(term)}>
                  <span className="search-history-icon"><Search size={14} /></span>
                  <span className="search-history-term">{term}</span>
                  <button className="search-history-remove" onClick={(e) => removeFromHistory(e, term)} title="Remove"><X size={13} /></button>
                </div>
              ))}
            </div>
          )}

          {!query && history.length === 0 && <div className="search-hint">Search movies or series · <kbd>ESC</kbd> to close</div>}
        </div>
      </div>
    </div>
  );
}
