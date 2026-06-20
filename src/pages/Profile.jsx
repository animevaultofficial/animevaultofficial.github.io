import { useState, useEffect } from 'react';
import { Heart, Clock, User, LogOut, Trash2, Calendar, Film, Camera, Edit2, Image, Sparkles, Tv, Check, Save, ExternalLink, Award, Settings as SettingsIcon } from 'lucide-react';
import { useUser } from '../api/UserContext';
import { Link, useNavigate } from 'react-router-dom';
import { fetchTrendingMedia } from '../api/anilist';
import { getRecommended } from '../api/movies';

// Anime-themed presets for profile customization
const PRESET_BANNERS = [
  { name: 'Anime Landscape', url: 'https://images.unsplash.com/photo-1614728263952-c834c7302501?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Cherry Blossom', url: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Night City', url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Sunset View', url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=80' }
];

const PRESET_AVATARS = [
  { name: 'Cute Anime', url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=150&h=150&q=80' },
  { name: 'Manga Style', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=150&h=150&q=80' },
  { name: 'Cosplay', url: 'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?auto=format&fit=crop&w=150&h=150&q=80' },
  { name: 'Art Style', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=150&h=150&q=80' }
];

const DEFAULT_BANNER = '';
// Path to the AnimeVault logo placed in the project's public root (e.g., C:/Anime-Vault/public/logo.png)
const DEFAULT_AVATAR = '/logo.png';
// Generate a random hex color for banner fallback
function getRandomBannerColor() {
  return `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`;
}
const RANDOM_BANNER_COLOR = getRandomBannerColor();

export default function Profile() {
  const { user, history, likes, continueWatching, logout, clearHistory, updateProfile } = useUser();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('continue'); // 'continue' | 'likes' | 'history' | 'recommendations'
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  
  // Customization overlays
  const [isEditing, setIsEditing] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  // Load custom credentials on mount or user change
  useEffect(() => {
    if (user) {
      setAvatarUrl(user.avatar || DEFAULT_AVATAR);
      setBannerUrl(user.banner || DEFAULT_BANNER);
    } else {
      // Redirect to home if user is not authenticated
      navigate('/');
    }
  }, [user, navigate]);

  // Load dynamic recommendations from Anilist
  useEffect(() => {
    async function loadRecs() {
      setLoadingRecs(true);
      try {
        const [animeRecs, movieRecs] = await Promise.all([
          fetchTrendingMedia('ANIME', 1, 20), // increase to 20 anime trends
          getRecommended(200), // 200 recommendations for longer list
        ]);
        // Merge and de-duplicate by unique id (media_id or id)
        const combined = [...animeRecs, ...movieRecs];
        const uniqueMap = new Map();
        combined.forEach(item => {
          const uid = item.media_id || item.id || item.imdb_id;
          if (!uniqueMap.has(uid)) uniqueMap.set(uid, item);
        });
        // Sort by rating if available, otherwise keep order
        const sorted = Array.from(uniqueMap.values()).sort((a, b) => {
          const ra = a.rating ?? 0;
          const rb = b.rating ?? 0;
          return rb - ra;
        });
        setRecommendations(sorted);
      } catch (err) {
        console.error('Failed to load recommendations:', err);
        setRecommendations([]);
      } finally {
        setLoadingRecs(false);
      }
    }
    loadRecs();
  }, []);

  const handleSaveProfile = async () => {
    setSaveStatus('Saving...');
    const success = await updateProfile(avatarUrl, bannerUrl);
    if (success) {
      setSaveStatus('Profile updated successfully!');
      setTimeout(() => {
        setSaveStatus('');
        setIsEditing(false);
      }, 1500);
    } else {
      setSaveStatus('Failed to update profile. Try again.');
    }
  };

  const getPosterUrl = (item, type = 'card') => {
    if (item.media_poster && item.media_poster.trim() !== '') return item.media_poster;
    if (item.coverImage && item.coverImage.large) return item.coverImage.large;
    if (item.media_type === 'movie' || item.media_type === 'series' || item.media_type === 'tv') {
      return `https://live.metahub.space/poster/medium/${item.media_id}/img`;
    }
    if (type === 'list') return 'https://placehold.co/45x64/1a1a2e/ff1a75.png?text=No+Img';
    if (type === 'poster') return 'https://placehold.co/140x210/1a1a2e/ff1a75.png?text=No+Image';
    return 'https://placehold.co/300x169/1a1a2e/ff1a75.png?text=No+Image';
  };

  if (!user) return null;

  return (
    <div className="profile-container" style={{
      maxWidth: '1200px', margin: '40px auto 80px', padding: '0 20px',
      color: '#fff', animation: 'profileFadeIn 0.4s ease-out'
    }}>
      
      {/* ── BANNER CONTAINER ── */}
      <div className="profile-banner-wrap" style={{
        position: 'relative', borderRadius: '20px',
        overflow: 'hidden', border: '1px solid rgba(255, 26, 117, 0.2)',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)', background: '#0a0a14'
      }}>
        {bannerUrl ? (
  <img
    src={bannerUrl}
    alt="User Profile Banner"
    style={{ width: '100%', height: '100%', objectFit: 'cover', filter: isEditing ? 'brightness(0.6)' : 'none', transition: 'all 0.3s ease' }}
    onError={() => {}}
  />
) : (
  <div style={{ width: '100%', height: '100%', background: RANDOM_BANNER_COLOR }} />
)}
        
        {isEditing && (
          <div style={{
            position: 'absolute', top: '20px', right: '20px',
            background: 'rgba(0,0,0,0.7)', padding: '10px 15px', borderRadius: '10px',
            backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)',
            fontSize: '0.8rem', zIndex: 10
          }}>
            <Image size={14} style={{ marginRight: '6px', verticalAlign: 'middle', color: '#ff1a75' }} />
            Customize Mode Active
          </div>
        )}

        {/* Edit Toggle Icon */}
        <button 
          onClick={() => setIsEditing(!isEditing)} 
          style={{
            position: 'absolute', bottom: '20px', right: '20px',
            background: isEditing ? 'var(--brand-color)' : 'rgba(15, 15, 25, 0.75)',
            color: isEditing ? '#000' : '#fff', border: 'none',
            borderRadius: '10px', padding: '10px 18px', fontSize: '0.85rem',
            fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center',
            gap: '8px', zIndex: 10, transition: 'all 0.2s ease',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
          }}
          onMouseEnter={e => { if (!isEditing) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; }}
          onMouseLeave={e => { if (!isEditing) e.currentTarget.style.background = 'rgba(15, 15, 25, 0.75)'; }}
        >
          {isEditing ? <Check size={16} /> : <Edit2 size={14} />}
          {isEditing ? 'Cancel Edit' : 'Edit Profile Theme'}
        </button>
      </div>

      {/* ── USER INFO / AVATAR LAYER ── */}
      <div className="profile-meta-row" style={{
        display: 'flex', gap: '30px', alignItems: 'flex-end',
        position: 'relative', zIndex: 5
      }}>
        {/* Floating Circle Avatar */}
        <div className="profile-avatar-wrapper" style={{ position: 'relative', flexShrink: 0 }}>
          <div className="profile-avatar" style={{
            borderRadius: '50%',
            overflow: 'hidden', border: '5px solid #06060c',
            boxShadow: '0 8px 30px rgba(0,0,0,0.6)', background: '#121220'
          }}>
            <img 
              src={avatarUrl || DEFAULT_AVATAR} 
              alt="Avatar picture"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => { e.target.src = DEFAULT_AVATAR; }}
            />
          </div>
          {isEditing && (
            <div style={{
              position: 'absolute', bottom: '5px', right: '5px',
              background: '#ff1a75', color: '#000', borderRadius: '50%',
              width: '36px', height: '36px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', border: '3px solid #06060c',
              boxShadow: '0 2px 10px rgba(255,26,117,0.4)', alignContent: 'center'
            }}>
              <Camera size={16} />
            </div>
          )}
        </div>

        {/* Username & Metadata */}
        <div className="profile-user-info" style={{ flex: 1, paddingBottom: '10px' }}>
          <h1 className="profile-username" style={{
            fontWeight: '900', margin: 0,
            textShadow: '0 4px 15px rgba(0,0,0,0.8)', color: '#fff',
            display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap'
          }}>
            {user.username}
            {user.is_admin ? (
              <span style={{
                fontSize: '0.8rem', fontWeight: '900', 
                background: 'linear-gradient(135deg, #ffd700, #ffaa00)',
                color: '#000', padding: '6px 14px', borderRadius: '20px',
                textTransform: 'uppercase', letterSpacing: '1.5px',
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                boxShadow: '0 0 15px rgba(255, 215, 0, 0.5), 0 0 30px rgba(255, 170, 0, 0.25)',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                <Award size={14} /> ADMIN
              </span>
            ) : (
              <span style={{
                fontSize: '0.75rem', fontWeight: '800', background: 'linear-gradient(135deg, #ff1a75, #ff6b9d)',
                color: '#000', padding: '4px 10px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '1px'
              }}>
                VAULT CITIZEN
              </span>
            )}
          </h1>
          <p style={{
            fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '6px 0 0',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}>
            <Calendar size={14} style={{ color: user.is_admin ? '#ffd700' : '#ff1a75' }} /> Joined AnimeVault
          </p>
        </div>



        <div className="profile-actions-buttons" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {/* Settings Button */}
          <Link to="/settings" style={{
            padding: '12px 24px', background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)', color: '#fff',
            fontSize: '0.85rem', fontWeight: '800', borderRadius: '12px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
            transition: 'all 0.2s ease', marginBottom: '10px',
            textDecoration: 'none'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          >
            <SettingsIcon size={16} /> Settings
          </Link>

          {/* Logout Quick Trigger */}
          <button 
            onClick={() => { logout(); navigate('/'); }}
            style={{
              padding: '12px 24px', background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444',
              fontSize: '0.85rem', fontWeight: '800', borderRadius: '12px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
              transition: 'all 0.2s ease', marginBottom: '10px'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.18)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      {/* ── PROFILE THEME EDITING PANEL ── */}
      {isEditing && (
        <div style={{
          background: 'rgba(15, 15, 25, 0.6)', border: '1px solid rgba(255, 26, 117, 0.25)',
          borderRadius: '16px', padding: '25px', marginTop: '24px', backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px 0 rgba(255,26,117,0.05), inset 0 0 15px rgba(255,255,255,0.02)',
          animation: 'slideDownProfile 0.3s ease-out'
        }}>
          <h3 style={{ margin: '0 0 15px', display: 'flex', alignItems: 'center', gap: '8px', color: '#ff1a75', fontSize: '1.1rem' }}>
            <Sparkles size={18} /> Theme Customizer Panel
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Avatar URL Edit */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Avatar Image URL</label>
              <input 
                type="text" 
                value={avatarUrl} 
                onChange={(e) => setAvatarUrl(e.target.value)} 
                placeholder="Enter custom image address..."
                style={{
                  width: '100%', padding: '10px 14px', background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
                  color: '#fff', outline: 'none', fontSize: '0.85rem'
                }}
              />
              <div style={{ marginTop: '12px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: '6px' }}>Quick Preset Avatars:</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {PRESET_AVATARS.map((av, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => setAvatarUrl(av.url)} 
                      style={{
                        padding: '6px 10px', fontSize: '0.7rem', fontWeight: '800',
                        background: avatarUrl === av.url ? 'var(--brand-color)' : 'rgba(255,255,255,0.04)',
                        color: avatarUrl === av.url ? '#000' : '#fff', border: 'none',
                        borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s'
                      }}
                    >
                      {av.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Banner URL Edit */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Profile Banner URL</label>
              <input 
                type="text" 
                value={bannerUrl} 
                onChange={(e) => setBannerUrl(e.target.value)} 
                placeholder="Enter custom image address..."
                style={{
                  width: '100%', padding: '10px 14px', background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
                  color: '#fff', outline: 'none', fontSize: '0.85rem'
                }}
              />
              <div style={{ marginTop: '12px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: '6px' }}>Quick Preset Banners:</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {PRESET_BANNERS.map((bn, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => setBannerUrl(bn.url)} 
                      style={{
                        padding: '6px 10px', fontSize: '0.7rem', fontWeight: '800',
                        background: bannerUrl === bn.url ? 'var(--brand-color)' : 'rgba(255,255,255,0.04)',
                        color: bannerUrl === bn.url ? '#000' : '#fff', border: 'none',
                        borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s'
                      }}
                    >
                      {bn.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '20px', alignItems: 'center' }}>
            <button 
              onClick={handleSaveProfile} 
              style={{
                background: 'var(--brand-color)', color: '#000', border: 'none',
                fontWeight: '900', fontSize: '0.85rem', padding: '11px 24px',
                borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                gap: '8px', boxShadow: '0 4px 15px rgba(255,26,117,0.3)'
              }}
            >
              <Save size={16} /> Save Changes
            </button>
            {saveStatus && <span style={{ fontSize: '0.85rem', color: saveStatus.includes('success') ? '#10b981' : '#ff1a75', fontWeight: 'bold' }}>{saveStatus}</span>}
          </div>
        </div>
      )}

      {/* ── STATS DASHBOARD DECK ── */}
      <div className="profile-stats-deck" style={{
        display: 'grid', gap: '20px', marginTop: '40px'
      }}>
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#ff1a75' }}>{continueWatching.length}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: '700', marginTop: '4px' }}>In Progress</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#ff1a75' }}>{likes.length}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: '700', marginTop: '4px' }}>Likes & Favorites</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#ff1a75' }}>{history.length}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: '700', marginTop: '4px' }}>Episodes Synced</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#ff1a75' }}>A+</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: '700', marginTop: '4px' }}>Account Status</div>
        </div>
      </div>

      {/* ── DYNAMIC DASHBOARD CONTENT TABS ── */}
      <div className="profile-tabs-section" style={{ marginTop: '50px' }}>
        {/* Navigation Bar */}
        <div className="profile-tabs-nav" style={{ 
          display: 'flex', gap: '15px', borderBottom: '1px solid rgba(255,255,255,0.08)',
          paddingBottom: '15px', marginBottom: '30px', overflowX: 'auto', whiteSpace: 'nowrap'
        }}>
          <button onClick={() => setActiveTab('continue')} style={{
            background: 'none', border: 'none', color: activeTab === 'continue' ? 'var(--brand-color)' : 'var(--text-secondary)',
            fontSize: '1rem', fontWeight: '800', cursor: 'pointer', paddingBottom: '10px',
            position: 'relative', display: 'flex', alignItems: 'center', gap: '6px'
          }}>
            <Tv size={16} /> Continue Watching ({continueWatching.length})
            {activeTab === 'continue' && <div style={{ position: 'absolute', bottom: '-16px', left: 0, width: '100%', height: '2px', background: 'var(--brand-color)' }} />}
          </button>

          <button onClick={() => setActiveTab('likes')} style={{
            background: 'none', border: 'none', color: activeTab === 'likes' ? 'var(--brand-color)' : 'var(--text-secondary)',
            fontSize: '1rem', fontWeight: '800', cursor: 'pointer', paddingBottom: '10px',
            position: 'relative', display: 'flex', alignItems: 'center', gap: '6px'
          }}>
            <Heart size={16} /> Favorites ({likes.length})
            {activeTab === 'likes' && <div style={{ position: 'absolute', bottom: '-16px', left: 0, width: '100%', height: '2px', background: 'var(--brand-color)' }} />}
          </button>

          <button onClick={() => setActiveTab('history')} style={{
            background: 'none', border: 'none', color: activeTab === 'history' ? 'var(--brand-color)' : 'var(--text-secondary)',
            fontSize: '1rem', fontWeight: '800', cursor: 'pointer', paddingBottom: '10px',
            position: 'relative', display: 'flex', alignItems: 'center', gap: '6px'
          }}>
            <Clock size={16} /> Stream History ({history.length})
            {activeTab === 'history' && <div style={{ position: 'absolute', bottom: '-16px', left: 0, width: '100%', height: '2px', background: 'var(--brand-color)' }} />}
          </button>

          <button onClick={() => setActiveTab('recommendations')} style={{
            background: 'none', border: 'none', color: activeTab === 'recommendations' ? 'var(--brand-color)' : 'var(--text-secondary)',
            fontSize: '1rem', fontWeight: '800', cursor: 'pointer', paddingBottom: '10px',
            position: 'relative', display: 'flex', alignItems: 'center', gap: '6px'
          }}>
            <Sparkles size={16} /> Recommended For You
            {activeTab === 'recommendations' && <div style={{ position: 'absolute', bottom: '-16px', left: 0, width: '100%', height: '2px', background: 'var(--brand-color)' }} />}
          </button>

          {activeTab === 'history' && history.length > 0 && (
            <button onClick={clearHistory} style={{
              marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px',
              padding: '6px 12px', fontSize: '0.75rem', fontWeight: '800', borderRadius: '8px',
              border: 'none', background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444',
              cursor: 'pointer', transition: 'all 0.2s'
            }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.18)'}
               onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}>
              <Trash2 size={12} /> Clear Stream History
            </button>
          )}
        </div>

        {/* Tab Cards Panels */}
        <div>
          {/* TAB: CONTINUE WATCHING */}
          {activeTab === 'continue' && (
            continueWatching.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-tertiary)', background: 'rgba(255,255,255,0.01)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.03)' }}>
                <Tv size={40} style={{ marginBottom: '14px', opacity: 0.5, color: '#ff1a75' }} />
                <h3 style={{ margin: '0 0 6px', color: '#fff' }}>No Active Streams</h3>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>Stream an anime or movie, and your progress will instantly appear here!</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
                {continueWatching.map((item, idx) => {
                  const progressPct = item.duration > 0 ? Math.min(100, Math.round((item.progress / item.duration) * 100)) : 0;
                  
                  return (
                    <div key={idx} style={{
                      background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.04)',
                      borderRadius: '14px', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                      transition: 'all 0.3s ease', position: 'relative'
                    }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'rgba(255, 26, 117, 0.4)'; }}
                       onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.04)'; }}>
                      
                      {/* Image Thumbnail wrapper */}
                      <div style={{ position: 'relative', aspectRatio: '16/9', overflow: 'hidden' }}>
                        <img src={getPosterUrl(item, 'card')} alt={item.media_title} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://placehold.co/300x169/1a1a2e/ff1a75.png?text=No+Image'; }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <div style={{
                          position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.85)',
                          padding: '3px 8px', borderRadius: '5px', fontSize: '0.65rem', fontWeight: '900', color: 'var(--brand-color)'
                        }}>
                          {item.media_type === 'movie' ? 'Movie' : `S${item.season || 1} Ep${item.episode || 1}`}
                        </div>
                      </div>

                      {/* Progress Bar overlay */}
                      <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.08)' }}>
                        <div style={{ width: `${progressPct}%`, height: '100%', background: 'var(--brand-color)', boxShadow: '0 0 8px var(--brand-color)' }} />
                      </div>

                      {/* Detail metadata block */}
                      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <h4 style={{ margin: '0 0 6px', fontSize: '0.85rem', fontWeight: '800', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.media_title}
                        </h4>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 'auto', alignItems: 'center' }}>
                          <span>{progressPct}% Completed</span>
                          <Link 
                            to={item.media_type === 'movie' || item.media_type === 'series' || item.media_type === 'tv' ? `/watch/${item.media_type}/${item.media_id}` : `/anime/${item.media_id}?episode=${item.episode}`} 
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '3px', textDecoration: 'none',
                              color: 'var(--brand-color)', fontWeight: 'bold'
                            }}
                          >
                            Resume <ExternalLink size={10} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* TAB: LIKES & FAVORITES */}
          {activeTab === 'likes' && (
            likes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-tertiary)', background: 'rgba(255,255,255,0.01)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.03)' }}>
                <Heart size={40} style={{ marginBottom: '14px', opacity: 0.5, color: '#ff1a75' }} />
                <h3 style={{ margin: '0 0 6px', color: '#fff' }}>Favorites are Empty</h3>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>Heart your favorite anime, movie, or manga to display them here!</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '20px' }}>
                {likes.map((item, idx) => (
                  <Link 
                    key={idx} 
                    to={item.media_type === 'manga' ? `/manga/${item.media_id}` : (item.media_type === 'movie' || item.media_type === 'series' || item.media_type === 'tv' ? `/watch/${item.media_type}/${item.media_id}` : `/anime/${item.media_id}`)} 
                    style={{ textDecoration: 'none', position: 'relative' }}
                  >
                    <div style={{
                      position: 'relative', borderRadius: '14px', overflow: 'hidden',
                      aspectRatio: '2/3', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
                      transition: 'all 0.3s ease', boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
                    }} onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.borderColor = 'var(--brand-color)'; }}
                       onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; }}>
                      
                      <img src={getPosterUrl(item, 'poster')} alt={item.media_title} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://placehold.co/140x210/1a1a2e/ff1a75.png?text=No+Image'; }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      
                      <div style={{
                        position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.7)',
                        padding: '3px 8px', borderRadius: '5px', fontSize: '0.6rem', fontWeight: '900', textTransform: 'uppercase', color: 'var(--brand-color)'
                      }}>
                        {item.media_type}
                      </div>

                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, width: '100%',
                        background: 'linear-gradient(transparent, rgba(0,0,0,0.95))',
                        padding: '12px 10px 10px', fontSize: '0.75rem', fontWeight: '800', color: '#fff',
                        textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                      }}>
                        {item.media_title}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )
          )}

          {/* TAB: STREAM HISTORY */}
          {activeTab === 'history' && (
            history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-tertiary)', background: 'rgba(255,255,255,0.01)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.03)' }}>
                <Clock size={40} style={{ marginBottom: '14px', opacity: 0.5, color: '#ff1a75' }} />
                <h3 style={{ margin: '0 0 6px', color: '#fff' }}>No Streams Logged</h3>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>Stream episodes and they will automatically populate here!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '800px', margin: '0 auto' }}>
                {history.map((item, idx) => (
                  <div key={idx} style={{
                    display: 'flex', gap: '20px', padding: '12px 18px', borderRadius: '14px',
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
                    alignItems: 'center', transition: 'all 0.2s ease'
                  }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255, 26, 117, 0.2)'; }}
                     onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; }}>
                    
                    <img src={getPosterUrl(item, 'list')} alt={item.media_title} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://placehold.co/45x64/1a1a2e/ff1a75.png?text=No+Img'; }} style={{ width: '45px', height: '64px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
                    
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '800', color: '#fff' }}>{item.media_title}</h4>
                      <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Film size={12} /> {item.media_type}
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                        {new Date(item.watched_at).toLocaleDateString()}
                      </span>
                      <Link 
                        to={item.media_type === 'movie' || item.media_type === 'series' || item.media_type === 'tv' ? `/watch/${item.media_type}/${item.media_id}` : `/anime/${item.media_id}`}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)', color: '#fff', border: 'none',
                          borderRadius: '8px', padding: '6px 12px', fontSize: '0.75rem', fontWeight: '800',
                          textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                      >
                        Play <ExternalLink size={10} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* TAB: RECOMMENDED ANIME */}
          {activeTab === 'recommendations' && (
            loadingRecs ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div className="spinner" style={{
                  width: '32px', height: '32px', border: '3px solid rgba(255,26,117,0.2)',
                  borderTopColor: 'var(--brand-color)', borderRadius: '50%',
                  animation: 'spin 1s linear infinite', margin: '0 auto 10px'
                }} />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Matching dynamic trending recommendations...</span>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '20px', maxHeight: '80vh', overflowY: 'auto' }}>
                {recommendations.map((item, idx) => (
                  <Link key={idx} to={item.media_type === 'movie' || item.media_type === 'series' || item.media_type === 'tv' ? `/watch/${item.media_type}/${item.media_id || item.id}` : `/anime/${item.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{
                      position: 'relative', borderRadius: '14px', overflow: 'hidden',
                      aspectRatio: '2/3', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
                      transition: 'all 0.3s ease'
                    }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'var(--brand-color)'; }}
                       onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; }}>
                      
                      <img src={getPosterUrl(item, 'card')} alt={item.media_title || item.title?.romaji} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, width: '100%',
                        background: 'linear-gradient(transparent, rgba(0,0,0,0.95))',
                        padding: '12px 10px 10px', fontSize: '0.75rem', fontWeight: '800', color: '#fff',
                        textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                      }}>
                        {item.media_title || item.title?.romaji}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      <style>{`
        @keyframes profileFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: none; }
        }
        @keyframes slideDownProfile {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: none; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
