import React from 'react';

export default function LoadingCard({ variant = 'anime' }) {
  if (variant === 'hero') return <div className="av-loading-hero av-skeleton" aria-hidden="true" />;
  if (variant === 'text') return <div className="av-loading-text av-skeleton" aria-hidden="true" />;
  if (variant === 'episode') return <div className="av-loading-episode av-skeleton" aria-hidden="true" />;
  return <div className="av-loading-card" aria-hidden="true"><div className="av-loading-poster av-skeleton" /><div className="av-loading-line av-skeleton" /><div className="av-loading-line short av-skeleton" /></div>;
}
