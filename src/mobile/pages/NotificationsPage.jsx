import React from 'react';
import { Bell, CalendarClock, CheckCircle2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getNotifications } from '../../api/db';
import { useUser } from '../../api/UserContext';

export default function NotificationsPage({ navigate }) {
  const { user, reminders } = useUser();
  const { data: notifications = [] } = useQuery({ queryKey: ['mobile-notifications'], queryFn: getNotifications });

  return (
    <div className="mobile-content">
      <div className="section-header">
        <span className="section-title"><Bell size={16} /> Notifications</span>
        <span className="section-link">{notifications.length + reminders.length}</span>
      </div>

      {!user && (
        <div className="info-card account-row">
          <Bell size={18} />
          <div>
            <div className="info-label">Account sync</div>
            <div className="info-value">Sign in to sync reminders and notifications from the web app.</div>
          </div>
        </div>
      )}

      {!!reminders.length && (
        <section className="section">
          <div className="section-header"><span className="section-title">Airing Reminders</span></div>
          <div className="notification-list">
            {reminders.map(item => (
              <button key={item.schedule_id || item.id} className="notification-card" onClick={() => navigate('anime-detail', { id: item.anime_id })}>
                <img src={item.image || '/logo.png'} alt={item.title} />
                <div>
                  <strong>{item.title}</strong>
                  <span>Episode {item.episode} reminder</span>
                </div>
                <CalendarClock size={17} />
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <div className="section-header"><span className="section-title">Activity</span></div>
        {!notifications.length ? (
          <div className="empty compact"><CheckCircle2 size={32} /><p>No notifications right now.</p></div>
        ) : (
          <div className="notification-list">
            {notifications.map(item => (
              <article key={item.id || `${item.title}-${item.time}`} className="notification-card">
                <img src={item.image || '/logo.png'} alt="" />
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.description || item.time || 'Just now'}</span>
                </div>
                {!item.read && <i />}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
