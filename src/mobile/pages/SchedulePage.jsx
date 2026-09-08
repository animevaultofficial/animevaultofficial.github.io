import React, { useEffect, useMemo, useState } from 'react';
import { Bell, BellOff, Calendar, ChevronRight, Loader, RefreshCw } from 'lucide-react';
import { useUser } from '../../api/UserContext';
import { requestMobileNotificationPermission, scheduleMobileNotification, cancelMobileNotification } from '../notifications/mobileNotifications';

const ANILIST_URL = 'https://graphql.anilist.co';
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const REQUEST_TIMEOUT = 12000;
const SCHEDULE_QUERY = `query($page:Int!,$start:Int!,$end:Int!){Page(page:$page,perPage:50){pageInfo{hasNextPage}airingSchedules(airingAt_greater:$start,airingAt_lesser:$end,sort:AIRING_AT){id airingAt timeUntilAiring episode media{id title{english romaji} coverImage{extraLarge large}}}}}`;

function weekRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start: Math.floor(start.getTime() / 1000), end: Math.floor(end.getTime() / 1000) };
}

async function fetchSchedule() {
  const range = weekRange();
  const all = [];
  let page = 1;
  let hasNext = true;
  while (hasNext && page <= 10) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    try {
      const response = await fetch(ANILIST_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ query: SCHEDULE_QUERY, variables: { page, ...range } }), signal: controller.signal, cache: 'no-store' });
      if (!response.ok) throw new Error(`Schedule service returned ${response.status}.`);
      const json = await response.json();
      if (json.errors?.length) throw new Error(json.errors[0]?.message || 'AniList schedule query failed.');
      const result = json.data?.Page;
      all.push(...(result?.airingSchedules || []));
      hasNext = Boolean(result?.pageInfo?.hasNextPage);
      page += 1;
    } finally { clearTimeout(timeout); }
  }
  const seen = new Set();
  return all.filter(item => { if (!item?.id || seen.has(item.id)) return false; seen.add(item.id); return true; }).sort((a, b) => a.airingAt - b.airingAt);
}

