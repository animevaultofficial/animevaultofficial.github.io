import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Star } from 'lucide-react';
import { searchAnime } from '../api/anilist';

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
        const data = await searchAnime(query.trim(), 'ANIME', null, 1, 12);
        if (mounted) {
          setResults(data || []);
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
    if (trimmed) {
      const next = [trimmed, ...history.filter((h) => h !== trimmed)].slice(0, MAX_HISTORY);
      saveHistory(next);
      setHistory(next);
    }
    onClose();
    // Navigate to anime details page
    navigate(`/anime/${media.id}`);
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
      navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  };

  const showHistory = !query && history.length > 0;

  function getTitle(media) {
    return media?.title?.english || media?.title?.romaji || media?.title?.native || media?.name || 'Unknown Title';
  }

  function getImage(media) {
    return media?.coverImage?.extraLarge || media?.coverImage?.large || '';
  }

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="search-box">
        <div className="search-input-wrap">
          <Search className="search-icon" />
          <input
            ref={inputRef}
            className="search-input"
            placeholder="Search anime..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
          />
          {query ? (
            <button
              className="btn-clear"
              onClick={() => setQuery('')}
            >
              <X size={20} />
            </button>
          ) : (
            <button className="btn-clear" onClick={onClose}>
              <X size={20} />
            </button>
          )}
        </div>

        <div className="search-results">
          {!loading && query && results.length === 0 && (
            <div className="search-empty">No results for "{query}"</div>
          )}

          {!loading &&
            results.map((media) => (
              <div
                key={media.id}
                className="search-result"
                onClick={() => handleSelect(media)}
              >
                <img
                  src={getImage(media)}
                  alt={getTitle(media)}
                  onError={(e) => {
                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2258%22%3E%3Crect fill=%22%23222%22 width=%2240%22 height=%2258%22/%3E%3C/svg%3E';
                  }}
                />
                <div className="search-result-info">
                  <div className="search-result-title">{getTitle(media)}</div>
                  <div className="search-result-meta">
                    {media.seasonYear || ''}
                    {media.averageScore ? (
                      <>
                        {' '}
                        · <Star size={12} /> {media.averageScore / 10}
                      </>
                    ) : (
                      ''
                    )}
                  </div>
                </div>
                <span
                  className={`search-result-type type-anime`}
                >
                  Anime
                </span>
              </div>
            ))}

          {showHistory && (
            <div className="search-history">
              <div className="search-history-header">
                <span className="search-history-label">Recent searches</span>
                <button className="search-history-clear" onClick={clearHistory}>
                  Clear all
                </button>
              </div>
              {history.map((term) => (
                <div
                  key={term}
                  className="search-history-item"
                  onClick={() => handleHistoryClick(term)}
                >
                  <span className="search-history-icon">
                    <Search size={14} />
                  </span>
                  <span className="search-history-term">{term}</span>
                  <button
                    className="search-history-remove"
                    onClick={(e) => removeFromHistory(e, term)}
                    title="Remove"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {!query && history.length === 0 && (
            <div className="search-hint">
              Search for anime · <kbd>ESC</kbd> to close
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
