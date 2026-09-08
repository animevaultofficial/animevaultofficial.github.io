import React, { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, Calendar, Heart, Loader2, Star, Users } from 'lucide-react';
import { fetchAnimeById, stripHtml } from '../../api/anilist';
import { searchMangaDex, fetchMangaChapters, fetchChapterPages, fetchMangaKakalotDetails, fetchMangaKakalotRead } from '../../api/manga';
import { useUser } from '../../api/UserContext';

function titleOf(value) {
  if (!value) return 'Unknown Title';
  if (typeof value === 'string') return value;
  return value.english || value.romaji || value.native || 'Unknown Title';
}

export default function MangaDetailsPage({ id, goBack }) {
  const { user, addToHistory, toggleLike, isLiked, setShowAuthModal, setAuthTab } = useUser();
  const [manga, setManga] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingChapters, setLoadingChapters] = useState(true);
  const [error, setError] = useState('');
  const [reader, setReader] = useState(null);
  const [pages, setPages] = useState([]);
  const [loadingPages, setLoadingPages] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setLoadingChapters(true); setError('');
      try {
        const numeric = /^\\d+$/.test(String(id));
        let data = null; let kakalot = false;
        if (!numeric) {
          const k = await fetchMangaKakalotDetails(id);
          if (k?.title) {
            kakalot = true;
            data = { id: k.id || id, title: k.title, description: k.description || k.altTitles || '', coverImage: { large: k.image || k.poster }, bannerImage: k.banner || k.poster || k.image, averageScore: 85, status: k.status || 'Ongoing', format: 'MANGA', genres: k.genres || [], author: k.author, chapters: k.chapters };
          }
        }
        if (!data) data = await fetchAnimeById(id);
        if (!data) throw new Error('Manga details not found');
        if (cancelled) return;
        setManga(data);
        if (user) addToHistory(data.id, 'manga', titleOf(data.title), data.coverImage?.large);
        let list = [];
        if (kakalot && Array.isArray(data.chapters) && data.chapters.length) {
          list = data.chapters.map(c => ({ id: c.id, chapter: c.name || c.chapter || c.id, title: c.name || c.title || `Chapter ${c.id}`, source: 'mangakakalot', mangaId: data.id }));
        } else {
          const titles = [data.title?.english, data.title?.romaji, data.title?.native, titleOf(data.title)].filter(Boolean);
          const md = await searchMangaDex(titles);
          if (md) list = (await fetchMangaChapters(md.id)).map(c => ({ ...c, source: 'mangadex' }));
        }
        const seen = new Set();
        list = list.filter(c => { const key = String(c.chapter ?? c.id); if (seen.has(key)) return false; seen.add(key); return true; });
        if (!cancelled) setChapters(list);
      } catch (e) { if (!cancelled) setError(e?.message || 'Unable to load manga'); }
      finally { if (!cancelled) { setLoading(false); setLoadingChapters(false); } }
    }
    if (id) load();
    return () => { cancelled = true; };
  }, [id, user]);

  async function openChapter(chapter) {
    if (!user) { setAuthTab('login'); setShowAuthModal(true); return; }
    setReader(chapter); setPages([]); setLoadingPages(true);
    try {
      if (chapter.externalUrl) { setPages([]); return; }
      const result = chapter.source === 'mangakakalot'
        ? await fetchMangaKakalotRead(chapter.mangaId || manga.id, chapter.id)
        : { images: await fetchChapterPages(chapter.id) };
      setPages(result?.images || []);
    } finally { setLoadingPages(false); }
  }

  if (loading) return <div className="av-manga-v2-status"><Loader2 className="av-spin" size={38} /><span>Loading manga…</span></div>;
  if (error || !manga) return <div className="av-manga-v2-status"><h2>Couldn’t load manga</h2><p>{error || 'Manga not found'}</p><button onClick={goBack}>Go back</button></div>;

  const title = titleOf(manga.title);
  const liked = isLiked(manga.id, 'manga');
  const cover = manga.coverImage?.large || manga.coverImage?.extraLarge;
  const banner = manga.bannerImage || manga.coverImage?.extraLarge || cover;

  if (reader) return <div className="av-manga-reader-v2"><div className="av-manga-reader-bar"><button onClick={() => setReader(null)}><ArrowLeft size={20} /> Close</button><strong>{title} · {reader.title || `Chapter ${reader.chapter}`}</strong></div><div className="av-manga-pages-v2">{loadingPages ? <Loader2 className="av-spin" size={40} /> : pages.length ? pages.map((url, i) => <img key={`${url}-${i}`} src={url} alt={`Page ${i + 1}`} loading="lazy" />) : <p>No pages are available for this chapter.</p>}</div></div>;

  return <div className="av-manga-v2">
    <section className="av-manga-hero-v2" style={{ '--manga-banner': `url(${banner || ''})` }}>
      <div className="av-manga-hero-inner"><button className="av-manga-back-v2" onClick={goBack}><ArrowLeft size={19} /></button><img className="av-manga-cover-v2" src={cover} alt={title} /><div className="av-manga-summary-v2"><div className="av-manga-meta-v2"><span><Star size={15} fill="currentColor" /> {manga.averageScore || '—'}%</span><span><BookOpen size={15} /> {manga.format || 'MANGA'}</span><span><Users size={15} /> {manga.status || 'Unknown'}</span>{manga.seasonYear && <span><Calendar size={15} /> {manga.seasonYear}</span>}</div><h1>{title}</h1><div className="av-manga-actions-v2"><button onClick={() => chapters[0] && openChapter(chapters[0])} disabled={!chapters.length}><BookOpen size={19} /> Read</button><button className={liked ? 'liked' : ''} onClick={() => toggleLike(manga.id, 'manga', title, cover)}><Heart size={19} fill={liked ? 'currentColor' : 'none'} /> {liked ? 'Liked' : 'Favorite'}</button></div></div></div>
    </section>
    <main className="av-manga-body-v2"><section><div className="av-manga-section-head-v2"><h2>Synopsis</h2></div><p className="av-manga-description-v2">{stripHtml(manga.description) || 'No synopsis available.'}</p></section><section><div className="av-manga-section-head-v2"><h2>Chapters <small>{loadingChapters ? 'Searching…' : `${chapters.length} available`}</small></h2></div>{chapters.length ? <div className="av-manga-chapters-v2">{chapters.map((chapter, i) => <button key={chapter.id || i} onClick={() => openChapter(chapter)}><span>CH</span><strong>{chapter.chapter || chapter.id}</strong></button>)}</div> : !loadingChapters && <p className="av-manga-empty-v2">No chapters found.</p>}</section>{manga.genres?.length > 0 && <section><div className="av-manga-section-head-v2"><h2>Genres</h2></div><div className="av-manga-genres-v2">{manga.genres.map(g => <span key={g}>{g}</span>)}</div></section>}</main>
  </div>;
}
