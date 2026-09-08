import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Zap } from 'lucide-react';
import { fetchTrendingMedia, searchAnime } from '../api/anilist';

const CACHE_KEY = 'animevault_latest_v2';
const CACHE_TTL = 15 * 60 * 1000;

function readCache() { try { const x = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); return x && Date.now() - x.ts < CACHE_TTL ? x.items : []; } catch { return []; } }
function writeCache(items) { try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), items })); } catch {} }

export default function LatestSection() {
  const [items, setItems] = useState(() => readCache());
  const [loading, setLoading] = useState(() => readCache().length === 0);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await Promise.race([fetchTrendingMedia('ANIME'), new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 7000))]);
        if (cancelled || !Array.isArray(data) || !data.length) return;
        const next = data.slice(0, 10).map(a => ({ id: a.id, title: a.title?.english || a.title?.romaji || 'Anime', image: a.coverImage?.extraLarge || a.coverImage?.large || a.coverImage?.medium || '/logo.png', episodeNumber: a.episodes || 'NEW', anilistId: a.id }));
        setItems(next); writeCache(next);
      } catch {} finally { if (!cancelled) setLoading(false); }
    };
    if (items.length) { setLoading(false); const id = setTimeout(load, 1500); return () => { cancelled = true; clearTimeout(id); }; }
    load();
    return () => { cancelled = true; };
  }, []);

  async function handlePlay(item) {
    if (item.anilistId) { navigate(`/anime/${item.anilistId}`); return; }
    try { const results = await searchAnime(item.title); navigate(results?.[0]?.id ? `/anime/${results[0].id}` : `/search?q=${encodeURIComponent(item.title)}`); } catch { navigate(`/search?q=${encodeURIComponent(item.title)}`); }
  }

  if (loading) return <div className="section-loading">Fetching latest releases...</div>;
  if (!items.length) return null;
  const handleImageError = e => { const img = e.currentTarget; if (img.dataset.fallbackApplied) return; img.dataset.fallbackApplied = '1'; img.src = '/logo.png'; };

  return <div className="section-v2"><div className="section-header-v2"><h2>Latest Releases</h2><span className="badge-v2"><Zap size={14} fill="currentColor" /> Live Updates</span></div><div className="anime-grid-v2">{items.map(item => <div key={item.id} className="anime-card-v2" onClick={() => handlePlay(item)}><div className="card-image-wrapper-v2"><img src={item.image} alt={item.title} className="card-image-v2" loading="lazy" decoding="async" onError={handleImageError} /><div className="card-overlay-v2"><button className="btn-play-card" aria-label={`Play ${item.title}`}><Play size={20} fill="currentColor" /></button></div><div className="card-badges-v2"><span className="ep-badge-v2">EP {item.episodeNumber}</span></div></div><div className="card-info-v2"><h3>{item.title}</h3><div className="card-meta-v2"><span>Just Added</span><span className="dot">•</span><span>AnimeVault</span></div></div></div>)}</div></div>;
}