const titleFor = item => item?.media?.title?.english || item?.media?.title?.romaji || 'Unknown anime';
const imageFor = item => item?.media?.coverImage?.extraLarge || item?.media?.coverImage?.large || '/logo.png';
const timeLabel = timestamp => new Date(timestamp * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const dateLabel = timestamp => new Date(timestamp * 1000).toLocaleDateString([], { month: 'short', day: 'numeric' });
function countdownLabel(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return 'Airing now';
  const days = Math.floor(seconds / 86400), hours = Math.floor((seconds % 86400) / 3600), minutes = Math.floor((seconds % 3600) / 60);
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  return `${Math.max(minutes, 1)}m`;
}

export default function SchedulePage({ navigate }) {
  const { user, addReminder, removeReminder, isReminded } = useUser();
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [reminderBusy, setReminderBusy] = useState(null);

  async function loadSchedule(isRefresh = false) {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try { setSchedule(await fetchSchedule()); }
    catch (err) { setError(err?.name === 'AbortError' ? 'The airing service took too long to respond.' : (err?.message || 'Failed to load airing schedule.')); }
    finally { isRefresh ? setRefreshing(false) : setLoading(false); }
  }

  useEffect(() => { loadSchedule(); }, []);

  const grouped = useMemo(() => schedule.reduce((acc, item) => { const day = new Date(item.airingAt * 1000).getDay(); (acc[day] ||= []).push(item); return acc; }, {}), [schedule]);
  const currentItems = grouped[selectedDay] || [];
  const nextUp = schedule.find(item => item.airingAt * 1000 > Date.now());
  const counts = DAY_SHORT.map((_, i) => grouped[i]?.length || 0);

  async function toggleReminder(item) {
    if (!user) return;
    setReminderBusy(item.id);
    try {
      if (isReminded(item.id)) {
        await removeReminder(item.id);
        cancelMobileNotification(item.id);
        return;
      }
      const permission = await requestMobileNotificationPermission();
      await addReminder({ id: item.id, anime_id: item.media.id, title: titleFor(item), episode: item.episode, airing_at: item.airingAt, image: imageFor(item) });
      if (permission === 'granted') scheduleMobileNotification({ id: item.id, timestamp: item.airingAt * 1000, title: `${titleFor(item)} is airing`, body: `Episode ${item.episode} is now available.`, url: `/anime/${item.media.id}` });
    } finally { setReminderBusy(null); }
  }

  return <div className="av-schedule-v2">
    <header className="av-schedule-head"><div><span className="av-eyebrow-v2">YOUR VAULT</span><h1>Airing Schedule</h1><p>See what is airing next and never miss an episode.</p></div><button className="av-schedule-refresh" onClick={() => loadSchedule(true)} disabled={refreshing} aria-label="Refresh schedule"><RefreshCw size={18} className={refreshing ? 'spin' : ''} /></button></header>
    {nextUp && <button className="av-schedule-next" onClick={() => navigate('anime-detail', { id: nextUp.media.id })}><img src={imageFor(nextUp)} alt="" /><span className="av-schedule-next-copy"><small>NEXT UP · {dateLabel(nextUp.airingAt)} · {timeLabel(nextUp.airingAt)}</small><strong>{titleFor(nextUp)}</strong><span>Episode {nextUp.episode} · {countdownLabel(Math.max(0, nextUp.airingAt - Date.now() / 1000))}</span></span><ChevronRight size={22} /></button>}
    <div className="av-schedule-days" role="tablist" aria-label="Airing days">{DAY_SHORT.map((day, i) => <button key={day} role="tab" aria-selected={selectedDay === i} className={selectedDay === i ? 'active' : ''} onClick={() => setSelectedDay(i)}><span>{day}</span><b>{counts[i]}</b></button>)}</div>
    {loading ? <div className="av-schedule-state"><Loader size={25} className="spin" /><span>Loading this week’s anime…</span></div> : error ? <div className="av-schedule-state error"><Calendar size={30} /><strong>Schedule unavailable</strong><span>{error}</span><button onClick={() => loadSchedule(true)}>Try Again</button></div> : currentItems.length === 0 ? <div className="av-schedule-state"><Calendar size={30} /><strong>Nothing scheduled</strong><span>No anime is listed for {DAY_NAMES[selectedDay]}.</span><button onClick={() => loadSchedule(true)}>Refresh</button></div> : <section className="av-schedule-list"><div className="av-schedule-list-head"><div><h2>{DAY_NAMES[selectedDay]}</h2><span>{currentItems.length} episode{currentItems.length === 1 ? '' : 's'}</span></div></div>{currentItems.map(item => { const reminded = isReminded(item.id); const busy = reminderBusy === item.id; return <article className="av-schedule-card" key={item.id}><button className="av-schedule-card-main" onClick={() => navigate('anime-detail', { id: item.media.id })}><img src={imageFor(item)} alt="" /><span><strong>{titleFor(item)}</strong><small>Episode {item.episode} · {timeLabel(item.airingAt)}</small><em>{item.airingAt * 1000 > Date.now() ? `In ${countdownLabel(item.airingAt - Date.now() / 1000)}` : 'Airing now'}</em></span></button><button className={`av-schedule-reminder ${reminded ? 'active' : ''}`} onClick={() => toggleReminder(item)} disabled={busy || !user} title={!user ? 'Sign in to set reminders' : reminded ? 'Remove reminder' : 'Set reminder'}>{busy ? <Loader size={16} className="spin" /> : reminded ? <BellOff size={17} /> : <Bell size={17} />}<span>{reminded ? 'Reminder set' : 'Set reminder'}</span></button></article>; })}</section>}
  </div>;
}
