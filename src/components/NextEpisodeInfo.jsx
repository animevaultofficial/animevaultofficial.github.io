import { useEffect, useState } from 'react';
import { Clock, Zap, AlertCircle } from 'lucide-react';

/**
 * NextEpisodeInfo - Displays next episode air date with countdown
 * Shows full anime info and predicts next episode release
 */
function NextEpisodeInfo({ anime }) {
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    if (!anime?.nextAiringEpisode?.airingAt) return;

    const updateCountdown = () => {
      const airingTime = new Date(anime.nextAiringEpisode.airingAt * 1000);
      const now = new Date();
      const diffMs = airingTime - now;

      if (diffMs <= 0) {
        setCountdown('Airing now or recently aired');
        return;
      }

      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setCountdown(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setCountdown(`${hours}h ${minutes}m`);
      } else {
        setCountdown(`${minutes}m`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [anime?.nextAiringEpisode?.airingAt]);

  if (!anime?.nextAiringEpisode) return null;

  const airingDate = new Date(anime.nextAiringEpisode.airingAt * 1000);
  const formattedDate = airingDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });

  return (
    <div className="next-episode-info" style={{
      background: 'linear-gradient(135deg, rgba(255, 26, 117, 0.15) 0%, rgba(255, 26, 117, 0.05) 100%)',
      border: '1px solid rgba(255, 26, 117, 0.3)',
      borderRadius: '12px',
      padding: '1.2rem',
      marginTop: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.8rem',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
        <Clock size={20} style={{ color: 'var(--brand-color)' }} />
        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
          Next Episode
        </h3>
      </div>

      {/* Episode Details */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        gap: '1rem',
      }}>
        {/* Episode Number */}
        <div style={{
          background: 'rgba(255, 26, 117, 0.2)',
          padding: '0.8rem 1.2rem',
          borderRadius: '8px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
            Episode
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--brand-color)' }}>
            EP {anime.nextAiringEpisode.episode}
          </div>
        </div>

        {/* Air Date & Countdown */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
            Scheduled for:
          </div>
          <div style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: '500' }}>
            {formattedDate} UTC
          </div>
          {countdown && (
            <div style={{
              fontSize: '0.9rem',
              color: 'var(--brand-color)',
              marginTop: '0.5rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}>
              <Zap size={16} fill="currentColor" />
              Airing in: {countdown}
            </div>
          )}
        </div>
      </div>

      {/* Info Banner */}
      <div style={{
        background: 'rgba(255, 26, 117, 0.1)',
        border: '1px solid rgba(255, 26, 117, 0.2)',
        borderRadius: '6px',
        padding: '0.8rem',
        display: 'flex',
        gap: '0.6rem',
        fontSize: '0.85rem',
        color: 'var(--text-secondary)',
      }}>
        <AlertCircle size={16} style={{ flexShrink: 0, color: 'var(--brand-color)' }} />
        <span>Mark this anime to get notified when the next episode is available.</span>
      </div>
    </div>
  );
}

export default NextEpisodeInfo;
