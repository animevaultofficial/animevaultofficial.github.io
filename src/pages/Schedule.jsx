
// src/pages/Schedule.jsx
// Fetches REAL airing schedule data from AniList GraphQL API
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Play, 
  Bookmark, 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  User, 
  Layers,
  Loader
} from 'lucide-react';
import { FocusableButton } from '../components/FocusableWrapper';
import { 
  fetchAniListWeeklySchedule, 
  groupByDay, 
  pickCarouselItems, 
  pickAiringToday,
  generatePrediction 
} from '../api/scheduleService';
import { addNotification } from '../api/db';
import { useUser } from '../api/UserContext';
import '../styles/designTokens.css';
import '../styles/schedule.css';

const FALLBACK_IMG = 'https://placehold.co/180x255/1a1a2e/ff1a75.png?text=No+Poster';
const FALLBACK_SMALL = 'https://placehold.co/110x160/1a1a2e/ff1a75.png?text=No+Image';
const FALLBACK_AVATAR = 'https://placehold.co/32x32/1a1a2e/ff1a75.png?text=?';
const FALLBACK_TODAY = 'https://placehold.co/70x95/1a1a2e/ff1a75.png?text=No+Img';

export default function Schedule() {
  const queryClient = useQueryClient();
  const { user, reminders, addReminder, removeReminder, isReminded } = useUser();

  // Mutation to add notification
  const addNotificationMutation = useMutation({
    mutationFn: addNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Toggle reminder for an anime
  const toggleReminder = async (anime) => {
    if (!user) return;
    if (isReminded(anime.scheduleId)) {
      await removeReminder(anime.scheduleId);
    } else {
      // Request browser notification permission if not already granted
      if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }

      // Add reminder
      await addReminder(anime.scheduleId, anime.id, anime.title, anime.episode, anime.airingAt, anime.image);

      // Add notification
      await addNotificationMutation.mutateAsync({
        type: 'Episodes',
        title: `Reminder Set: ${anime.title}`,
        description: `You'll be notified when Episode ${anime.episode} airs!`,
        image: anime.image,
        time: 'Just now',
        read: false
      });
    }
  };

  // Fetch real schedule from AniList
  const { data: rawSchedule = [], isLoading, isError, error } = useQuery({
    queryKey: ['anilist-schedule'],
    queryFn: fetchAniListWeeklySchedule,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 2,
  });

  // Derived data
  const scheduleByDay = useMemo(() => groupByDay(rawSchedule), [rawSchedule]);
  const carouselItems = useMemo(() => pickCarouselItems(rawSchedule, 5), [rawSchedule]);
  const airingTodayItems = useMemo(() => pickAiringToday(rawSchedule).slice(0, 6), [rawSchedule]);

  // Day tabs: generate from today + 6 days
  const DAYS_DATA = useMemo(() => {
    const DAYS_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const list = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dayName = DAY_NAMES[d.getDay()];
      list.push({
        key: dayName,
        label: DAYS_SHORT[d.getDay()],
        num: d.getDate(),
        count: scheduleByDay[dayName]?.length || 0
      });
    }
    return list;
  }, [scheduleByDay]);

  const todayName = useMemo(() => {
    const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return DAY_NAMES[new Date().getDay()];
  }, []);

  const [activeDay, setActiveDay] = useState(todayName);
  const [carouselIndex, setCarouselIndex] = useState(0);

  // Auto-rotate carousel
  React.useEffect(() => {
    if (carouselItems.length <= 1) return;
    const interval = setInterval(() => {
      setCarouselIndex(prev => (prev + 1) % carouselItems.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [carouselItems.length]);

  // Carousel active item
  const activeCarouselItem = carouselItems[carouselIndex] || null;

  // Countdown state
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });

  React.useEffect(() => {
    if (!activeCarouselItem) return;

    function updateCountdown() {
      const diff = activeCarouselItem.timeUntilAiring;
      const now = Math.max(0, diff);
      const days = Math.floor(now / 86400);
      const hours = Math.floor((now % 86400) / 3600);
      const minutes = Math.floor((now % 3600) / 60);
      setTimeLeft({ days, hours, minutes });
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [activeCarouselItem]);

  const handlePrevSlide = () => {
    if (carouselItems.length === 0) return;
    setCarouselIndex(prev => (prev === 0 ? carouselItems.length - 1 : prev - 1));
  };

  const handleNextSlide = () => {
    if (carouselItems.length === 0) return;
    setCarouselIndex(prev => (prev === carouselItems.length - 1 ? 0 : prev + 1));
  };

  const dayCards = useMemo(() => {
    return scheduleByDay[activeDay] || [];
  }, [scheduleByDay, activeDay]);

  // Stats
  const totalAiring = rawSchedule.length;
  const airingToday = airingTodayItems.length;
  const uniqueAnime = useMemo(() => {
    const ids = new Set(rawSchedule.map(s => s.id));
    return ids.size;
  }, [rawSchedule]);

  // Loading state
  if (isLoading) {
    return (
      <div className="page-container schedule-page-override">
        <div className="schedule-container" style={{ justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', color: '#94a3b8' }}>
            <Loader size={32} className="spin-animation" style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600 }}>Loading schedule from AniList...</p>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="page-container schedule-page-override">
        <div className="schedule-container" style={{ justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div style={{ textAlign: 'center', color: '#ff1a75' }}>
            <p style={{ fontSize: '1.2rem', fontWeight: 700 }}>Failed to load schedule</p>
            <p style={{ color: '#64748b', fontSize: '0.85rem' }}>{error?.message || 'Unknown error'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container schedule-page-override">
      <div className="schedule-container">
        
        {/* LEFT COLUMN: Main content */}
        <div className="schedule-main-content">
          
          {/* Hero Carousel */}
          {activeCarouselItem && (
            <div className="carousel-wrapper">
              <div 
                className="carousel-slide-bg" 
                style={{ backgroundImage: `url(${activeCarouselItem.bannerImage})` }} 
              />
              
              <button className="carousel-nav-btn prev" onClick={handlePrevSlide} aria-label="Previous slide">
                <ChevronLeft size={24} />
              </button>
              <button className="carousel-nav-btn next" onClick={handleNextSlide} aria-label="Next slide">
                <ChevronRight size={24} />
              </button>

              <div className="carousel-slide-content">
                <div className="carousel-poster-container">
                  <img 
                    src={activeCarouselItem.image} 
                    alt={activeCarouselItem.title} 
                    className="carousel-poster"
                    referrerPolicy="no-referrer"
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMG; }} 
                  />
                </div>

                <div className="carousel-details">
                  <h1 className="carousel-title">{activeCarouselItem.title}</h1>
                  
                  <div className="carousel-countdown-grid">
                    <div className="countdown-box highlight">
                      <span className="countdown-num">{timeLeft.days}</span>
                      <span className="countdown-lbl">Days</span>
                    </div>
                    <div className="countdown-box normal">
                      <span className="countdown-num">{timeLeft.hours}</span>
                      <span className="countdown-lbl">Hours</span>
                    </div>
                    <div className="countdown-box normal">
                      <span className="countdown-num">{timeLeft.minutes}</span>
                      <span className="countdown-lbl">Minutes</span>
                    </div>
                  </div>

                  <div className="carousel-meta">
                    <span>Episode {activeCarouselItem.episode}</span>
                    <span className="separator" />
                    <span>{activeCarouselItem.genres.join(', ')}</span>
                    <span className="separator" />
                    <span>Rating: {activeCarouselItem.rating}</span>
                  </div>

                  <div className="carousel-actions">
                    <FocusableButton className="carousel-btn-watch">
                      <Play size={16} fill="white" />
                      <span>WATCH NOW</span>
                    </FocusableButton>
                    <FocusableButton className="carousel-btn-follow">
                      <Bookmark size={16} />
                      <span>FOLLOW</span>
                    </FocusableButton>
                  </div>
                </div>
              </div>

              <div className="carousel-dots">
                {carouselItems.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCarouselIndex(idx)}
                    className={`carousel-dot ${idx === carouselIndex ? 'active' : ''}`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Airing Today Section */}
          <div>
            <h2 className="section-title" style={{ marginBottom: '16px' }}>Airing Today</h2>
            <div className="airing-today-grid">
              {airingTodayItems.length > 0 ? (
                airingTodayItems.slice(0, 3).map((anime) => {
                  const elapsed = anime.timeUntilAiring <= 0
                    ? `${Math.abs(Math.round(anime.timeUntilAiring / 60))}m ago`
                    : `in ${Math.round(anime.timeUntilAiring / 3600)}h`;
                  return (
                    <div key={anime.scheduleId} className="airing-today-card">
                      <div className="airing-today-img-container">
                        <img 
                          src={anime.image} 
                          alt={anime.title} 
                          className="airing-today-img"
                          referrerPolicy="no-referrer"
                          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_TODAY; }} 
                        />
                      </div>
                      <div className="airing-today-info">
                        <h3 className="airing-today-name">{anime.title}</h3>
                        <span className="airing-today-elapsed">{elapsed}</span>
                        <span className="airing-today-time">Release Time: {anime.broadcastTime}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ gridColumn: '1 / -1', color: '#64748b', padding: '1rem 0' }}>
                  No anime airing today yet.
                </div>
              )}
            </div>
          </div>

          {/* Premium Day Calendar Tabs */}
          <div className="premium-day-wrapper">
            <div className="premium-day-header">
              <h2 className="section-title">Premium Day</h2>
            </div>
            <div className="day-tabs-container">
              {DAYS_DATA.map((day) => {
                const isActive = day.key === activeDay;
                return (
                  <div
                    key={day.key}
                    className={`day-tab-btn ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveDay(day.key)}
                  >
                    <span className="day-tab-lbl">{day.label}</span>
                    <span className="day-tab-num">{day.num}</span>
                    <span className="day-tab-count">{day.count} Anime</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Main Airing Cards Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="schedule-grid">
              {dayCards.length > 0 ? (
                dayCards.map((anime, idx) => {
                  const prediction = generatePrediction(anime);
                  const hasReminder = isReminded(anime.scheduleId);
                  return (
                    <div key={`${anime.scheduleId}-${idx}`} className="schedule-anime-card">
                      <img 
                        src={anime.image} 
                        alt={anime.title} 
                        className="anime-card-poster"
                        referrerPolicy="no-referrer"
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_SMALL; }} 
                      />
                      
                      <div className="anime-card-content">
                        <h3 className="anime-card-title" title={anime.title}>{anime.title}</h3>
                        <span className="anime-card-native" title={anime.nativeTitle}>
                          Native title: {anime.nativeTitle}
                        </span>
                        
                        <div className="anime-card-meta-row">
                          <span className="label">Genres: </span>
                          <span>{anime.genres.slice(0, 4).join(', ')}</span>
                        </div>
                        <div className="anime-card-meta-row">
                          <span className="label">Studio: </span>
                          <span>{anime.studio}</span>
                        </div>
                        <div className="anime-card-meta-row" style={{ marginBottom: '6px' }}>
                          <span className="label">Rating: </span>
                          <span>{anime.rating}</span>
                        </div>

                        <div className="prediction-system-box">
                          <span className="prediction-title">Episode Prediction System</span>
                          <div className="prediction-item">
                            <span>Previous:</span>
                            <span className="value">{prediction.previous}</span>
                          </div>
                          <div className="prediction-item">
                            <span>Predicted:</span>
                            <span className="value">{prediction.predicted}</span>
                          </div>
                          <div className="confidence-row">
                            <span>Confidence:</span>
                            <span className="percentage">{prediction.confidence}%</span>
                          </div>
                          <div className="prediction-progress-bg">
                            <div 
                              className="prediction-progress-bar" 
                              style={{ width: `${prediction.confidence}%` }} 
                            />
                          </div>
                        </div>

                        <button
                          className={`reminder-btn ${hasReminder ? 'active' : ''}`}
                          onClick={() => toggleReminder(anime)}
                        >
                          {hasReminder ? 'Cancel Reminder' : 'Set Reminder'}
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ gridColumn: '1 / -1', padding: '2rem 0', color: '#64748b', textAlign: 'center' }}>
                  No anime scheduled for {activeDay}.
                </div>
              )}
            </div>

            <div className="timeline-separator-container">
              <div className="timeline-dot" />
              <div className="timeline-line" />
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Sidebar */}
        <div className="schedule-sidebar">
          
          {/* Activity Feed - shows recent airings */}
          <div className="sidebar-panel">
            <h2 className="sidebar-panel-title">Activity Feed</h2>
            <div className="activity-feed-list">
              {rawSchedule
                .filter(item => item.timeUntilAiring <= 0)
                .sort((a, b) => b.airingAt - a.airingAt)
                .slice(0, 6)
                .map((item) => {
                  const agoMinutes = Math.abs(Math.round(item.timeUntilAiring / 60));
                  const timeStr = agoMinutes < 60 
                    ? `${agoMinutes} minutes ago`
                    : `${Math.round(agoMinutes / 60)} hours ago`;
                  return (
                    <div key={item.scheduleId} className="activity-feed-item">
                      <img 
                        src={item.image} 
                        alt={item.title} 
                        className="activity-avatar"
                        referrerPolicy="no-referrer"
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_AVATAR; }} 
                      />
                      <div className="activity-text-container">
                        <p className="activity-desc" title={`${item.title} Ep ${item.episode}`}>
                          {item.title} Ep {item.episode} Released
                        </p>
                        <span className="activity-time">{timeStr}</span>
                      </div>
                    </div>
                  );
                })
              }
              {rawSchedule.filter(item => item.timeUntilAiring <= 0).length === 0 && (
                <p style={{ color: '#64748b', fontSize: '0.8rem', padding: '8px' }}>No recent releases yet today.</p>
              )}
            </div>
            <button className="btn-show-more">Show more</button>
          </div>

          {/* Stats Widgets - real counts */}
          <div className="stats-widgets-list">
            <div className="stats-widget">
              <div className="stats-widget-info">
                <span className="stats-widget-lbl">Currently Airing</span>
                <span className="stats-widget-val">{uniqueAnime}</span>
              </div>
              <div className="stats-widget-icon-box">
                <Layers size={18} />
              </div>
            </div>

            <div className="stats-widget">
              <div className="stats-widget-info">
                <span className="stats-widget-lbl">Releasing Today</span>
                <span className="stats-widget-val">{airingToday}</span>
              </div>
              <div className="stats-widget-icon-box">
                <Calendar size={18} />
              </div>
            </div>

            <div className="stats-widget">
              <div className="stats-widget-info">
                <span className="stats-widget-lbl">Total Episodes</span>
                <span className="stats-widget-val">{totalAiring}</span>
              </div>
              <div className="stats-widget-icon-box">
                <User size={18} />
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

