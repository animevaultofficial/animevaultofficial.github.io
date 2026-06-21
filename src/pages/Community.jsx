import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, UserPlus, UserMinus, ShieldAlert, ShieldCheck, Loader, Users, BadgeCheck } from 'lucide-react';
import { useUser } from '../api/UserContext';
import { searchUsers, getConnections, followUser, unfollowUser, blockUser, unblockUser } from '../api/db';
import { Link } from 'react-router-dom';
import StoryAvatar from '../components/StoryAvatar';

const DEFAULT_AVATAR = '/logo.png';
const RANDOM_BANNER_COLOR = '#1e1e2e';

export default function Community() {
  const { user, setShowAuthModal, setAuthTab } = useUser();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Connections state
  const [followingMap, setFollowingMap] = useState({});
  const [blockedMap, setBlockedMap] = useState({});
  const [actionLoading, setActionLoading] = useState(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 500);
    return () => clearTimeout(timer);
  }, [query]);

  // Load initial connections and default users
  useEffect(() => {
    async function loadInitialData() {
      if (user) {
        const conns = await getConnections(user.id);
        const fMap = {};
        const bMap = {};
        conns.following.forEach(id => fMap[id] = true);
        conns.blocked.forEach(id => bMap[id] = true);
        setFollowingMap(fMap);
        setBlockedMap(bMap);
      }
      // Load some initial users (empty query returns recent/random users based on DB limit)
      performSearch('');
    }
    loadInitialData();
  }, [user]);

  // Perform search when debounced query changes
  useEffect(() => {
    performSearch(debouncedQuery);
  }, [debouncedQuery, user]);

  const performSearch = async (searchTerm) => {
    setLoading(true);
    const users = await searchUsers(searchTerm, user ? user.id : null);
    setResults(users);
    setLoading(false);
  };

  const handleAction = async (action, targetId) => {
    if (!user) {
      setAuthTab('login');
      setShowAuthModal(true);
      return;
    }

    setActionLoading(targetId);
    try {
      if (action === 'follow') {
        const success = await followUser(user.id, targetId);
        if (success) setFollowingMap(prev => ({ ...prev, [targetId]: true }));
      } else if (action === 'unfollow') {
        const success = await unfollowUser(user.id, targetId);
        if (success) setFollowingMap(prev => ({ ...prev, [targetId]: false }));
      } else if (action === 'block') {
        const success = await blockUser(user.id, targetId);
        if (success) {
          setBlockedMap(prev => ({ ...prev, [targetId]: true }));
          setFollowingMap(prev => ({ ...prev, [targetId]: false })); // Blocking removes follow
          // Remove from results to hide them instantly
          setResults(prev => prev.filter(u => u.id !== targetId));
        }
      } else if (action === 'unblock') {
        const success = await unblockUser(user.id, targetId);
        if (success) setBlockedMap(prev => ({ ...prev, [targetId]: false }));
      }
    } catch (e) {
      console.error(`Failed to ${action} user:`, e);
    }
    setActionLoading(null);
  };

  return (
    <div className="community-container" style={{
      maxWidth: '1200px', margin: '40px auto 80px', padding: '0 20px',
      color: '#fff', animation: 'fadeIn 0.4s ease-out'
    }}>
      
      {/* Header Section */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--brand-color)', margin: '0 0 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <Users size={36} /> Community
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '600px', margin: '0 auto' }}>
          Find friends, discover other otaku, and build your AnimeVault network.
        </p>
      </div>

      {/* Search Bar */}
      <div style={{
        maxWidth: '600px', margin: '0 auto 40px', position: 'relative'
      }}>
        <div style={{
          position: 'absolute', top: '50%', left: '20px', transform: 'translateY(-50%)', color: 'var(--brand-color)'
        }}>
          <SearchIcon size={20} />
        </div>
        <input 
          type="text" 
          placeholder="Search by username..." 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: '100%', padding: '16px 20px 16px 55px', borderRadius: '20px',
            background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 26, 117, 0.2)',
            color: '#fff', fontSize: '1rem', fontWeight: '600', outline: 'none',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)',
            transition: 'all 0.3s ease'
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--brand-color)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(255, 26, 117, 0.2)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255, 26, 117, 0.2)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)'; }}
        />
        {loading && (
          <div style={{ position: 'absolute', top: '50%', right: '20px', transform: 'translateY(-50%)', color: 'var(--brand-color)' }}>
            <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        )}
      </div>

      {/* Results Grid */}
      {results.length === 0 && !loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255,255,255,0.01)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <Users size={48} style={{ color: 'var(--text-tertiary)', marginBottom: '16px', opacity: 0.5 }} />
          <h3 style={{ margin: '0 0 8px', color: '#fff', fontSize: '1.2rem' }}>No citizens found</h3>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Try searching for a different username.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px'
        }}>
          {results.map((profile) => {
            const isFollowing = followingMap[profile.id];
            const isBlocked = blockedMap[profile.id];
            const isLoading = actionLoading === profile.id;

            return (
              <div key={profile.id} style={{
                background: 'rgba(15, 15, 25, 0.8)', border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '16px', overflow: 'hidden', position: 'relative',
                transition: 'all 0.3s ease', boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                display: 'flex', flexDirection: 'column'
              }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.borderColor = 'rgba(255, 26, 117, 0.3)'; }}
                 onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)'; }}>
                
                {/* Banner */}
                <div style={{ height: '100px', width: '100%', background: RANDOM_BANNER_COLOR, position: 'relative' }}>
                  {profile.banner && (
                    <img src={profile.banner} alt="Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
                  )}
                  {/* Block Overlay if blocked */}
                  {isBlocked && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
                      <span style={{ color: '#ef4444', fontWeight: '900', letterSpacing: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ShieldAlert size={20} /> BLOCKED
                      </span>
                    </div>
                  )}
                </div>

                {/* Avatar & Info */}
                <div style={{ padding: '0 20px 20px', position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <StoryAvatar 
                    user={profile} 
                    viewerId={user?.id} 
                    size={70} 
                    style={{ 
                      marginTop: '-35px', position: 'relative', zIndex: 10,
                      boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                      borderRadius: '50%', background: '#1a1a2e',
                      border: '4px solid #0f0f19'
                    }} 
                  />
                  
                  <h3 style={{ margin: '12px 0 4px', fontSize: '1.1rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <Link to={`/profile/${profile.id}`} style={{ color: '#fff', textDecoration: 'none' }}>
                      {profile.username}
                    </Link>
                    {profile.is_verified && (
                      <BadgeCheck size={18} fill="#1d9bf0" color="#fff" style={{ filter: 'drop-shadow(0 2px 4px rgba(29, 155, 240, 0.5))' }} title="Verified Vault Citizen" />
                    )}
                    {profile.is_admin && (
                      <span style={{ fontSize: '0.65rem', background: 'linear-gradient(135deg, #ffd700, #ffaa00)', color: '#000', padding: '2px 6px', borderRadius: '10px', fontWeight: '900', letterSpacing: '0.5px' }}>ADMIN</span>
                    )}
                  </h3>
                  
                  {/* Action Buttons */}
                  <div style={{ marginTop: 'auto', paddingTop: '20px', display: 'flex', gap: '10px' }}>
                    {!isBlocked ? (
                      <>
                        <button 
                          onClick={() => handleAction(isFollowing ? 'unfollow' : 'follow', profile.id)}
                          disabled={isLoading}
                          style={{
                            flex: 1, padding: '10px', borderRadius: '10px', fontWeight: '800', fontSize: '0.85rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: isLoading ? 'wait' : 'pointer',
                            background: isFollowing ? 'rgba(255, 255, 255, 0.05)' : 'var(--brand-color)',
                            color: isFollowing ? '#fff' : '#000',
                            border: `1px solid ${isFollowing ? 'rgba(255,255,255,0.1)' : 'var(--brand-color)'}`,
                            transition: 'all 0.2s', opacity: isLoading ? 0.7 : 1
                          }}
                        >
                          {isLoading ? <Loader size={16} className="spin" /> : isFollowing ? <><UserMinus size={16} /> Unfollow</> : <><UserPlus size={16} /> Follow</>}
                        </button>
                        <button
                          onClick={() => handleAction('block', profile.id)}
                          disabled={isLoading}
                          style={{
                            padding: '10px', borderRadius: '10px', background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#ef4444', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          title="Block User"
                        >
                          <ShieldAlert size={16} />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleAction('unblock', profile.id)}
                        disabled={isLoading}
                        style={{
                          width: '100%', padding: '10px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#ef4444', fontWeight: '800', fontSize: '0.85rem', cursor: isLoading ? 'wait' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                      >
                        {isLoading ? <Loader size={16} className="spin" /> : <><ShieldCheck size={16} /> Unblock</>}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: none; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
