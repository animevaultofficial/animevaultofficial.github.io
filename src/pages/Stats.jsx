import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, TrendingUp, Trophy, Calendar, Star, Flame, User } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getUserStats, getLevel, getFavorites, setFavorite, getActivity } from '../api/db';
import { searchAnime, fetchTrendingMedia, searchCharacters, fetchTrendingCharacters, searchStudios, fetchTrendingStudios, fetchAnimeById } from '../api/anilist';
import { useUser } from '../api/UserContext';

export default function Stats() {
  const { user, authLoading, setAuthTab, setShowAuthModal } = useUser();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [favoriteType, setFavoriteType] = useState(null);

  // Fetch real data
  const { data: userStats = {} } = useQuery({
    queryKey: ['userStats'],
    queryFn: getUserStats,
  });

  const { data: levelData = { level: 1, xp: 0, xpToNextLevel: 100 } } = useQuery({
    queryKey: ['level'],
    queryFn: getLevel,
  });

  const { data: favorites = { animes: [], studios: [], characters: [] }, isLoading: favoritesLoading, error: favoritesError } = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: () => getFavorites(user.id),
    enabled: !!user?.id,
  });

  const { data: activityData = {} } = useQuery({
    queryKey: ['activity'],
    queryFn: getActivity,
  });

  // Fetch favorite anime details
  const { data: favoriteAnimeDetails = [] } = useQuery({
    queryKey: ['favoriteAnimeDetails', favorites?.animes?.map(a => a.id)],
    queryFn: async () => {
      if (!favorites?.animes?.length) return [];
      const details = await Promise.all(
        favorites.animes.map(async (anime) => {
          try {
            return await fetchAnimeById(anime.id);
          } catch (e) {
            console.error('Failed to fetch anime details:', e);
            return null;
          }
        })
      );
      return details.filter(Boolean);
    },
    enabled: !!favorites?.animes?.length,
  });

  // Calculate wrapped stats
  const calculateWrappedStats = () => {
    // First, use selected favorites if available
    const selectedFavoriteStudio = favorites?.studios?.[0];
    const selectedFavoriteCharacter = favorites?.characters?.[0];

    if (!favoriteAnimeDetails.length && !selectedFavoriteStudio && !selectedFavoriteCharacter) {
      return {
        favoriteGenre: null,
        favoriteGenrePercent: 0,
        favoriteStudio: null,
        favoriteStudioPercent: 0,
        favoriteCharacter: null
      };
    }

    let favoriteGenre = null;
    let favoriteGenrePercent = 0;
    let favoriteStudio = selectedFavoriteStudio?.name;
    let favoriteStudioPercent = selectedFavoriteStudio ? 100 : 0;
    const favoriteCharacter = selectedFavoriteCharacter;

    // Calculate favorite genre from favorite animes
    if (favoriteAnimeDetails.length) {
      const genreCount = {};
      favoriteAnimeDetails.forEach(anime => {
        (anime.genres || []).forEach(genre => {
          genreCount[genre] = (genreCount[genre] || 0) + 1;
        });
      });

      let maxGenreCount = 0;
      Object.entries(genreCount).forEach(([genre, count]) => {
        if (count > maxGenreCount) {
          maxGenreCount = count;
          favoriteGenre = genre;
        }
      });

      favoriteGenrePercent = Math.round((maxGenreCount / favoriteAnimeDetails.length) * 100);

      // If no selected studio, calculate from favorite animes
      if (!favoriteStudio) {
        const studioCount = {};
        favoriteAnimeDetails.forEach(anime => {
          (anime.studios?.nodes || []).forEach(studio => {
            studioCount[studio.name] = (studioCount[studio.name] || 0) + 1;
          });
        });

        let maxStudioCount = 0;
        Object.entries(studioCount).forEach(([studio, count]) => {
          if (count > maxStudioCount) {
            maxStudioCount = count;
            favoriteStudio = studio;
          }
        });

        favoriteStudioPercent = Math.round((maxStudioCount / favoriteAnimeDetails.length) * 100);
      }
    }

    return {
      favoriteGenre,
      favoriteGenrePercent,
      favoriteStudio,
      favoriteStudioPercent,
      favoriteCharacter
    };
  };

  const wrappedStats = calculateWrappedStats();

  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (!favoriteType) {
      setSearchResults([]);
      setSearchTerm('');
      return;
    }
    const loadDefault = async () => {
      setSearchLoading(true);
      let results = [];
      if (favoriteType === 'anime') {
        results = await fetchTrendingMedia('ANIME');
      } else if (favoriteType === 'character') {
        results = await fetchTrendingCharacters();
      } else if (favoriteType === 'studio') {
        results = await fetchTrendingStudios();
      }
      setSearchResults(results);
      setSearchLoading(false);
    };
    loadDefault();
  }, [favoriteType]);

  useEffect(() => {
    if (!favoriteType || searchTerm.trim() === '') return;
    const search = async () => {
      setSearchLoading(true);
      let results = [];
      if (favoriteType === 'anime') {
        results = await searchAnime(searchTerm);
      } else if (favoriteType === 'character') {
        results = await searchCharacters(searchTerm);
      } else if (favoriteType === 'studio') {
        results = await searchStudios(searchTerm);
      }
      setSearchResults(results);
      setSearchLoading(false);
    };
    const timeout = setTimeout(search, 500);
    return () => clearTimeout(timeout);
  }, [searchTerm, favoriteType]);

  const handleSetFavorite = async (type, item) => {
    let favItem;
    if (type === 'animes') {
      const getTitle = (anime) => anime?.title?.english || anime?.title?.romaji || anime?.title?.native || 'Unknown Title';
      const getImage = (anime) => anime?.coverImage?.extraLarge || anime?.coverImage?.large || anime?.coverImage?.medium;
      favItem = { id: item.id, title: getTitle(item), image: getImage(item) };
    } else if (type === 'characters') {
      const getName = (char) => char?.name?.full || char?.name?.userPreferred || 'Unknown Character';
      const getImage = (char) => char?.image?.large || char?.image?.medium;
      favItem = { id: item.id, name: getName(item), image: getImage(item) };
    } else if (type === 'studios') {
      favItem = { id: item.id, name: item.name };
    }
    
    if (!user?.id) {
      setAuthTab('login');
      setShowAuthModal(true);
      return;
    }

    const queryKey = ['favorites', user.id];
    const previousFavorites = queryClient.getQueryData(queryKey);
    const optimisticFavorites = { ...favorites, [type]: [favItem] };
    queryClient.setQueryData(queryKey, optimisticFavorites);

    const result = await setFavorite(user.id, type, favItem);
    if (!result.success) {
      queryClient.setQueryData(queryKey, previousFavorites || favorites);
      console.error('Failed to save favorite:', result.error);
      return;
    }

    queryClient.setQueryData(queryKey, result.favorites || optimisticFavorites);
    queryClient.invalidateQueries({ queryKey });
    setFavoriteType(null);
    setSearchTerm('');
  };

  // Calculate derived values from real data
  const xpPercent = levelData?.xpToNextLevel ? Math.min(100, (levelData.xp / levelData.xpToNextLevel) * 100) : 0;
  const globalRank = 1234; // This would come from a real API if we had one

  // Format watch time
  const formatWatchTime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${Math.floor((seconds % 3600) / 60)}m`;
    return `${Math.floor(seconds / 60)}m`;
  };

  // Generate activity heatmap for the last 365 days
  const getActivityHeatmap = () => {
    const days = [];
    const today = new Date();
    for (let i = 364; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      days.push(activityData[dateKey] || 0);
    }
    return days;
  };
  
  const activityHeatmap = getActivityHeatmap();

  // Mock achievements (we can enhance this later)
  const mockAchievements = [
    { id: 1, title: 'Binge Watcher', rarity: 'Ultra Rare', icon: '🏆' },
    { id: 2, title: 'Genre Master', rarity: 'Legendary', icon: '🏆' },
    { id: 3, title: 'Top Mash', rarity: 'Rare', icon: '🏆' },
    { id: 4, title: 'Completionist', rarity: 'Rare', icon: '🏆' },
    { id: 5, title: 'Completionist', rarity: 'Rare', icon: '🏆' }
  ];

  return (
    <div className="stats-page" style={{ padding: '1rem' }}>
      <div className="stats-container" style={{ maxWidth: '100%', width: '100%' }}>
        {/* Top Section - Level & Activity */}
        <div className="top-section" style={{ display: 'grid', gap: '1.5rem', marginBottom: '2rem' }}>
          {/* Level Card */}
          <div className="level-card" style={{ 
            background: 'linear-gradient(135deg, rgba(255,26,117,0.15) 0%, rgba(15,23,42,0.8) 100%)', 
            border: '1px solid rgba(255,26,117,0.4)', 
            borderRadius: '16px', 
            padding: '1.5rem',
            boxShadow: '0 0 30px rgba(255,26,117,0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ 
                width: '80px', height: '80px', borderRadius: '50%', 
                background: user?.avatar ? 'transparent' : 'linear-gradient(135deg, #ff1a75 0%, #ffaa00 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '3px solid rgba(255,255,255,0.2)',
                overflow: 'hidden'
              }}>
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={40} color="white" />
                )}
              </div>
              <div>
                <h2 style={{ fontSize: '1.5rem', margin: '0 0 0.5rem 0', color: 'white' }}>{user?.username || 'Anime Fan'} - Level {levelData?.level || 1}</h2>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ 
                    background: 'linear-gradient(90deg, #ffaa00, #ff1a75)', 
                    color: 'black', padding: '0.25rem 0.75rem', borderRadius: '12px', 
                    fontSize: '0.8rem', fontWeight: '700' 
                  }}>Top 5% Viewer</span>
                  <span style={{ 
                    color: '#94a3b8', padding: '0.25rem 0.75rem', 
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
                    fontSize: '0.8rem'
                  }}>Global Rank: #{globalRank}</span>
                </div>
              </div>
            </div>
            {/* XP Progress */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#94a3b8' }}>
                <span>{levelData?.xp || 0} / {levelData?.xpToNextLevel || 100} XP</span>
                <span>Level {levelData?.level ? levelData.level + 1 : 2}</span>
              </div>
              <div style={{ 
                height: '12px', background: 'rgba(255,255,255,0.1)', 
                borderRadius: '6px', overflow: 'hidden', 
                boxShadow: '0 0 20px rgba(255,26,117,0.3)'
              }}>
                <div style={{ 
                  height: '100%', width: `${xpPercent}%`, 
                  background: 'linear-gradient(90deg, #ff1a75, #ffaa00)',
                  borderRadius: '6px', transition: 'width 0.5s ease'
                }} />
              </div>
            </div>
          </div>

          {/* Activity Heatmap */}
          <div className="activity-card" style={{ 
            background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', 
            borderRadius: '16px', padding: '1.5rem'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: 'white', fontSize: '1.1rem' }}>Activity Heatmap</h3>
            <p style={{ color: '#94a3b8', margin: '0 0 1rem 0', fontSize: '0.85rem' }}>Consistent Daily Viewer</p>
            <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch', paddingBottom: '0.5rem' }}>
              <div style={{ 
                display: 'grid', gridTemplateColumns: 'repeat(52, 1fr)', gap: '2px', minWidth: '520px'
              }}>
                {activityHeatmap.map((count, i) => {
                  let background = 'rgba(255,255,255,0.05)';
                  if (count > 0) {
                    if (count >= 3) background = 'rgba(255,26,117,0.8)';
                    else if (count >= 2) background = 'rgba(255,26,117,0.5)';
                    else background = 'rgba(255,26,117,0.2)';
                  }
                  return (
                    <div key={i} style={{ 
                      width: '8px', height: '8px', borderRadius: '2px',
                      background: background
                    }} />
                  );
                })}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem', alignItems: 'center' }}>
              <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Year</span>
              <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'rgba(255,26,117,0.2)' }} />
              <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'rgba(255,26,117,0.5)' }} />
              <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'rgba(255,26,117,0.8)' }} />
              <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Was</span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <StatCard 
            icon={<Clock />} 
            label="Total Watch Time" 
            value={userStats?.totalWatchTime ? formatWatchTime(userStats.totalWatchTime) : '0h'} 
            color="#3b82f6" 
            extra="Watching in progress"
          />
          <StatCard 
            icon={<CheckCircle />} 
            label="Anime Completed" 
            value={userStats?.animeCompleted || 0} 
            color="#10b981" 
            extra="Keep it up!"
          />
          <StatCard 
            icon={<TrendingUp />} 
            label="Episodes Watched" 
            value={userStats?.episodesWatched || 0} 
            color="#f59e0b" 
            extra="Binge mode activated"
          />
        </div>

        {/* Anime Wrapped */}
        <div className="anime-wrapped" style={{ marginBottom: '2rem' }}>
          <h3 style={{ color: 'white', margin: '0 0 1rem 0', fontSize: '1.1rem' }}>Anime Wrapped</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            {/* Favorite Anime */}
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(255,26,117,0.12) 0%, rgba(15,23,42,0.9) 100%)', 
              border: '1px solid rgba(255,26,117,0.3)', borderRadius: '16px', padding: '1.25rem',
              position: 'relative', overflow: 'hidden'
            }}>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <p style={{ color: '#94a3b8', margin: '0 0 0.75rem 0', fontSize: '0.9rem' }}>Favorite Anime</p>
                {favorites?.animes?.[0] ? (
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <img 
                      src={favorites.animes[0].image} 
                      alt={favorites.animes[0].title} 
                      style={{ width: '80px', height: '120px', objectFit: 'cover', borderRadius: '8px' }} 
                    />
                    <div>
                      <h4 style={{ color: 'white', margin: '0 0 0.5rem 0', fontSize: '1.25rem' }}>
                        {favorites.animes[0].title}
                      </h4>
                    </div>
                  </div>
                ) : (
                  <h4 style={{ color: 'white', margin: 0, fontSize: '1.25rem' }}>TBD</h4>
                )}
              </div>
            </div>

            {/* Favorite Studio */}
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(15,23,42,0.9) 100%)', 
              border: '1px solid rgba(16,185,129,0.3)', borderRadius: '16px', padding: '1.25rem',
              position: 'relative', overflow: 'hidden'
            }}>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <p style={{ color: '#94a3b8', margin: '0 0 0.25rem 0', fontSize: '0.9rem' }}>Favorite Studio</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ color: 'white', margin: '0 0 0.75rem 0', fontSize: '1.25rem' }}>
                      {wrappedStats.favoriteStudio || (favorites?.studios?.[0]?.name) || 'TBD'} - {wrappedStats.favoriteStudioPercent}%
                    </h4>
                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${wrappedStats.favoriteStudioPercent}%`, background: '#10b981', borderRadius: '4px' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Favorite Character */}
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(15,23,42,0.9) 100%)', 
              border: '1px solid rgba(245,158,11,0.3)', borderRadius: '16px', padding: '1.25rem',
              position: 'relative', overflow: 'hidden'
            }}>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <p style={{ color: '#94a3b8', margin: '0 0 0.25rem 0', fontSize: '0.9rem' }}>Favorite Character</p>
                <h4 style={{ color: 'white', margin: '0 0 0.5rem 0', fontSize: '1.25rem' }}>
                  {wrappedStats.favoriteCharacter?.name || 'TBD'}
                </h4>
                {wrappedStats.favoriteCharacter?.image && (
                  <img 
                    src={wrappedStats.favoriteCharacter.image} 
                    alt={wrappedStats.favoriteCharacter.name} 
                    style={{ width: '80px', height: '120px', objectFit: 'cover', borderRadius: '8px', marginTop: '0.75rem' }} 
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section - Watch History & Achievements */}
        <div className="bottom-section" style={{ display: 'grid', gap: '1.5rem' }}>
          {/* Watch History */}
          <div style={{ 
            background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', 
            borderRadius: '16px', padding: '1.5rem',
            boxShadow: '0 0 20px rgba(255,26,117,0.1)'
          }}>
            <h3 style={{ color: 'white', margin: '0 0 1rem 0', fontSize: '1.1rem' }}>Watch History Timeline</h3>
            {watchHistory.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {watchHistory.slice(0, 5).map((item, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ 
                      display: 'flex', flexDirection: 'column', alignItems: 'center', 
                      width: '80px', color: '#64748b', fontSize: '0.75rem', flexShrink: 0
                    }}>
                      <span>{new Date(item.watchedAt).toLocaleTimeString()}</span>
                      <div style={{ width: '2px', height: '40px', background: 'rgba(255,26,117,0.3)' }} />
                    </div>
                    <div style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', minWidth: 0 }}>
                      <p style={{ color: 'white', margin: '0 0 0.25rem 0', fontSize: '0.9rem', overflowWrap: 'anywhere' }}>{item.title}</p>
                      <p style={{ color: '#64748b', margin: '0', fontSize: '0.8rem' }}>
                        Watched {new Date(item.watchedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#94a3b8' }}>No watch history yet. Start watching anime!</p>
            )}
          </div>

          {/* Achievement Showcase */}
          <div style={{ 
            background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', 
            borderRadius: '16px', padding: '1.5rem',
            boxShadow: '0 0 20px rgba(255,26,117,0.1)'
          }}>
            <h3 style={{ color: 'white', margin: '0 0 1rem 0', fontSize: '1.1rem' }}>Achievement Showcase</h3>
            <div className="achievements-grid" style={{ display: 'grid', gap: '0.75rem' }}>
              {mockAchievements.map((achievement, index) => (
                <div key={achievement.id} className="achievement-card" style={{ 
                  display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem',
                  background: `linear-gradient(135deg, ${
                    achievement.rarity === 'Ultra Rare' ? 'rgba(255,26,117,0.2)' :
                    achievement.rarity === 'Legendary' ? 'rgba(255,170,0,0.2)' : 'rgba(139,92,246,0.2)'
                  }, rgba(15,23,42,0.5) 100%)`,
                  border: `1px solid ${
                    achievement.rarity === 'Ultra Rare' ? 'rgba(255,26,117,0.5)' :
                    achievement.rarity === 'Legendary' ? 'rgba(255,170,0,0.5)' : 'rgba(139,92,246,0.5)'
                  }`,
                  borderRadius: '12px', cursor: 'pointer', transition: 'transform 0.2s'
                }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                   onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{achievement.icon}</div>
                  <p style={{ color: 'white', fontSize: '0.75rem', margin: '0 0 0.25rem 0', textAlign: 'center', overflowWrap: 'anywhere' }}>{achievement.title}</p>
                  <p style={{ color: '#94a3b8', fontSize: '0.65rem', margin: 0 }}>{achievement.rarity}</p>
                </div>
              ))}
              {/* Empty slots */}
              {[1,2,3,4,5].map((i) => (
                <div key={`empty-${i}`} className="achievement-card empty-slot" style={{ 
                  display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '12px', opacity: '0.5'
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem', filter: 'grayscale(100%)' }}>🏆</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Favorite Selectors */}
        <section style={{ marginTop: '2rem', marginBottom: '2rem' }}>
          <h3 style={{ color: 'white', margin: '0 0 1.5rem', fontSize: '1.25rem' }}>Choose Your Favorites</h3>
          {authLoading && (
            <p style={{ color: '#94a3b8', margin: '0 0 1rem' }}>Checking your saved favorites...</p>
          )}
          {!authLoading && !user && (
            <p style={{ color: '#f59e0b', margin: '0 0 1rem' }}>Sign in to save favorites across devices.</p>
          )}
          {favoritesLoading && user && (
            <p style={{ color: '#94a3b8', margin: '0 0 1rem' }}>Loading favorites from your account...</p>
          )}
          {favoritesError && (
            <p style={{ color: '#f87171', margin: '0 0 1rem' }}>Could not load favorites. You can try selecting again.</p>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
            {/* Favorite Anime */}
            <div style={{ background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,26,117,0.3)', borderRadius: '16px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ color: 'white', margin: '0', fontSize: '1rem' }}>Favorite Anime</h4>
                <button 
                  onClick={() => setFavoriteType('anime')} 
                  style={{ padding: '0.5rem 1rem', border: '1px solid rgba(255,26,117,0.5)', borderRadius: '8px', background: 'rgba(255,26,117,0.1)', color: '#ff1a75', cursor: 'pointer', fontSize: '0.8rem' }}>
                  Select
                </button>
              </div>
              {favorites?.animes?.[0] ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <img 
                    src={favorites.animes[0].image} 
                    alt={favorites.animes[0].title} 
                    style={{ width: '80px', height: '120px', objectFit: 'cover', borderRadius: '8px' }} 
                  />
                  <div>
                    <p style={{ color: 'white', margin: '0 0 0.5rem', fontWeight: 'bold' }}>{favorites.animes[0].title}</p>
                  </div>
                </div>
              ) : (
                <p style={{ color: '#94a3b8', margin: '0' }}>No favorite anime selected yet</p>
              )}
            </div>

            {/* Favorite Studio */}
            <div style={{ background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '16px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ color: 'white', margin: '0', fontSize: '1rem' }}>Favorite Studio</h4>
                <button 
                  onClick={() => setFavoriteType('studio')} 
                  style={{ padding: '0.5rem 1rem', border: '1px solid rgba(16,185,129,0.5)', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', color: '#10b981', cursor: 'pointer', fontSize: '0.8rem' }}>
                  Select
                </button>
              </div>
              {favorites?.studios?.[0] ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '80px', height: '80px', background: 'rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}>
                    <p style={{ color: '#10b981', fontWeight: 'bold' }}>{favorites.studios[0].name}</p>
                  </div>
                  <div>
                    <p style={{ color: 'white', margin: '0', fontWeight: 'bold' }}>{favorites.studios[0].name}</p>
                  </div>
                </div>
              ) : (
                <p style={{ color: '#94a3b8', margin: '0' }}>No favorite studio selected yet</p>
              )}
            </div>

            {/* Favorite Character */}
            <div style={{ background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '16px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ color: 'white', margin: '0', fontSize: '1rem' }}>Favorite Character</h4>
                <button 
                  onClick={() => setFavoriteType('character')} 
                  style={{ padding: '0.5rem 1rem', border: '1px solid rgba(245,158,11,0.5)', borderRadius: '8px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', cursor: 'pointer', fontSize: '0.8rem' }}>
                  Select
                </button>
              </div>
              {favorites?.characters?.[0] ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <img 
                    src={favorites.characters[0].image} 
                    alt={favorites.characters[0].name} 
                    style={{ width: '80px', height: '120px', objectFit: 'cover', borderRadius: '8px' }} 
                  />
                  <div>
                    <p style={{ color: 'white', margin: '0 0 0.5rem', fontWeight: 'bold' }}>{favorites.characters[0].name}</p>
                  </div>
                </div>
              ) : (
                <p style={{ color: '#94a3b8', margin: '0' }}>No favorite character selected yet</p>
              )}
            </div>
          </div>

          {/* Favorite Selection Modal */}
          {favoriteType && (
            <div style={{ position: 'fixed', top: '0', left: '0', width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: '9999', padding: '1rem' }}>
              <div style={{ background: 'rgba(15,23,42,1)', border: '1px solid rgba(255,26,117,0.4)', borderRadius: '16px', padding: '2rem', width: '700px', maxWidth: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ color: 'white', margin: '0', fontSize: '1.25rem' }}>Select Favorite {favoriteType.charAt(0).toUpperCase() + favoriteType.slice(1)}</h3>
                  <button 
                    onClick={() => { setFavoriteType(null); setSearchTerm(''); }} 
                    style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', color: 'white', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                </div>
                
                <input 
                  type="text" 
                  placeholder={`Search for a ${favoriteType}...`} 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '1rem', marginBottom: '1.5rem' }} 
                />

                {searchLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                    <p style={{ color: '#94a3b8' }}>Loading...</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: favoriteType === 'anime' || favoriteType === 'character' ? 'repeat(auto-fill, minmax(120px, 1fr))' : 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
                    {searchResults.map((item) => {
                      let content;
                      let onClick = () => handleSetFavorite(favoriteType + 's', item);
                      
                      if (favoriteType === 'anime') {
                        const getTitle = (anime) => anime?.title?.english || anime?.title?.romaji || anime?.title?.native || 'Unknown';
                        const getImage = (anime) => anime?.coverImage?.large || anime?.coverImage?.medium;
                        content = (
                          <div onClick={onClick} style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                            <img src={getImage(item)} alt={getTitle(item)} style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '8px' }} />
                            <p style={{ color: 'white', margin: '0.5rem 0 0', fontSize: '0.85rem', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getTitle(item)}</p>
                          </div>
                        );
                      } else if (favoriteType === 'character') {
                        const getName = (char) => char?.name?.full || char?.name?.userPreferred || 'Unknown';
                        const getImage = (char) => char?.image?.large || char?.image?.medium;
                        content = (
                          <div onClick={onClick} style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                            <img src={getImage(item)} alt={getName(item)} style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '8px' }} />
                            <p style={{ color: 'white', margin: '0.5rem 0 0', fontSize: '0.85rem', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getName(item)}</p>
                          </div>
                        );
                      } else if (favoriteType === 'studio') {
                        content = (
                          <div onClick={onClick} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                            <p style={{ color: 'white', margin: '0', textAlign: 'center' }}>{item.name}</p>
                          </div>
                        );
                      }
                      return content;
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      <style jsx>{`
        .top-section, .bottom-section {
          grid-template-columns: 1fr 1fr;
        }
        .achievements-grid {
          grid-template-columns: repeat(5, 1fr);
        }
        @media (max-width: 768px) {
          .top-section, .bottom-section {
            grid-template-columns: 1fr !important;
          }
          .achievements-grid {
            grid-template-columns: repeat(auto-fit, minmax(90px, 1fr)) !important;
          }
          .achievement-card {
            padding: 0.5rem !important;
          }
          .achievement-card div {
            font-size: 2rem !important;
          }
        }
        @media (max-width: 600px) {
          .achievements-grid {
            grid-template-columns: repeat(auto-fit, minmax(80px, 1fr)) !important;
          }
          .achievement-card {
            padding: 0.4rem !important;
          }
          .achievement-card p {
            font-size: 0.65rem !important;
          }
        }
      `}</style>
    </div>
  );
}

function StatCard({ icon, label, value, color, extra }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(255,26,117,0.1) 0%, rgba(15,23,42,0.7) 100%)',
      border: `1px solid ${color}40`,
      borderRadius: '16px',
      padding: '1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      boxShadow: `0 0 20px ${color}20`
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
        <div style={{
          background: `${color}20`,
          color: color,
          padding: '0.75rem',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '0.25rem', fontWeight: 'bold' }}>{label}</div>
          <div style={{ fontSize: '1.5rem', color: 'white', fontWeight: '900' }}>{value}</div>
        </div>
      </div>
      <div style={{ fontSize: '0.8rem', color: color }}>{extra}</div>
    </div>
  );
}
