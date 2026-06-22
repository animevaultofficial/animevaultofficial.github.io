import React from 'react';
import { BarChart3, Clock, Flame, Heart, Trophy, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useUser } from '../../api/UserContext';
import { getActivity, getFavorites, getLevel, getUserStats, getWatchHistory } from '../../api/database';

export default function StatsPage({ navigate }) {
  const { user, likes, continueWatching } = useUser();
  const { data: stats = {} } = useQuery({ queryKey: ['mobile-user-stats'], queryFn: getUserStats });
  const { data: level = { level: 1, xp: 0, xpToNextLevel: 100 } } = useQuery({ queryKey: ['mobile-level'], queryFn: getLevel });
  const { data: favorites = { animes: [] } } = useQuery({ queryKey: ['mobile-favorites'], queryFn: getFavorites });
  const { data: history = [] } = useQuery({ queryKey: ['mobile-watch-history'], queryFn: getWatchHistory });
  const { data: activity = [] } = useQuery({ queryKey: ['mobile-activity'], queryFn: getActivity });

  const favoriteCount = likes?.length || favorites.animes?.length || 0;
  const historyCount = history.length || continueWatching?.length || 0;
  const watched = stats.episodesWatched || historyCount;
  const watchHours = Math.round(((stats.totalWatchTime || 0) / 60) * 10) / 10;
  const progress = Math.min(100, Math.round(((level.xp || 0) / (level.xpToNextLevel || 100)) * 100));

  return (
    <div className="mobile-content">
      <div className="section-header">
        <span className="section-title"><BarChart3 size={16} /> Stats</span>
        <span className="section-link">{user ? 'Synced' : 'Local'}</span>
      </div>

      <section className="stats-hero">
        <div>
          <span>Level</span>
          <strong>{level.level || 1}</strong>
          <small>{level.xp || 0} XP · {progress}% to next</small>
        </div>
        <div className="xp-ring" style={{ '--progress': `${progress}%` }}>{progress}%</div>
      </section>

      <div className="stats-grid">
        <StatCard icon={Trophy} label="Episodes" value={watched} />
        <StatCard icon={Clock} label="Hours" value={watchHours || 0} />
        <StatCard icon={Heart} label="Favorites" value={favoriteCount} />
        <StatCard icon={Flame} label="Activity" value={activity.length || 0} />
      </div>

      <section className="section">
        <div className="section-header"><span className="section-title">Continue Watching</span></div>
        {!continueWatching?.length ? (
          <div className="empty compact"><p>No synced watch progress yet.</p></div>
        ) : (
          <div className="horizontal-scroll">
            {continueWatching.slice(0, 12).map(item => (
              <button key={`${item.media_id || item.id}-${item.episode || ''}`} className="anime-card" onClick={() => navigate('anime-detail', { id: item.media_id || item.id })}>
                <img src={item.media_poster || item.image || '/logo.png'} alt={item.media_title || item.title} className="anime-card-image" />
                <span className="anime-card-title">{item.media_title || item.title}</span>
                <span className="anime-card-sub">Episode {item.episode || 1}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {!user && (
        <div className="info-card account-row">
          <User size={18} />
          <div>
            <div className="info-label">Sign in for web parity</div>
            <div className="info-value">Stats, XP, favorites, and watch history sync after login.</div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="info-card stat-card">
      <Icon size={18} />
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
