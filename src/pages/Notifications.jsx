
import React, { useState, useEffect, useMemo } from 'react';
import { Bell, Clock, Trophy, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNotifications, getSettings, updateSetting } from '../api/database';
import { useUser } from '../api/UserContext';

export default function Notifications() {
  const queryClient = useQueryClient();
  const { user, reminders, removeReminder } = useUser();

  // Fetch data from database
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
  });

  const { data: settings = {} } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  });

  // Mutations
  const updateSettingMutation = useMutation({
    mutationFn: ({ key, value }) => updateSetting(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  const [activeFilter, setActiveFilter] = useState('All');

  // Calculate upcoming releases
  const upcomingReleases = useMemo(() => {
    const now = Date.now() / 1000;
    return reminders
      .filter(r => r.airing_at > now)
      .sort((a, b) => a.airing_at - b.airing_at);
  }, [reminders]);

  // Countdown timer
  const [countdowns, setCountdowns] = useState({});
  React.useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now() / 1000;
      const newCountdowns = {};
      upcomingReleases.forEach(release => {
        const diff = release.airing_at - now;
        if (diff > 0) {
          const hours = Math.floor(diff / 3600);
          const minutes = Math.floor((diff % 3600) / 60);
          const seconds = Math.floor(diff % 60);
          newCountdowns[release.schedule_id] = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        } else {
          newCountdowns[release.schedule_id] = 'Airing Now!';
        }
      });
      setCountdowns(newCountdowns);
    }, 1000);

    return () => clearInterval(interval);
  }, [upcomingReleases]);

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'All') return notifications;
    return notifications.filter(n => n.type === activeFilter);
  }, [notifications, activeFilter]);

  const toggleSetting = (key) => {
    const currentValue = settings[key] ?? true;
    updateSettingMutation.mutate({ key, value: !currentValue });
  };

  return (
    <div className="notifications-page" style={{ padding: '1rem' }}>
      <div className="notifications-container" style={{ maxWidth: '100%', width: '100%' }}>
        {/* Header */}
        <div className="notifications-header">
          <div className="header-left" style={{ gap: '0.75rem' }}>
            <Bell size={28} color="#ff1a75" />
            <h1 style={{ fontSize: '1.75rem' }}>Welcome back, <span className="highlight">Adiyan</span></h1>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="stats-bar" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div className="stat-card">
            <div className="stat-icon">
              <Bell size={22} />
            </div>
            <div className="stat-text">
              <span className="stat-label">Unread Notifications:</span>
              <span className="stat-value">{notifications.filter(n => !n.read).length}</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <Clock size={22} />
            </div>
            <div className="stat-text">
              <span className="stat-label">Episodes Released Today:</span>
              <span className="stat-value">{reminders.filter(r => {
                const today = new Date().toDateString();
                const airingDate = new Date(r.airing_at * 1000).toDateString();
                return airingDate === today;
              }).length}</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <Bell size={22} />
            </div>
            <div className="stat-text">
              <span className="stat-label">Following:</span>
              <span className="stat-value">{reminders.length}</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="notifications-main" style={{ gridTemplateColumns: '1fr' }}>
          {/* Left Column - Notifications List */}
          <div className="notifications-list">
            {/* Filter Tabs */}
            <div className="filter-tabs" style={{ overflowX: 'auto' }}>
              {['All', 'Episodes', 'Announcements', 'Following'].map(tab => (
                <button
                  key={tab}
                  className={`filter-tab ${activeFilter === tab ? 'active' : ''}`}
                  onClick={() => setActiveFilter(tab)}
                >
                  {tab}
                </button>
              ))}
              <div className="filter-nav" style={{ marginLeft: 'auto' }}>
                <button className="nav-btn"><ChevronLeft size={16} /></button>
                <button className="nav-btn"><ChevronRight size={16} /></button>
              </div>
            </div>

            {/* Notifications */}
            <div className="notifications-feed">
              {/* Upcoming Releases */}
              {upcomingReleases.length > 0 && (
                <>
                  <div className="section-divider">
                    <h3>Upcoming Releases</h3>
                  </div>
                  {upcomingReleases.map(release => (
                    <div key={release.schedule_id} className="upcoming-card">
                      <p className="upcoming-countdown">
                        {countdowns[release.schedule_id] || 'Calculating...'} until {release.title} Episode {release.episode}
                      </p>
                      <button
                        className="cancel-reminder-btn"
                        onClick={() => removeReminder(release.schedule_id)}
                      >
                        Cancel Reminder
                      </button>
                    </div>
                  ))}
                </>
              )}

              {/* Notifications List */}
              {notifications.length > 0 && (
                <>
                  <div className="section-divider">
                    <h3>Your Notifications</h3>
                  </div>
                  {filteredNotifications.map((notification) => (
                    <div key={notification.id} className={`notification-card ${notification.read ? 'read' : 'unread'}`}>
                      {notification.type === 'Episodes' && notification.image && (
                        <img src={notification.image} alt={notification.title} className="notification-image" style={{ width: '80px', height: '112px', flexShrink: 0 }} />
                      )}
                      <div className="notification-content" style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                          <h4 style={{ fontSize: '1rem', overflowWrap: 'anywhere' }}>{notification.title}</h4>
                          <span className="notification-time-desktop">{notification.time}</span>
                        </div>
                        <p className="notification-desc" style={{ fontSize: '0.875rem', overflowWrap: 'anywhere' }}>{notification.description}</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {notification.type === 'Episodes' && (
                            <button className="watch-now-btn" style={{ margin: 0 }}>
                              <Play size={14} fill="white" /> Watch Now
                            </button>
                          )}
                          <span className="notification-time-mobile">{notification.time}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Empty State */}
              {upcomingReleases.length === 0 && notifications.length === 0 && (
                <div className="empty-state" style={{ padding: '3rem 1rem' }}>
                  <p>No notifications yet! Set a reminder to get notified!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .notifications-page {
          width: 100%;
          min-height: 100vh;
          background-color: #0b0f19;
          box-sizing: border-box;
        }
        .notifications-container {
          margin: 0 auto;
        }
        .notifications-header {
          margin-bottom: 1.5rem;
        }
        .header-left {
          display: flex;
          align-items: center;
        }
        .notifications-header h1 {
          font-family: 'Sora', sans-serif;
          color: white;
          margin: 0;
        }
        .highlight {
          color: #ff1a75;
        }
        .stats-bar {
          display: grid;
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .stat-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem;
          background: rgba(255, 26, 117, 0.08);
          border: 1px solid rgba(255, 26, 117, 0.3);
          border-radius: 12px;
        }
        .stat-icon {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          background: rgba(255, 26, 117, 0.15);
          border: 1px solid rgba(255, 26, 117, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ff1a75;
        }
        .stat-text {
          display: flex;
          flex-direction: column;
        }
        .stat-label {
          font-size: 0.85rem;
          color: #94a3b8;
        }
        .stat-value {
          font-family: 'Sora', sans-serif;
          font-size: 1.35rem;
          font-weight: 800;
          color: white;
        }
        .notifications-main {
          display: grid;
          gap: 2rem;
        }
        .filter-tabs {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1.25rem;
          padding-bottom: 0.25rem;
        }
        .filter-tab {
          padding: 0.6rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          color: #94a3b8;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
          font-size: 0.875rem;
        }
        .filter-tab:hover {
          border-color: rgba(255, 26, 117, 0.4);
          color: #ff1a75;
        }
        .filter-tab.active {
          background: #ff1a75;
          color: white;
          border-color: #ff1a75;
        }
        .filter-nav {
          display: flex;
          gap: 0.5rem;
        }
        .nav-btn {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #94a3b8;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .nav-btn:hover {
          border-color: rgba(255, 26, 117, 0.3);
          color: #ff1a75;
        }
        .notifications-feed {
          display: flex;
          flex-direction: column;
          gap: 0.875rem;
        }
        .notification-card {
          display: flex;
          align-items: center;
          gap: 0.875rem;
          padding: 1.25rem;
          background: linear-gradient(135deg, rgba(255, 26, 117, 0.1) 0%, rgba(15, 23, 42, 0.6) 100%);
          border: 1px solid rgba(255, 26, 117, 0.3);
          border-radius: 12px;
          transition: all 0.3s ease;
        }
        .notification-card.unread {
          background: linear-gradient(135deg, rgba(255, 26, 117, 0.15) 0%, rgba(15, 23, 42, 0.7) 100%);
          border-left: 4px solid #ff1a75;
        }
        .notification-card.read {
          opacity: 0.7;
          border-color: rgba(255, 255, 255, 0.08);
          background: rgba(15, 23, 42, 0.5);
        }
        .notification-image {
          object-fit: cover;
          border-radius: 10px;
        }
        .notification-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .notification-content h4 {
          color: white;
          margin: 0;
        }
        .notification-desc {
          color: #94a3b8;
          margin: 0;
        }
        .notification-time-mobile {
          display: none;
          color: #64748b;
          font-size: 0.75rem;
        }
        .notification-time-desktop {
          color: #64748b;
          font-size: 0.75rem;
          white-space: nowrap;
        }
        .watch-now-btn {
          margin-top: 0.5rem;
          padding: 0.5rem 1rem;
          background: #ff1a75;
          border: none;
          border-radius: 20px;
          color: white;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          width: fit-content;
          transition: all 0.2s;
        }
        .watch-now-btn:hover {
          background: #ff0055;
        }
        .section-divider {
          margin-top: 1.75rem;
          margin-bottom: 0.875rem;
        }
        .section-divider h3 {
          color: white;
          font-size: 1.15rem;
          margin: 0;
        }
        .upcoming-card {
          background: rgba(255, 255, 255, 0.06);
          padding: 1.25rem;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          gap: 0.875rem;
        }
        .upcoming-countdown {
          color: white;
          font-size: 1.05rem;
          font-weight: 700;
        }
        .cancel-reminder-btn {
          width: fit-content;
          padding: 0.5rem 1.25rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          color: #94a3b8;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.875rem;
        }
        .cancel-reminder-btn:hover {
          background: rgba(255, 26, 117, 0.1);
          border-color: rgba(255, 26, 117, 0.3);
          color: #ff1a75;
        }
        .empty-state {
          color: #64748b;
          text-align: center;
        }
        @media (min-width: 1024px) {
          .notifications-main {
            grid-template-columns: 1fr 320px;
          }
        }
        @media (max-width: 600px) {
          .stats-bar {
            grid-template-columns: 1fr !important;
          }
          .notifications-header h1 {
            font-size: 1.3rem !important;
          }
          .filter-tab {
            padding: 0.5rem 0.75rem;
            font-size: 0.8rem;
          }
          .notification-time-desktop {
            display: none !important;
          }
          .notification-time-mobile {
            display: inline-block !important;
          }
          .notification-image {
            width: 65px !important;
            height: 90px !important;
          }
          .notification-card {
            padding: 1rem !important;
            gap: 0.75rem !important;
          }
        }
      `}</style>
    </div>
  );
}
