import React, { useState, useEffect } from 'react';
import { Calendar, Clock, TrendingUp } from 'lucide-react';

const ANILIST_URL = 'https://graphql.anilist.co';
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const SCHEDULE_QUERY = `
  query ($start: Int, $end: Int) {
    Page(page: 1, perPage: 50) {
      airingSchedules(airingAt_greater: $start, airingAt_lesser: $end, sort: TIME) {
        id
        episode
        airingAt
        timeUntilAiring
        media {
          id
          title { romaji english }
          coverImage { large }
          format
          averageScore
          genres
        }
      }
    }
  }
`;

function getWeekRange() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 7);
  return {
    start: Math.floor(monday.getTime() / 1000),
    end: Math.floor(sunday.getTime() / 1000),
  };
}

export default function SchedulePage({ navigate }) {
  const nav = (id) => navigate('anime-detail', { id });
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());

  useEffect(() => {
    async function fetchSchedule() {
      const { start, end } = getWeekRange();
      try {
        const res = await fetch(ANILIST_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: SCHEDULE_QUERY, variables: { start, end } })
        });
        const json = await res.json();
        setSchedule(json.data?.Page?.airingSchedules || []);
      } catch (err) {
        console.error('Schedule fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSchedule();
  }, []);

  const groupedByDay = {};
  schedule.forEach(item => {
    const date = new Date(item.airingAt * 1000);
    const day = date.getDay();
    if (!groupedByDay[day]) groupedByDay[day] = [];
    groupedByDay[day].push(item);
  });

  const todayItems = groupedByDay[selectedDay] || [];
  const today = new Date().getDay();

  return (
    <div className="mobile-content">
      <div className="section-header" style={{ marginBottom: 12 }}>
        <span className="section-title"><Calendar size={16} /> Weekly Schedule</span>
      </div>

      {/* Day Pills */}
      <div className="h-scroll" style={{ marginBottom: 16 }}>
        {DAYS_SHORT.map((day, i) => (
          <button key={i} onClick={() => setSelectedDay(i)}
            style={{
              flexShrink: 0, padding: '8px 14px', borderRadius: 20, cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem',
              background: selectedDay === i ? 'var(--brand)' : 'var(--border)',
              color: selectedDay === i ? '#fff' : i === today ? 'var(--brand)' : 'var(--text3)',
              border: i === today && selectedDay !== i ? '2px solid var(--brand-dim)' : '2px solid transparent',
              fontFamily: 'var(--font)',
            }}>
            {day}
          </button>
        ))}
      </div>

      <p style={{ fontSize: '0.85rem', color: 'var(--text3)', marginBottom: 12 }}>
        {DAYS[selectedDay]} · {todayItems.length} airing
      </p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text3)' }}>
          <div className="loading-shimmer" style={{ width: 40, height: 40, borderRadius: '50%', margin: '0 auto 12px' }} />
          <p>Loading schedule...</p>
        </div>
      ) : todayItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text3)' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>📺</div>
          <p>No anime airing this day</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {todayItems.map(item => {
            const media = item.media;
            const title = media.title?.english || media.title?.romaji || 'Unknown';
            const image = media.coverImage?.large;
            const airTime = new Date(item.airingAt * 1000);
            const hours = airTime.getHours().toString().padStart(2, '0');
            const mins = airTime.getMinutes().toString().padStart(2, '0');
            const isSoon = item.timeUntilAiring < 3600;

            return (
              <div key={item.id} onClick={() => nav(media.id)}
                className="info-card" style={{ display: 'flex', gap: 12, padding: 10, cursor: 'pointer', border: isSoon ? '1px solid var(--brand-dim)' : '1px solid var(--border-light)' }}>
                <div style={{ width: 48, height: 68, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: 'var(--surface2)' }}>
                  {image && <img src={image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
                  <div style={{ color: 'var(--text3)', fontSize: '0.75rem' }}>
                    Ep {item.episode} · {isSoon ? <span style={{ color: 'var(--brand)' }}>🔴 Airing now</span> : `${hours}:${mins}`}
                  </div>
                  {media.averageScore && <div className="stat-pill" style={{ display: 'inline-block', marginTop: 4 }}>⭐ {media.averageScore}%</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}