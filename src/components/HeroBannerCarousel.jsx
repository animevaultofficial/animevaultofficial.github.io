import React, { useEffect, useState } from 'react';
import '../styles/designTokens.css';
import './HeroBannerCarousel.css';

export default function HeroBannerCarousel({ items }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    if (!items || items.length === 0) return;
    const interval = setInterval(() => setActiveIndex(prev => (prev + 1) % items.length), 8000);
    return () => clearInterval(interval);
  }, [items]);

  useEffect(() => setImageFailed(false), [activeIndex]);
  if (!items || items.length === 0) return null;
  const activeItem = items[activeIndex];
  const title = activeItem.title?.english || activeItem.title?.romaji || activeItem.title || 'AnimeVault';
  const image = activeItem.images?.jpg?.large_image_url || activeItem.coverImage?.extraLarge || activeItem.image || '/logo.png';

  return (
    <div className="hero-carousel glass">
      <img src={imageFailed ? '/logo.png' : image} alt={title} className="hero-image" onError={() => setImageFailed(true)} decoding="async" fetchPriority="high" style={{ width: '100%', height: '300px', objectFit: 'cover' }} />
      <div className="hero-overlay"><h2 className="hero-title">{title}</h2><p className="hero-episode">Episode {activeItem.episode || '?'}</p>{activeItem.broadcast?.day && activeItem.broadcast?.time && <p className="hero-countdown">{activeItem.broadcast.day} {activeItem.broadcast.time}</p>}<p className="hero-genres">{activeItem.genres?.join(', ')}</p><p className="hero-score">Score: {activeItem.score || 'N/A'}</p></div>
    </div>
  );
}
