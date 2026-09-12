import React, { useEffect, useState } from 'react';
import { Info, Play, Star, TrendingUp } from 'lucide-react';
import { getImage, getTitle } from './api/anilist';

function cleanDescription(value) {
  return String(value || 'No description available.').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

export default function MobileHero({ slides = [], onWatchClick, onDetailsClick }) {
  const [current, setCurrent] = useState(0);
  const count = Math.min(5, slides.length);

  useEffect(() => {
    setCurrent(0);
  }, [slides.length]);

  useEffect(() => {
    if (count < 2) return undefined;
    const timer = window.setInterval(() => setCurrent(index => (index + 1) % count), 6000);
    return () => window.clearInterval(timer);
  }, [count]);

  if (!count) return null;

  return (
    <section className="av-mobile-hero" aria-label="Trending anime">
      {slides.slice(0, count).map((anime, index) => {
        const active = index === current;
        const title = getTitle(anime) || 'Untitled';
        const image = anime?.bannerImage || getImage(anime, 'large');
        const description = cleanDescription(anime?.description).slice(0, 150);
        return (
          <article key={anime.id || index} className={`av-mobile-hero-slide ${active ? 'is-active' : ''}`} aria-hidden={!active}>
            <img src={image} alt="" loading={index === 0 ? 'eager' : 'lazy'} decoding="async" />
            <div className="av-mobile-hero-overlay" />
            <div className="av-mobile-hero-content">
              <span className="av-mobile-hero-rank"><TrendingUp size={11} /> #{index + 1} TRENDING</span>
              <h1>{title}</h1>
              <div className="av-mobile-hero-meta">
                {anime?.averageScore != null && <span><Star size={12} fill="currentColor" /> {anime.averageScore}%</span>}
                {anime?.seasonYear && <span>{anime.seasonYear}</span>}
                {anime?.format && <span>{anime.format}</span>}
                {anime?.episodes && <span>{anime.episodes} eps</span>}
              </div>
              <p>{description}</p>
              <div className="av-mobile-hero-actions">
                <button type="button" className="av-primary-button" onClick={() => onWatchClick?.(anime.id)}><Play size={15} fill="currentColor" /> Watch</button>
                <button type="button" className="av-secondary-button" onClick={() => onDetailsClick?.(anime.id)}><Info size={15} /> Details</button>
              </div>
            </div>
          </article>
        );
      })}
      <div className="av-mobile-hero-dots" role="tablist" aria-label="Trending slides">
        {slides.slice(0, count).map((anime, index) => (
          <button key={anime.id || index} type="button" role="tab" aria-selected={index === current} aria-label={`Slide ${index + 1}`} className={index === current ? 'is-active' : ''} onClick={() => setCurrent(index)} />
        ))}
      </div>
    </section>
  );
}
