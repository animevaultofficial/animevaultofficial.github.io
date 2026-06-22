import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, UserPlus, UserMinus, ShieldAlert, ShieldCheck, Loader, Users, BadgeCheck } from 'lucide-react';
import { useUser } from '../../api/UserContext';
import { searchUsers, getConnections, followUser, unfollowUser, blockUser, unblockUser } from '../../api/db';
import StoryAvatar from '../../components/StoryAvatar';

export default function CommunityPage({ navigate }) {
    const { user, setShowAuthModal, setAuthTab } = useUser();
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [followingMap, setFollowingMap] = useState({});
    const [blockedMap, setBlockedMap] = useState({});
    const [actionLoading, setActionLoading] = useState(null);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(query), 500);
        return () => clearTimeout(timer);
    }, [query]);

    useEffect(() => {
        async function loadInitialData() {
            if (user) {
                const conns = await getConnections(user.id);
                const fMap = {};
                const bMap = {};
                conns.following.forEach(u => fMap[u.id || u] = true);
                conns.blocked.forEach(u => bMap[u.id || u] = true);
                setFollowingMap(fMap);
                setBlockedMap(bMap);
            }
            performSearch('');
        }
        loadInitialData();
    }, [user]);

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
                    setFollowingMap(prev => ({ ...prev, [targetId]: false }));
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
        <div style={{ padding: '20px 16px 80px', color: '#fff' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ff1a75', margin: '0 0 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <Users size={24} /> Community
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>
                    Find friends and build your AnimeVault network.
                </p>
            </div>

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: 24 }}>
                <div style={{ position: 'absolute', top: '50%', left: 14, transform: 'translateY(-50%)', color: '#ff1a75', zIndex: 1 }}>
                    <SearchIcon size={18} />
                </div>
                <input
                    type="text"
                    placeholder="Search by username..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    style={{
                        width: '100%', padding: '12px 14px 12px 42px', borderRadius: 12,
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,26,117,0.2)',
                        color: '#fff', fontSize: '0.85rem', fontWeight: 600, outline: 'none',
                        boxSizing: 'border-box'
                    }}
                />
                {loading && (
                    <div style={{ position: 'absolute', top: '50%', right: 14, transform: 'translateY(-50%)', color: '#ff1a75' }}>
                        <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    </div>
                )}
            </div>

            {/* Results */}
            {results.length === 0 && !loading ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(255,255,255,0.01)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <Users size={40} style={{ color: 'var(--text-tertiary)', marginBottom: 12, opacity: 0.5 }} />
                    <h3 style={{ margin: '0 0 4px', color: '#fff', fontSize: '1rem' }}>No citizens found</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>Try searching for a different username.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {results.map((profile) => {
                        const isFollowing = followingMap[profile.id];
                        const isBlocked = blockedMap[profile.id];
                        const isLoading = actionLoading === profile.id;

                        return (
                            <div key={profile.id} style={{
                                background: 'rgba(15,15,25,0.8)', border: '1px solid rgba(255,255,255,0.05)',
                                borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column'
                            }}>
                                {/* Mini Banner */}
                                <div style={{ height: 60, width: '100%', background: '#1e1e2e', position: 'relative' }}>
                                    {profile.banner && (
                                        <img src={profile.banner} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
                                    )}
                                    {isBlocked && (
                                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
                                            <span style={{ color: '#ef4444', fontWeight: 900, fontSize: '0.7rem', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <ShieldAlert size={14} /> BLOCKED
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div style={{ padding: '0 14px 14px', position: 'relative' }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-end', marginTop: -30 }}>
                                        <StoryAvatar
                                            user={profile}
                                            viewerId={user?.id}
                                            size={60}
                                            style={{
                                                boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                                                borderRadius: '50%', background: '#1a1a2e',
                                                border: '3px solid #0f0f19', flexShrink: 0
                                            }}
                                        />
                                        <div style={{ marginLeft: 10, flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 18 }}>
                                                <strong style={{ fontSize: '0.9rem' }}>{profile.username}</strong>
                                                {profile.is_verified && <BadgeCheck size={14} fill="#1d9bf0" color="#fff" />}
                                                {profile.is_admin && (
                                                    <span style={{ fontSize: '0.55rem', background: 'linear-gradient(135deg,#ffd700,#ffaa00)', color: '#000', padding: '1px 6px', borderRadius: 8, fontWeight: 900 }}>ADMIN</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                                        {!isBlocked ? (
                                            <>
                                                <button
                                                    onClick={() => handleAction(isFollowing ? 'unfollow' : 'follow', profile.id)}
                                                    disabled={isLoading}
                                                    style={{
                                                        flex: 1, padding: '8px', borderRadius: 10, fontWeight: 800, fontSize: '0.75rem',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                                        cursor: isLoading ? 'wait' : 'pointer', border: 'none',
                                                        background: isFollowing ? 'rgba(255,255,255,0.05)' : '#ff1a75',
                                                        color: isFollowing ? '#fff' : '#000',
                                                        opacity: isLoading ? 0.7 : 1
                                                    }}
                                                >
                                                    {isLoading ? <Loader size={14} /> : isFollowing ? <><UserMinus size={14} /> Unfollow</> : <><UserPlus size={14} /> Follow</>}
                                                </button>
                                                <button
                                                    onClick={() => handleAction('block', profile.id)}
                                                    disabled={isLoading}
                                                    style={{
                                                        padding: '8px 12px', borderRadius: 10, background: 'transparent', border: '1px solid rgba(239,68,68,0.3)',
                                                        color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                    }}
                                                    title="Block User"
                                                >
                                                    <ShieldAlert size={14} />
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => handleAction('unblock', profile.id)}
                                                disabled={isLoading}
                                                style={{
                                                    width: '100%', padding: '8px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                                                    color: '#ef4444', fontWeight: 800, fontSize: '0.75rem', cursor: isLoading ? 'wait' : 'pointer',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                                                }}
                                            >
                                                {isLoading ? <Loader size={14} /> : <><ShieldCheck size={14} /> Unblock</>}
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
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}