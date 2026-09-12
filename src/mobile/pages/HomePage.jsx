import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Clock, Flame, Sparkles } from 'lucide-react';
import { useUser } from '../../api/UserContext';
import { fetchAnimeBySeason, fetchHomeData } from '../api/anilist';
import { getContinueWatching } from '../api/storage';
import MobileHero from '../components/MobileHero';
import AnimeCard from '../components/AnimeCard';
import SectionRail from '../components/SectionRail';
import LoadingCard from '../components/LoadingCard';
import EmptyState from '../components/EmptyState';

const SEASONS = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];
const CURRENT_YEAR = new Date().getFullYear();

export default function HomePage({ navigate }) {
  const { continueWatching: syncedContinue } = useUser();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seasonal, setSeasonal] = useState([]);
  const [seasonLoading, setSeasonLoading] = useState(false);
  const [season, setSeason] = useState('SPRING');
  const [year, setYear] = useState(CURRENT_YEAR);

  useEffect(() => {
    let cancelled = false;
    fetchHomeData().then(result => { if (!cancelled) setData(result); }).catch(() => {}).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setSeasonLoading(true);
    fetchAnimeBySeason(season, year).then(result => { if (!cancelled) setSeasonal(Array.isArray(result) ? result : []); }).catch(() => {}).finally(() => { if (!cancelled) setSeasonLoading(false); });
    return () => { cancelled = true; };
  }, [season, year]);

  const continueWatching = useMemo(() => {
    if (syncedContinue?.length) return syncedContinue.map(item => ({ id: item.media_id || item.id, title: item.media_title || item.title, image: item.media_poster || item.image })).filter(item => item.id);
    return getContinueWatching() || [];
  }, [syncedContinue]);

  const trending = data?.trending?.media?.slice(0, 15) || [];
  const popular = data?.popular?.media?.slice(0, 15) || [];
  const upcoming = data?.upcoming?.media?.slice(0, 9) || [];
  const openAnime = id => navigate('anime-detail', { id });
  const openSearch = () => navigate('/search');

  if (loading) {
    return <div className="av-mobile-page">
      <LoadingCard variant="hero" />
      <SectionRail title="Trending Now" icon={Flame} loading />
      <SectionRail title="Most Popular" icon={Sparkles} loading />
    </div>;
  }

  if (!data) return <EmptyState icon="📡" title="Unable to load AnimeVault" message="Check your connection and try again." action={() => window.location.reload()} actionText="Retry" />;

  return <div className="av-mobile-page">
    <MobileHero slides={trending.slice(0, 5)} onWatchClick={openAnime} onDetailsClick={openAnime} />

    {continueWatching.length > 0 && (
      <SectionRail title="Continue Watching" icon={Clock}>
        {continueWatching.map(item => (
          <AnimeCard key={item.id} anime={{ id: item.id, title: { romaji: item.title }, coverImage: item.image }} onClick={() => openAnime(item.id)} showRating={false} showEpisodes={false} />
        ))}
      </SectionRail>
    )}

    <SectionRail title="Trending Now" icon={Flame} onViewAll={openSearch}>
      {trending.map(anime => <AnimeCard key={anime.id} anime={anime} onClick={openAnime} />)}
    </SectionRail>

    <SectionRail title="Most Popular" icon={Sparkles} onViewAll={openSearch}>
      {popular.map(anime => <AnimeCard key={anime.id} anime={anime} onClick={openAnime} />)}
    </SectionRail>

    <section className="av-mobile-section">
      <header className="av-mobile-section-header">
        <h2><Calendar size={15} /> Seasonal</h2>
      </header>
      <div className="av-mobile-card-rail av-season-selector">
        {SEASONS.map(item => <button key={item} type="button" className={`av-filter-chip ${season === item ? 'is-selected' : ''}`} onClick={() => setSeason(item)}>{item.charAt(0) + item.slice(1).toLowerCase()}</button>)}
        <select aria-label="Season year" value={year} onChange={event => setYear(Number(event.target.value))}>
          {[CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2, CURRENT_YEAR - 3].map(item => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>
      {seasonLoading ? <div className="av-mobile-card-rail">{[1, 2, 3, 4, 5].map(item => <LoadingCard key={item} variant="anime" />)}</div> : (
        <div className="av-mobile-card-rail">
          {seasonal.map(anime => <AnimeCard key={anime.id} anime={anime} onClick={openAnime} />)}
        </div>
      )}
    </section>

    <SectionRail title="Upcoming" grid>
      {upcoming.map(anime => <AnimeCard key={anime.id} anime={anime} onClick={openAnime} />)}
    </SectionRail>
  </div>;
}
