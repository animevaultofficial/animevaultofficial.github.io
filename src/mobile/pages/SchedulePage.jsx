import React, { useEffect, useMemo, useState } from 'react';
import { Bell, BellOff, Calendar, Clock, Loader, Star } from 'lucide-react';
import { useUser } from '../../api/UserContext';

const ANILIST_URL = 'https://graphql.anilist.co';
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const SCHEDULE_QUERY = `
  query ($start: Int, $end: Int) {
    Page(page: 1, perPage: 80) {
      airingSchedules(airingAt_greater: $start, airingAt_lesser: $end, sort: TIME) {
        id
        episode
        airingAt
        timeUntilAiring
        media {
          id
          title { romaji english }
          coverImage { large extraLarge }
          format
          averageScore
          genres
        }
      }
    }
  }
`;

function weekRange() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return {
    start: Math.floor(start.getTime() / 1000),
    end: Math.floor(end.getTime() / 1000),
  };
}

function titleFor(item) {
  return item?.media?.title?.english || item?.media?.title?.romaji || 'Unknown';
}

function imageFor(item) {
  return item?.media?.coverImage?.extraLarge || item?.media?.coverImage?.large || '/logo.png';
}

function timeLabel(timestamp) {
  return new Date(timestamp * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function countdownLabel(seconds) {
  if (!seconds || seconds < 0) return 'Airing soon';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function SchedulePage({ navigate }) {
  const { user, addReminder, removeReminder, isReminded } = useUser();
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      const range = weekRange();
      try {
        const response = await fetch(ANILIST_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ query: SCHEDULE_QUERY, variables: range }),
        });
        const json = await response.json();
        setSchedule(json.data?.Page?.airingSchedules || []);
      } catch (err) {
        setError(err.message || 'Failed to load airing schedule.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const grouped = useMemo(() => {
    return schedule.reduce((acc, item) => {
      const day = new Date(item.airingAt * 1000).getDay();
      acc[day] = acc[day] || [];
      acc[day].push(item);
      return acc;
    }, {});
  }, [schedule]);

  const today = new Date().getDay();
  const currentItems = grouped[selectedDay] || [];
  const nextUp = schedule.find(item => item.timeUntilAiring > 0);

  async function toggleReminder(item) {
    if (!user) return;
    if (isReminded(item.id)) {
      await removeReminder(item.id);
      return;
    }
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    await addReminder(item.id, item.media.id, titleFor(item), item.episode, item.airingAt, imageFor(item));
  }

  return (
    <div className="mobile-content">
      <div className="section-header">
        <span className="section-title"><Calendar size={16} /> Airing Schedule</span>
        <span className="section-link">{schedule.length} this week</span>
      </div>

      {nextUp && (
        <button className="airing-spotlight" onClick={() => navigate('anime-detail', { id: nextUp.media.id })}>
          <img src={imageFor(nextUp)} alt={titleFor(nextUp)} />
          <div>
            <span>Next up</span>
            <strong>{titleFor(nextUp)}</strong>
            <small>Episode {nextUp.episode} · {countdownLabel(nextUp.timeUntilAiring)}</small>
          </div>
        </button>
      )}

      <div className="day-strip">
        {DAY_SHORT.map((day, index) => (
          <button key={day} className={selectedDay === index ? 'active' : ''} onClick={() => setSelectedDay(index)}>
            <span>{day}</span>
            <strong>{grouped[index]?.length || 0}</strong>
            {today === index && <small>Today</small>}
          </button>
        ))}
      </div>

      {loading && <div className="empty"><Loader className="spin" size={30} /><p>Loading airing schedule</p></div>}
      {error && <div className="empty"><p>{error}</p></div>}
      {!loading && !error && currentItems.length === 0 && (
        <div className="empty"><Clock size={34} /><p>No episodes scheduled for {DAY_NAMES[selectedDay]}.</p></div>
      )}

      {!loading && currentItems.length > 0 && (
        <div className="airing-list">
          {currentItems.map(item => {
            const reminded = isReminded(item.id);
            return (
              <article key={item.id} className="airing-card">
                <button className="airing-main" onClick={() => navigate('anime-detail', { id: item.media.id })}>
                  <img src={imageFor(item)} alt={titleFor(item)} />
                  <div>
                    <span>{timeLabel(item.airingAt)} · Ep {item.episode}</span>
                    <strong>{titleFor(item)}</strong>
                    <small>
                      {item.media.averageScore ? <><Star size={12} /> {item.media.averageScore}%</> : item.media.format}
                      <b>{countdownLabel(item.timeUntilAiring)}</b>
                    </small>
                  </div>
                </button>
                <button className={`reminder-btn ${reminded ? 'active' : ''}`} onClick={() => toggleReminder(item)} disabled={!user}>
                  {reminded ? <BellOff size={17} /> : <Bell size={17} />}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
