import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchAnimeById, stripHtml } from '../api/anilist';
import {
  searchMangaDex,
  fetchMangaChapters,
  fetchChapterPages,
  fetchMangaKakalotDetails,
  fetchMangaKakalotRead
} from '../api/manga';
import { BookOpen, Calendar, Star, Users, ArrowLeft, ArrowRight, X, Loader2, Heart, ExternalLink } from 'lucide-react';
import CommentsSection from '../components/CommentsSection';
import { useUser } from '../api/UserContext';

function safeTitle(title) {
  if (!title) return 'Unknown Title';
  if (typeof title === 'string') return title;
  return title.english || title.romaji || title.native || 'Unknown Title';
}

function MangaDetails() {
  const { id } = useParams();
  const { user, addToHistory, toggleLike, isLiked, setShowAuthModal, setAuthTab } = useUser();

  // Media state
  const [manga, setManga] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isKakalot, setIsKakalot] = useState(false);

  // Chapter state
  const [chapters, setChapters] = useState([]);
  const [loadingChapters, setLoadingChapters] = useState(true);

  // Reader state
  const [activeChapter, setActiveChapter] = useState(null);
  const [pages, setPages] = useState([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [isReaderOpen, setIsReaderOpen] = useState(false);

  // Load Manga Data
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError('');

        const isMangaDexId = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
        const isNumeric = /^\d+$/.test(id);

        // 1. Prefer MangaDex details when the route ID is a MangaDex UUID.
        if (isMangaDexId) {
          const mdexData = await fetchMangaKakalotDetails(id);
          if (mdexData && mdexData.title) {
            setIsKakalot(false);
            setManga(mdexData);
            await loadChaptersForTitles([mdexData.title]);
            return;
          }
        }

        // 2. Try loading from MangaKakalot API when the ID is non-numeric.
        if (!isNumeric) {
          const kakalotData = await fetchMangaKakalotDetails(id);
          if (kakalotData && kakalotData.title) {
            setIsKakalot(true);
            setManga({
              id: kakalotData.id || id,
              title: kakalotData.title,
              description: kakalotData.description || kakalotData.altTitles || '',
              coverImage: { large: kakalotData.image || kakalotData.poster },
              bannerImage: kakalotData.banner || kakalotData.poster || kakalotData.image,
              averageScore: 85,
              status: kakalotData.status || 'Ongoing',
              format: 'MANGA',
              genres: kakalotData.genres || [],
              author: kakalotData.author
            });

            if (kakalotData.chapters && kakalotData.chapters.length > 0) {
              setChapters(kakalotData.chapters.map(c => ({
                id: c.id,
                chapter: c.name || c.chapter || c.id,
                title: c.name || c.title || `Chapter ${c.id}`,
                source: 'mangakakalot'
              })));
            } else {
              await loadChaptersForTitles([kakalotData.title]);
            }
            setLoadingChapters(false);
            setLoading(false);
            return;
          }
        }

        // 3. Fallback to AniList metadata and MangaDex chapter search for numeric IDs or when no Kakalot details are found.
        const data = await fetchAnimeById(id);
        if (!data) throw new Error('Manga details not found');
        setManga(data);
        setIsKakalot(false);

        const titlesToTry = [
          data.title?.english,
          data.title?.romaji,
          data.title?.native
        ].filter(Boolean);

        await loadChaptersForTitles(titlesToTry);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
    window.scrollTo(0, 0);
  }, [id]);

  // Sync reading history to Neon Postgres
  useEffect(() => {
    if (user && manga) {
      addToHistory(manga.id, 'manga', safeTitle(manga.title), manga.coverImage?.large);
    }
  }, [user, manga]);

  async function loadChaptersForTitles(titles) {
    setLoadingChapters(true);
    try {
      // Search MangaDex directly (MangaKakalot is blocked by Cloudflare)
      const mdexManga = await searchMangaDex(titles);
      if (mdexManga) {
        const chaps = await fetchMangaChapters(mdexManga.id);
        const unique = [];
        const seen = new Set();
        chaps.forEach(c => {
          if (!seen.has(c.chapter)) {
            seen.add(c.chapter);
            unique.push({ ...c, source: 'mangadex' });
          }
        });
        setChapters(unique);
      } else {
        setChapters([]);
      }
    } catch (err) {
      console.error('Failed to load chapters:', err);
      setChapters([]);
    }
    setLoadingChapters(false);
  }

  async function openChapter(chapter) {
    if (!user) {
      setAuthTab('login');
      setShowAuthModal(true);
      return;
    }
    setActiveChapter(chapter);
    setIsReaderOpen(true);
    setLoadingPages(true);
    setPages([]);

    // External URL chapters are displayed in an iframe webview
    if (chapter.externalUrl) {
      setLoadingPages(false);
      return;
    }

    if (chapter.source === 'mangakakalot') {
      const mangaIdParam = chapter.mangaId || manga.id;
      const res = await fetchMangaKakalotRead(mangaIdParam, chapter.id);
      if (res && res.images) {
        setPages(res.images);
      } else {
        setPages([]);
      }
    } else {
      const imageUrls = await fetchChapterPages(chapter.id);
      setPages(imageUrls);
    }
    setLoadingPages(false);
  }

  function closeReader() {
    setIsReaderOpen(false);
    setActiveChapter(null);
    setPages([]);
  }

  function nextChapter() {
    if (!chapters || !activeChapter) return;
    const currentIndex = chapters.findIndex(c => c.id === activeChapter.id);
    if (currentIndex < chapters.length - 1) {
      openChapter(chapters[currentIndex + 1]);
    }
  }

  function prevChapter() {
    if (!chapters || !activeChapter) return;
    const currentIndex = chapters.findIndex(c => c.id === activeChapter.id);
    if (currentIndex > 0) {
      openChapter(chapters[currentIndex - 1]);
    }
  }

  if (loading) {
    return (
      <div className="status-container" style={{ textAlign: 'center', padding: '60px' }}>
        <Loader2 className="spin" size={48} style={{ color: 'var(--red, #e50914)' }} />
        <p>Loading manga details...</p>
      </div>
    );
  }

  if (error || !manga) {
    return (
      <div className="status-container" style={{ textAlign: 'center', padding: '60px' }}>
        <h2>Oops!</h2>
        <p>{error || 'Manga not found'}</p>
        <Link to="/manga" className="btn-play-v2">Return to Manga Home</Link>
      </div>
    );
  }

  const mangaTitle = safeTitle(manga.title);

  return (
    <>
      {/* ── Manga Reader Fullscreen Overlay ── */}
      {user && isReaderOpen && (
        <div className="manga-reader-overlay">
          <div className="reader-toolbar">
            <div className="toolbar-left">
              <button className="reader-btn" onClick={closeReader}>
                <X size={24} /> Close
              </button>
              <span className="reader-title">
                {mangaTitle} - {activeChapter?.title || `Chapter ${activeChapter?.chapter}`}
              </span>
            </div>
            <div className="toolbar-right">
              <button className="reader-btn" onClick={prevChapter} disabled={chapters.findIndex(c => c.id === activeChapter?.id) <= 0}>
                <ArrowLeft size={20} /> Prev
              </button>
              <button className="reader-btn" onClick={nextChapter} disabled={chapters.findIndex(c => c.id === activeChapter?.id) >= chapters.length - 1}>
                Next <ArrowRight size={20} />
              </button>
            </div>
          </div>

          <div className="reader-content">
            {loadingPages ? (
              <div className="status-container" style={{ textAlign: 'center', padding: '60px' }}>
                <Loader2 className="spin" size={48} style={{ color: 'var(--red, #e50914)' }} />
                <p>Loading pages...</p>
              </div>
            ) : pages.length > 0 ? (
              <div className="pages-container">
                {pages.map((url, i) => (
                  <img key={i} src={url} alt={`Page ${i + 1}`} loading="lazy" className="manga-page" />
                ))}
                
                {/* End of chapter actions */}
                <div className="end-of-chapter" style={{ textAlign: 'center', padding: '2rem' }}>
                  <h3>End of {activeChapter?.title || `Chapter ${activeChapter?.chapter}`}</h3>
                  <button className="btn-play-v2" onClick={nextChapter}>
                    Read Next Chapter <ArrowRight size={20} style={{ marginLeft: 8 }} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="status-container" style={{ textAlign: 'center', padding: '60px' }}>
                <p>No pages found for this chapter.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Normal Details Page ── */}
      <div className="detail-hero-v2">
        <img
          className="detail-banner-v2"
          src={manga.bannerImage || manga.coverImage?.extraLarge || manga.coverImage?.large}
          alt=""
        />
        <div className="detail-hero-overlay-v2" />

        <div className="detail-hero-content-v2">
          <img
            className="detail-poster-v2"
            src={manga.coverImage?.large}
            alt={mangaTitle}
          />
          <div className="detail-info-v2">
            <div className="detail-meta-v2">
              <span className="score"><Star size={16} fill="currentColor" /> {manga.averageScore}%</span>
              <span><BookOpen size={16} /> {manga.format || 'MANGA'}</span>
              <span><Users size={16} /> {manga.status}</span>
              {manga.seasonYear && <span><Calendar size={16} /> {manga.seasonYear}</span>}
            </div>
            <h1 className="detail-title-v2">{mangaTitle}</h1>
            <div className="detail-actions-v2">
              <button
                className="btn-play-v2"
                onClick={() => {
                  if (!user) {
                    setAuthTab('login');
                    setShowAuthModal(true);
                    return;
                  }
                  if (chapters.length > 0) openChapter(chapters[0]);
                }}
                disabled={chapters.length === 0}
              >
                <BookOpen size={20} fill="currentColor" /> Read Chapter 1
              </button>
              <button 
                className="btn-info-v2"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  color: isLiked(manga.id, 'manga') ? '#ff1a75' : 'var(--text-secondary)',
                  borderColor: isLiked(manga.id, 'manga') ? '#ff1a75' : 'var(--glass-border)',
                  background: isLiked(manga.id, 'manga') ? 'rgba(255, 26, 117, 0.1)' : 'var(--glass)',
                  boxShadow: isLiked(manga.id, 'manga') ? '0 0 10px rgba(255, 26, 117, 0.2)' : 'none',
                  transition: 'all 0.2s ease', cursor: 'pointer'
                }}
                onClick={() => toggleLike(manga.id, 'manga', safeTitle(manga.title), manga.coverImage?.large)}
              >
                <Heart size={20} fill={isLiked(manga.id, 'manga') ? '#ff1a75' : 'none'} /> 
                {isLiked(manga.id, 'manga') ? 'Liked' : 'Like'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="detail-layout-v2">
        <div className="main-content-v2">
          <div className="details-section-v2">
            <h2>Synopsis</h2>
            <p>{stripHtml(manga.description)}</p>
          </div>

          <div className="details-section-v2">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0 }}>
                Chapters
                <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                  ({chapters.length}) - Source: {isKakalot ? 'MangaKakalot' : 'MangaDex'}
                </span>
              </h2>
            </div>

            {loadingChapters ? (
              <p>Searching for chapters...</p>
            ) : chapters.length > 0 ? (
              <div className="episodes-grid-v2">
                {chapters.map(chap => (
                  <button
                    key={chap.id}
                    className={`episode-btn-v2 ${activeChapter?.id === chap.id ? 'active' : ''} ${chap.externalUrl ? 'external' : ''}`}
                    onClick={() => openChapter(chap)}
                    title={chap.externalUrl ? 'Read Official Chapter (In-App)' : `Read ${chap.title || `Chapter ${chap.chapter}`}`}
                  >
                    <span className="episode-label">{chap.externalUrl ? 'OFFICIAL' : 'CH'}</span>
                    <span className="episode-number">{chap.chapter || chap.id}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="official-links-container">
                <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
                  No chapters found for this title.
                </p>
                {manga.externalLinks && manga.externalLinks.length > 0 && (
                  <div className="streaming-links-sidebar" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                    {manga.externalLinks.map((link, i) => (
                      <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="streaming-sidebar-item">
                        <span style={{ fontWeight: 600, color: '#fff' }}>{link.site}</span>
                        <ExternalLink size={16} />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <CommentsSection mediaId={manga.id} />
        </div>

        <aside className="sidebar-v2">
          <div className="sidebar-block-v2">
            <h3>Details</h3>
            <div className="info-list-v2">
              {manga.author && (
                <div className="info-row-v2">
                  <span className="info-label-v2">Author</span>
                  <span className="info-value-v2">{manga.author}</span>
                </div>
              )}
              <div className="info-row-v2">
                <span className="info-label-v2">Status</span>
                <span className="info-value-v2">{manga.status}</span>
              </div>
              <div className="info-row-v2">
                <span className="info-label-v2">Genres</span>
                <div className="genre-tags-v2">
                  {manga.genres?.map(g => (
                    <Link key={g} to={`/manga?genre=${g}`} className="genre-tag-v2">{g}</Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

export default MangaDetails;
