import React, { useEffect, useMemo, useState } from 'react';
import { Bell, BellOff, Calendar, Clock, Loader, Star } from 'lucide-react';
import { useUser } from '../../api/UserContext';
import { requestMobileNotificationPermission, scheduleMobileNotification, cancelMobileNotification } from '../notifications/mobileNotifications';

const ANILIST_URL = 'https://graphql.anilist.co';
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const SCHEDULE_QUERY = `query($start:Int!,$end:Int!){Page(page:1,perPage:50){airingSchedules(airingAt_greater:$start,airingAt_lesser:$end,sort:AIRING_AT){id airingAt timeUntilAiring episode media{id title{english romaji} coverImage{extraLarge large}}}}}`;

function weekRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start: Math.floor(start.getTime() / 1000), end: Math.floor(end.getTime() / 1000) };
}
function titleFor(item) { return item?.media?.title?.english || item?.media?.title?.romaji || 'Unknown'; }
function imageFor(item) { return item?.media?.coverImage?.extraLarge || item?.media?.coverImage?.large || '/logo.png'; }
function timeLabel(timestamp) { return new Date(timestamp * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
function countdownLabel(seconds) {
  if (!seconds || seconds < 0) return 'Airing soon';
  const days = Math.floor(seconds / 86400), hours = Math.floor((seconds % 86400) / 3600), minutes = Math.floor((seconds % 3600) / 60);
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
      setLoading(true); setError('');
      try {
        const response = await fetch(ANILIST_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ query: SCHEDULE_QUERY, variables: weekRange() }) });
        const json = await response.json();
        setSchedule(json.data?.Page?.airingSchedules || []);
      } catch (err) { setError(err.message || 'Failed to load airing schedule.'); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  useEffect(() => () => schedule.forEach(item => cancelMobileNotification(item.id)), [schedule]);

  const grouped = useMemo(() => schedule.reduce((acc, item) => { const day = new Date(item.airingAt * 1000).getDay(); (acc[day] ||= []).push(item); return acc; }, {}), [schedule]);
  const currentItems = grouped[selectedDay] || [];
  const nextUp = schedule.find(item => item.timeUntilAiring > 0);

  async function toggleReminder(item) {
    if (!user) return;
    if (isReminded(item.id)) { await removeReminder(item.id); cancelMobileNotification(item.id); return; }
    const permission = await requestMobileNotificationPermission();
    await addReminder(item.id, item.media.id, titleFor(item), item.episode, item.airingAt, imageFor(item));
    if (permission === 'granted') scheduleMobileNotification({ id: item.id, timestamp: item.airingAt * 1000, title: `${titleFor(item)} is airing`, body: `Episode ${item.episode} is now available.`, url: `/anime/${item.media.id}` });
  }

  return (
    <div className="mobile-content">
      <div className="section-header"><span className="section-title"><Calendar size={16} /> Airing Schedule</span><span className="section-link">{schedule.length} this week</span></div>
      {nextUp && <button className="airing-spotlight" onClick={() => navigate('anime-detail', { id: nextUp.media.id })}><img src={imageFor(nextUp)} alt={titleFor(nextUp)} /><div><span>Next up</span><strong>{titleFor(nextUp)}</strong><small>Episode {nextUp.episode} · {countdownLabel(nextUp.timeUntilAiring)}</small></div></button>}
      <div className="schedule-day-strip">{DAY_SHORT.map((day, i) => <button key={day} className={selectedDay === i ? 'active' : ''} onClick={() => setSelectedDay(i)}>{day}</button>)}</div>
      {loading ? <div className="schedule-empty"><Loader className="spin" size={22} /> Loading schedule…</div> : error ? <div className="schedule-empty"><p>{error}</p></div> : currentItems.length === 0 ? <div className="schedule-empty"><Calendar size={28} /><p>No anime airing on {DAY_NAMES[selectedDay]}.</p></div> : <div className="schedule-list">{currentItems.map(item => { const reminded = isReminded(item.id); return <article key={item.id} className="schedule-card"><img src={imageFor(item)} alt={titleFor(item)} /><button className="schedule-card-main" onClick={() => navigate('anime-detail', { id: item.media.id })}><strong>{titleFor(item)}</strong><span>Episode {item.episode} · {timeLabel(item.airingAt)}</span><small>{item.timeUntilAiring > 0 ? countdownLabel(item.timeUntilAiring) : 'Airing now'}</small></button><button className={`schedule-reminder ${reminded ? 'active' : ''}`} onClick={() => toggleReminder(item)} aria-label={reminded ? 'Remove reminder' : 'Set reminder'}>{reminded ? <BellOff size={17} /> : <Bell size={17} />}</button></article>; })}</div>}
    </div>
  );
}
