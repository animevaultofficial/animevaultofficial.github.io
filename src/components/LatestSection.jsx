import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Play, Zap } from 'lucide-react';
import { fetchTrendingMedia, searchAnime } from '../api/anilist';

export default function LatestSection() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        // Use AniList trending/recent releases instead of Consumet/GogoAnime
        const fallback = await fetchTrendingMedia('ANIME');
        if (fallback && fallback.length > 0) {
          setItems(fallback.slice(0, 10).map(a => ({
            id: a.id,
            title: a.title?.english || a.title?.romaji || 'Anime',
            image: a.coverImage?.extraLarge || a.coverImage?.large,
            episodeNumber: a.episodes || 'NEW',
            anilistId: a.id
          })));
        }
      } catch (err) {
        console.error('Failed to fetch latest anime:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handlePlay(item) {
    if (item.anilistId) {
      navigate(`/anime/${item.anilistId}`);
      return;
    }
    // Try to find internal AniList ID for this title to keep user in-app
    try {
      const results = await searchAnime(item.title);
      if (results && results.length > 0) {
        navigate(`/anime/${results[0].id}`);
      } else {
        navigate(`/search?q=${encodeURIComponent(item.title)}`);
      }
    } catch {
      navigate(`/search?q=${encodeURIComponent(item.title)}`);
    }
  }

  if (loading) return <div className="section-loading">Fetching latest releases...</div>;
  if (items.length === 0) return null;

  return (
    <div className="section-v2">
      <div className="section-header-v2">
        <h2>Latest Releases</h2>
        <span className="badge-v2"><Zap size={14} fill="currentColor" /> Live Updates</span>
      </div>
      <div className="anime-grid-v2">
        {items.map((item, idx) => (
          <div key={idx} className="anime-card-v2" onClick={() => handlePlay(item)}>
            <div className="card-image-wrapper-v2">
              <img src={item.image} alt={item.title} className="card-image-v2" />
              <div className="card-overlay-v2">
                <button className="btn-play-card">
                  <Play size={20} fill="currentColor" />
                </button>
              </div>
              <div className="card-badges-v2">
                <span className="ep-badge-v2">EP {item.episodeNumber}</span>
              </div>
            </div>
            <div className="card-info-v2">
              <h3>{item.title}</h3>
              <div className="card-meta-v2">
                <span>Just Added</span>
                <span className="dot">•</span>
                <span>AnimeVault</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
