import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Flame, Clock, Sparkles, CheckCircle2, BookOpen, Eye, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import {
  fetchMangaKakalotHome,
  fetchMangaKakalotPopular,
  fetchMangaKakalotLatest,
  fetchMangaKakalotNewest,
  fetchMangaKakalotCompleted,
  searchMangaKakalot
} from '../api/manga';
import '../styles/designTokens.css';

export default function MangaHome() {
  const [activeTab, setActiveTab] = useState('popular'); // 'popular' | 'latest' | 'newest' | 'completed'
  const [query, setQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [mangaList, setMangaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ hasNextPage: false, totalPages: 1 });

  // Load Tab Data
  useEffect(() => {
    if (query) return; // Skip tab fetch if user is searching

    async function loadTabContent() {
      setLoading(true);
      try {
        let res = null;
        if (activeTab === 'popular') {
          res = await fetchMangaKakalotPopular(page);
        } else if (activeTab === 'latest') {
          res = await fetchMangaKakalotLatest(page);
        } else if (activeTab === 'newest') {
          res = await fetchMangaKakalotNewest(page);
        } else if (activeTab === 'completed') {
          res = await fetchMangaKakalotCompleted(page);
        }

        if (res && res.mangas) {
          setMangaList(res.mangas);
          setPagination({
            hasNextPage: res.hasNextPage || page < (res.totalPages || 1),
            totalPages: res.totalPages || 1
          });
        } else if (Array.isArray(res)) {
          setMangaList(res);
          setPagination({ hasNextPage: false, totalPages: 1 });
        } else {
          setMangaList([]);
        }
      } catch (err) {
        console.error('Failed to load tab data:', err);
        setMangaList([]);
      } finally {
        setLoading(false);
      }
    }

    loadTabContent();
  }, [activeTab, page, query]);

  // Handle Search Submission
  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) {
      setSearchResult(null);
      return;
    }
    setSearching(true);
    try {
      const res = await searchMangaKakalot(query.trim(), 1);
      if (res && res.mangas) {
        setSearchResult(res.mangas);
      } else if (Array.isArray(res)) {
        setSearchResult(res);
      } else {
        setSearchResult([]);
      }
    } catch (err) {
      console.error('Manga search error:', err);
      setSearchResult([]);
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setSearchResult(null);
  };

  const displayedList = searchResult !== null ? searchResult : mangaList;

  return (
    <div className="page-container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem', color: 'var(--text)' }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(229,9,20,0.15) 0%, rgba(15,15,20,0.9) 100%)',
        borderRadius: '16px',
        padding: '2.5rem 2rem',
        marginBottom: '2.5rem',
        border: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <BookOpen size={32} style={{ color: 'var(--red, #e50914)' }} />
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
            Manga Vault
          </h1>
        </div>
        <p style={{ margin: 0, color: 'var(--text2, #a0a0a0)', maxWidth: '650px', lineHeight: 1.6 }}>
          Discover and read thousands of popular manga titles powered by MangaKakalot API.
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.75rem', maxWidth: '540px', marginTop: '0.5rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text3, #666)' }} />
            <input
              type="text"
              placeholder="Search manga by title..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.8rem 1rem 0.8rem 2.6rem',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(0,0,0,0.4)',
                color: '#fff',
                fontSize: '0.95rem',
                outline: 'none'
              }}
            />
            {query && (
              <button
                type="button"
                onClick={clearSearch}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text3)',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={searching}
            style={{
              padding: '0.8rem 1.4rem',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--red, #e50914)',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {searching ? <Loader2 size={18} className="spin" /> : 'Search'}
          </button>
        </form>
      </div>

      {/* Tabs Filter (If not searching) */}
      {!searchResult ? (
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '2rem',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          paddingBottom: '0.75rem',
          overflowX: 'auto'
        }}>
          {[
            { id: 'popular', label: 'Popular', icon: Flame },
            { id: 'latest', label: 'Latest Updates', icon: Clock },
            { id: 'newest', label: 'New Releases', icon: Sparkles },
            { id: 'completed', label: 'Completed', icon: CheckCircle2 }
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setPage(1); }}
                style={{
                  padding: '0.6rem 1.2rem',
                  borderRadius: '20px',
                  border: 'none',
                  background: active ? 'var(--red, #e50914)' : 'rgba(255,255,255,0.06)',
                  color: active ? '#fff' : 'var(--text2, #a0a0a0)',
                  fontWeight: active ? 600 : 400,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.9rem',
                  transition: 'all 0.2s ease'
                }}
              >
                <Icon size={16} /> {tab.label}
              </button>
            );
          })}
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2>Search Results for "{query}" ({displayedList.length})</h2>
          <button onClick={clearSearch} style={{ background: 'none', border: 'none', color: 'var(--red, #e50914)', cursor: 'pointer' }}>
            Clear Search
          </button>
        </div>
      )}

      {/* Manga Grid */}
      {loading || searching ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text2)' }}>
          <Loader2 size={36} className="spin" style={{ marginBottom: '1rem', color: 'var(--red, #e50914)' }} />
          <p>Loading manga titles...</p>
        </div>
      ) : displayedList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text2)' }}>
          <p>No manga found.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
          gap: '1.5rem'
        }}>
          {displayedList.map((item, idx) => (
            <Link
              key={item.id || idx}
              to={`/manga/${encodeURIComponent(item.id)}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div style={{
                borderRadius: '10px',
                overflow: 'hidden',
                background: 'var(--surface, #141414)',
                border: '1px solid rgba(255,255,255,0.06)',
                transition: 'transform 0.2s ease',
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{ position: 'relative', aspectRatio: '3/4', overflow: 'hidden' }}>
                  <img
                    src={item.image || item.poster}
                    alt={item.title}
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {item.views > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: 'rgba(0,0,0,0.7)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Eye size={12} /> {item.views.toLocaleString()}
                    </div>
                  )}
                </div>
                <div style={{ padding: '0.8rem', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{
                      fontSize: '0.92rem',
                      fontWeight: 600,
                      margin: '0 0 0.4rem 0',
                      lineHeight: 1.3,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {item.title}
                    </h3>
                  </div>
                  {item.latestChapter && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--red, #e50914)', fontWeight: 500 }}>
                      {item.latestChapter}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination (For Tabs) */}
      {!searchResult && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '3rem' }}>
          <button
            disabled={page <= 1 || loading}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            style={{
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              color: '#fff',
              cursor: page <= 1 ? 'not-allowed' : 'pointer',
              opacity: page <= 1 ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <ChevronLeft size={16} /> Previous
          </button>
          <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>Page {page}</span>
          <button
            disabled={!pagination.hasNextPage || loading}
            onClick={() => setPage(p => p + 1)}
            style={{
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              color: '#fff',
              cursor: !pagination.hasNextPage ? 'not-allowed' : 'pointer',
              opacity: !pagination.hasNextPage ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
