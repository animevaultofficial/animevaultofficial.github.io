import { useState, useEffect } from 'react';
import { Heart, Clock, User, LogOut, Trash2, Calendar, Film, Camera, Edit2, Image, Sparkles, Tv, Check, Save, ExternalLink, Award, Settings as SettingsIcon, UploadCloud, Loader, Users, BadgeCheck, Repeat } from 'lucide-react';
import { useUser } from '../api/UserContext';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fetchTrendingMedia } from '../api/anilist';
import { getRecommended } from '../api/movies';
import { fetchPublicUserProfile, getUserSocialStats, followUser, unfollowUser, blockUser, unblockUser, getConnections } from '../api/db';
import { getSettings } from '../api/settings';
import StoryAvatar from '../components/StoryAvatar';
import StoryUploadModal from '../components/StoryUploadModal';
import { clearActiveSubAccount, setActiveSubAccount } from '../utils/subAccounts';

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
const DEFAULT_AVATAR = '/logo.png';
function getRandomBannerColor() {
  return `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`;
}
const RANDOM_BANNER_COLOR = getRandomBannerColor();
const EMPTY_CONNECTIONS = { following: [], followers: [], blocked: [] };

function getRequestedSubAccountId(routeTail = '') {
  const match = String(routeTail || '').match(/(?:^|\/)sub=([^/]+)/i);
  return match ? decodeURIComponent(match[1]) : null;
}

function findRequestedSubAccount(profiles, requestedSubAccountId) {
  if (!requestedSubAccountId) return null;
  const requested = String(requestedSubAccountId);
  const directMatch = profiles.find(profile => String(profile.id) === requested);
  if (directMatch) return directMatch;

  const requestedIndex = Number.parseInt(requested, 10);
  if (Number.isInteger(requestedIndex) && requestedIndex > 0) {
    return profiles[requestedIndex - 1] || null;
  }

  return null;
}

function getProfileDisplayUser(user, subAccount) {
  if (!user || !subAccount) return user;
  return {
    ...user,
    username: subAccount.name || user.username,
    avatar: subAccount.avatar || user.avatar,
    activeSubAccountId: subAccount.id,
  };
}

function normalizeConnections(value) {
  return {
    following: Array.isArray(value?.following) ? value.following : [],
    followers: Array.isArray(value?.followers) ? value.followers : [],
    blocked: Array.isArray(value?.blocked) ? value.blocked : []
  };
}

function connectionMatchesUser(connection, userId) {
  const connectionId = typeof connection === 'object' && connection !== null ? connection.id : connection;
  return String(connectionId) === String(userId);
}

export default function Profile() {
  const { userid, '*': routeTail = '' } = useParams();
  const { user: currentUser, history: ownHistory, likes: ownLikes, continueWatching: ownContinueWatching, logout, clearHistory, updateProfile, updateSubAccount, activeSubAccount, subAccounts, fetchSubAccounts, setActiveSubAccountState } = useUser();
  const navigate = useNavigate();

  const requestedSubAccountId = getRequestedSubAccountId(routeTail);
  const isOwnProfile = currentUser && String(currentUser.id) === String(userid);
  const settings = getSettings();
  const showHistoryTab = isOwnProfile && !settings.hideHistory;

  const [activeTab, setActiveTab] = useState('likes');
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);

  // Public data state
  const [publicUser, setPublicUser] = useState(null);
  const [publicStats, setPublicStats] = useState({ followers: 0, following: 0 });
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Determine displayed data
  const displayedSubAccount = isOwnProfile ? activeSubAccount : null;
  const user = isOwnProfile ? getProfileDisplayUser(currentUser, displayedSubAccount) : publicUser;
  const history = showHistoryTab ? (isOwnProfile ? ownHistory : []) : [];
  const continueWatching = isOwnProfile ? ownContinueWatching : [];
  const likes = isOwnProfile ? ownLikes : [];

  // Customization overlays (only used if isOwnProfile)
  const [isEditing, setIsEditing] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [showStoryUpload, setShowStoryUpload] = useState(false);
  const [connections, setConnections] = useState(EMPTY_CONNECTIONS);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  useEffect(() => {
    async function loadProfileData() {
      if (isOwnProfile) {
        setLoadingProfile(false);
        if (currentUser) {
          const profiles = subAccounts.length ? subAccounts : await fetchSubAccounts();
          const requestedProfile = findRequestedSubAccount(profiles, requestedSubAccountId);
          if (requestedSubAccountId && requestedProfile && requestedProfile.id !== activeSubAccount?.id) {
            setActiveSubAccount(currentUser.id, requestedProfile);
            setActiveSubAccountState(requestedProfile);
          }
          const profileForDisplay = requestedProfile || activeSubAccount;
          setAvatarUrl(profileForDisplay?.avatar || currentUser.avatar || DEFAULT_AVATAR);
          setBannerUrl(currentUser.banner || DEFAULT_BANNER);
        } else {
          navigate('/');
        }
        return;
      }

      setLoadingProfile(true);
      try {
        const data = await fetchPublicUserProfile(userid);
        setPublicUser(data);
        if (data) {
          setAvatarUrl(data.avatar || DEFAULT_AVATAR);
          setBannerUrl(data.banner || DEFAULT_BANNER);
          const stats = await getUserSocialStats(data.id);
          setPublicStats(stats);
        }
      } catch (err) {
        console.error("Failed to load public profile:", err);
      }
      setLoadingProfile(false);
    }
    loadProfileData();
  }, [userid, routeTail, requestedSubAccountId, isOwnProfile, currentUser, activeSubAccount, subAccounts, fetchSubAccounts, setActiveSubAccountState, navigate]);

  // Load connections for follow/block status
  useEffect(() => {
    if (currentUser && !isOwnProfile && publicUser) {
      getConnections(currentUser.id).then(result => setConnections(normalizeConnections(result)));
    }
  }, [currentUser, isOwnProfile, publicUser]);

  const handleSocialAction = async (action) => {
    if (!currentUser || !publicUser || isProcessingAction) return;
    setIsProcessingAction(true);
    let success = false;

    if (action === 'follow') success = await followUser(currentUser.id, publicUser.id);
    if (action === 'unfollow') success = await unfollowUser(currentUser.id, publicUser.id);
    if (action === 'block') success = await blockUser(currentUser.id, publicUser.id);
    if (action === 'unblock') success = await unblockUser(currentUser.id, publicUser.id);

    if (success) {
      // Refresh connections and stats
      const newConns = await getConnections(currentUser.id);
      setConnections(normalizeConnections(newConns));
      const sData = await getUserSocialStats(publicUser.id);
      setPublicStats(sData);
    }
    setIsProcessingAction(false);
  };

  const handleFileUpload = async (e, type) => {
    if (!isOwnProfile) return;
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File is too large. Please select an image under 5MB.");
      return;
    }

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      alert("Missing Cloudinary Cloud Name or Upload Preset in .env file.");
      return;
    }

    const setUploading = type === 'avatar' ? setIsUploadingAvatar : setIsUploadingBanner;
    const setUrl = type === 'avatar' ? setAvatarUrl : setBannerUrl;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);
      formData.append("folder", "animevault_profiles");

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });

      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch {
        console.error("Cloudinary upload failed (non-JSON response):", responseText);
        alert(`Upload failed: Server returned status ${response.status}. Make sure your Cloudinary upload preset "${uploadPreset}" is configured for unsigned uploads and allows image files.`);
        return;
      }

      if (response.ok && result.secure_url) {
        setUrl(result.secure_url);
      } else {
        console.error("Cloudinary upload failed:", result);
        alert(`Upload failed: ${result.error?.message || `Cloudinary returned status ${response.status}. Verify your upload preset settings.`}`);
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Error during upload: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (!isOwnProfile) return;
    async function loadRecs() {
      setLoadingRecs(true);
      try {
        const [animeRecs, movieRecs] = await Promise.all([
          fetchTrendingMedia('ANIME', 1, 20),
          getRecommended(200),
        ]);
        const combined = [...animeRecs, ...movieRecs];
        const uniqueMap = new Map();
        combined.forEach(item => {
          const uid = item.media_id || item.id || item.imdb_id;
          if (!uniqueMap.has(uid)) uniqueMap.set(uid, item);
        });
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
  }, [isOwnProfile]);

  const handleSaveProfile = async () => {
    setSaveStatus('Saving...');
    let success = false;
    if (activeSubAccount?.id) {
      const result = await updateSubAccount(activeSubAccount.id, {
        name: activeSubAccount.name,
        color: activeSubAccount.color,
        avatar: avatarUrl,
        ageRating: activeSubAccount.ageRating || 'adults'
      });
      success = result.success;
      if (result.success && result.profile) {
        setActiveSubAccount(currentUser.id, result.profile);
        setActiveSubAccountState(result.profile);
      }
    } else {
      success = await updateProfile(avatarUrl, bannerUrl);
    }
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

  if (loadingProfile) {
    return (
      <div style={{ textAlign: 'center', padding: '120px 20px', color: 'var(--text-secondary)' }}>
        <div className="spinner" style={{
          width: '40px', height: '40px', border: '3px solid rgba(255,26,117,0.2)',
          borderTopColor: 'var(--brand-color)', borderRadius: '50%',
          animation: 'spin 1s linear infinite', margin: '0 auto 20px'
        }} />
        <span style={{ fontSize: '0.95rem' }}>Loading vault citizen...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '120px 20px', color: 'var(--text-secondary)' }}>
        <h2 style={{ color: '#fff', marginBottom: '8px' }}>User Not Found</h2>
        <p style={{ fontSize: '0.9rem', margin: '0 0 20px' }}>The specified vault citizen record could not be located.</p>
        <Link to="/" style={{
          background: 'var(--brand-color)', color: '#000', padding: '10px 20px',
          borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.85rem'
        }}>
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <div className="profile-container" style={{
      maxWidth: '1200px', margin: '40px auto 80px', padding: '0 20px',
      color: '#fff', animation: 'profileFadeIn 0.4s ease-out'
    }}>

      {/* ── BANNER CONTAINER ── */}
      <div className="profile-banner-wrap" style={{
        position: 'relative', borderRadius: '20px', height: '320px',
        overflow: 'hidden', border: '1px solid rgba(255, 26, 117, 0.2)',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)', background: '#0a0a14'
      }}>
        {bannerUrl ? (
          <img
            src={bannerUrl}
            alt="User Profile Banner"
            style={{ width: '100%', height: '100%', objectFit: 'cover', filter: isEditing ? 'brightness(0.6)' : 'none', transition: 'all 0.3s ease' }}
            onError={() => { }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: RANDOM_BANNER_COLOR }} />
        )}

        {isOwnProfile && isEditing && (
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
        {isOwnProfile && (
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
        )}
      </div>

      {/* ── USER INFO / AVATAR LAYER ── */}
      <div className="profile-meta-row" style={{
        display: 'flex', gap: '30px', alignItems: 'flex-end',
        position: 'relative', zIndex: 5, padding: '0 40px', marginTop: '-60px'
      }}>
        {/* Floating Circle Avatar */}
        <div className="profile-avatar-wrapper" style={{ position: 'relative', flexShrink: 0 }}>
          <StoryAvatar
            user={{ ...user, avatar: avatarUrl }}
            viewerId={currentUser?.id}
            size={140}
            style={{
              boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
              background: '#121220',
              border: '5px solid #06060c'
            }}
          />

          {isOwnProfile && !isEditing && (
            <div
              onClick={() => setShowStoryUpload(true)}
              style={{
                position: 'absolute', bottom: '5px', right: '5px', background: 'var(--brand-color)',
                color: '#000', width: '32px', height: '32px', borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '3px solid #06060c',
                zIndex: 20, fontWeight: 'bold', fontSize: '20px', paddingBottom: '2px',
                boxShadow: '0 2px 10px rgba(255,26,117,0.4)'
              }}
              title="Add Story"
            >
              +
            </div>
          )}

          {isOwnProfile && isEditing && (
            <div style={{
              position: 'absolute', bottom: '5px', right: '5px',
              background: '#ff1a75', color: '#000', borderRadius: '50%',
              width: '36px', height: '36px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', border: '3px solid #06060c',
              boxShadow: '0 2px 10px rgba(255,26,117,0.4)', zIndex: 20
            }}>
              <Camera size={16} />
            </div>
          )}
        </div>

        {/* Username & Metadata */}
        <div className="profile-user-info" style={{ flex: 1, paddingBottom: '10px' }}>
          <h1 className="profile-username" style={{
            fontSize: '2.5rem', fontWeight: '900', margin: 0,
            textShadow: '0 4px 15px rgba(0,0,0,0.8)', color: '#fff',
            display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap'
          }}>
            {user.username}
            {user.is_verified && (
              <BadgeCheck size={28} fill="#1d9bf0" color="#fff" style={{ filter: 'drop-shadow(0 2px 8px rgba(29, 155, 240, 0.5))' }} title="Verified Vault Citizen" />
            )}
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

        {isOwnProfile && (
          <div className="profile-actions-buttons" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
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

            <button
              onClick={() => { clearActiveSubAccount(); setActiveSubAccountState(null); navigate('/'); }}
              style={{
                padding: '12px 24px', background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.14)', color: '#fff',
                fontSize: '0.85rem', fontWeight: '800', borderRadius: '12px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                transition: 'all 0.2s ease', marginBottom: '10px'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            >
              <Repeat size={16} /> Switch Profile{activeSubAccount?.name ? ` (${activeSubAccount.name})` : ''}
            </button>

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
        )}

        {!isOwnProfile && currentUser && publicUser && (
          <div className="profile-actions-buttons" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {connections.following.some(u => connectionMatchesUser(u, publicUser.id)) ? (
              <button
                onClick={() => handleSocialAction('unfollow')}
                disabled={isProcessingAction}
                style={{
                  padding: '12px 24px', background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)', color: '#fff',
                  fontSize: '0.85rem', fontWeight: '800', borderRadius: '12px',
                  cursor: isProcessingAction ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease',
                  opacity: isProcessingAction ? 0.5 : 1
                }}
              >
                Following
              </button>
            ) : (
              <button
                onClick={() => handleSocialAction('follow')}
                disabled={isProcessingAction || connections.blocked.some(u => connectionMatchesUser(u, publicUser.id))}
                style={{
                  padding: '12px 24px', background: 'var(--brand-color)',
                  border: 'none', color: '#000',
                  fontSize: '0.85rem', fontWeight: '800', borderRadius: '12px',
                  cursor: (isProcessingAction || connections.blocked.some(u => connectionMatchesUser(u, publicUser.id))) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  opacity: (isProcessingAction || connections.blocked.some(u => connectionMatchesUser(u, publicUser.id))) ? 0.5 : 1
                }}
              >
                Follow
              </button>
            )}

            {connections.blocked.some(u => connectionMatchesUser(u, publicUser.id)) ? (
              <button
                onClick={() => handleSocialAction('unblock')}
                disabled={isProcessingAction}
                style={{
                  padding: '12px 24px', background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444',
                  fontSize: '0.85rem', fontWeight: '800', borderRadius: '12px',
                  cursor: isProcessingAction ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease',
                  opacity: isProcessingAction ? 0.5 : 1
                }}
              >
                Unblock
              </button>
            ) : (
              <button
                onClick={() => handleSocialAction('block')}
                disabled={isProcessingAction}
                style={{
                  padding: '12px 24px', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)',
                  fontSize: '0.85rem', fontWeight: '800', borderRadius: '12px',
                  cursor: isProcessingAction ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease',
                  opacity: isProcessingAction ? 0.5 : 1
                }}
              >
                Block
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── PROFILE THEME EDITING PANEL ── */}
      {isOwnProfile && isEditing && (
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
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Avatar Image</label>
              <label style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 14px', gap: '8px',
                background: 'rgba(255, 26, 117, 0.1)', border: '1px solid rgba(255, 26, 117, 0.3)',
                borderRadius: '10px', color: '#ff1a75', cursor: 'pointer', transition: 'all 0.2s',
                opacity: isUploadingAvatar ? 0.6 : 1, pointerEvents: isUploadingAvatar ? 'none' : 'auto',
                fontWeight: '800', fontSize: '0.85rem'
              }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 26, 117, 0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 26, 117, 0.1)'}>
                {isUploadingAvatar ? (
                  <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Uploading...</>
                ) : (
                  <><UploadCloud size={16} /> Upload Avatar</>
                )}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'avatar')} />
              </label>
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
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Profile Banner</label>
              <label style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 14px', gap: '8px',
                background: 'rgba(255, 26, 117, 0.1)', border: '1px solid rgba(255, 26, 117, 0.3)',
                borderRadius: '10px', color: '#ff1a75', cursor: 'pointer', transition: 'all 0.2s',
                opacity: isUploadingBanner ? 0.6 : 1, pointerEvents: isUploadingBanner ? 'none' : 'auto',
                fontWeight: '800', fontSize: '0.85rem'
              }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 26, 117, 0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 26, 117, 0.1)'}>
                {isUploadingBanner ? (
                  <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Uploading...</>
                ) : (
                  <><UploadCloud size={16} /> Upload Banner</>
                )}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'banner')} />
              </label>
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
        display: 'grid', gridTemplateColumns: isOwnProfile ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)', gap: '20px', marginTop: '40px'
      }}>
        {isOwnProfile ? (
          <>
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
          </>
        ) : (
          <>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: '900', color: user.is_admin ? '#ffd700' : '#ff1a75' }}>
                <Users size={20} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle', marginTop: '-4px' }} />
                {publicStats.followers}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: '700', marginTop: '4px' }}>Followers</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: '900', color: user.is_admin ? '#ffd700' : '#ff1a75' }}>{publicStats.following}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: '700', marginTop: '4px' }}>Following</div>
            </div>
          </>
        )}
      </div>

      {/* ── DYNAMIC DASHBOARD CONTENT TABS ── */}
      <div className="profile-tabs-section" style={{ marginTop: '50px' }}>
        {/* Navigation Bar */}
        <div className="profile-tabs-nav" style={{
          display: 'flex', gap: '15px', borderBottom: '1px solid rgba(255,255,255,0.08)',
          paddingBottom: '15px', marginBottom: '30px', overflowX: 'auto', whiteSpace: 'nowrap'
        }}>
          {isOwnProfile && (
            <button onClick={() => setActiveTab('continue')} style={{
              background: 'none', border: 'none', color: activeTab === 'continue' ? 'var(--brand-color)' : 'var(--text-secondary)',
              fontSize: '1rem', fontWeight: '800', cursor: 'pointer', paddingBottom: '10px',
              position: 'relative', display: 'flex', alignItems: 'center', gap: '6px'
            }}>
              <Tv size={16} /> Continue Watching ({continueWatching.length})
              {activeTab === 'continue' && <div style={{ position: 'absolute', bottom: '-16px', left: 0, width: '100%', height: '2px', background: 'var(--brand-color)' }} />}
            </button>
          )}

          <button onClick={() => setActiveTab('likes')} style={{
            background: 'none', border: 'none', color: activeTab === 'likes' ? 'var(--brand-color)' : 'var(--text-secondary)',
            fontSize: '1rem', fontWeight: '800', cursor: 'pointer', paddingBottom: '10px',
            position: 'relative', display: 'flex', alignItems: 'center', gap: '6px'
          }}>
            <Heart size={16} /> Favorites ({likes.length})
            {activeTab === 'likes' && <div style={{ position: 'absolute', bottom: '-16px', left: 0, width: '100%', height: '2px', background: 'var(--brand-color)' }} />}
          </button>

          {showHistoryTab && (
            <button onClick={() => setActiveTab('history')} style={{
              background: 'none', border: 'none', color: activeTab === 'history' ? 'var(--brand-color)' : 'var(--text-secondary)',
              fontSize: '1rem', fontWeight: '800', cursor: 'pointer', paddingBottom: '10px',
              position: 'relative', display: 'flex', alignItems: 'center', gap: '6px'
            }}>
              <Clock size={16} /> Stream History ({history.length})
              {activeTab === 'history' && <div style={{ position: 'absolute', bottom: '-16px', left: 0, width: '100%', height: '2px', background: 'var(--brand-color)' }} />}
            </button>
          )}

          {isOwnProfile && (
            <button onClick={() => setActiveTab('recommendations')} style={{
              background: 'none', border: 'none', color: activeTab === 'recommendations' ? 'var(--brand-color)' : 'var(--text-secondary)',
              fontSize: '1rem', fontWeight: '800', cursor: 'pointer', paddingBottom: '10px',
              position: 'relative', display: 'flex', alignItems: 'center', gap: '6px'
            }}>
              <Sparkles size={16} /> Recommended For You
              {activeTab === 'recommendations' && <div style={{ position: 'absolute', bottom: '-16px', left: 0, width: '100%', height: '2px', background: 'var(--brand-color)' }} />}
            </button>
          )}

          {showHistoryTab && isOwnProfile && activeTab === 'history' && history.length > 0 && (
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
          {/* TAB: CONTINUE WATCHING (Private) */}
          {isOwnProfile && activeTab === 'continue' && (
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

                      <div style={{ position: 'relative', aspectRatio: '16/9', overflow: 'hidden' }}>
                        <img src={getPosterUrl(item, 'card')} alt={item.media_title} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://placehold.co/300x169/1a1a2e/ff1a75.png?text=No+Image'; }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <div style={{
                          position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.85)',
                          padding: '3px 8px', borderRadius: '5px', fontSize: '0.65rem', fontWeight: '900', color: 'var(--brand-color)'
                        }}>
                          {item.media_type === 'movie' ? 'Movie' : `S${item.season || 1} Ep${item.episode || 1}`}
                        </div>
                      </div>
                      <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.08)' }}>
                        <div style={{ width: `${progressPct}%`, height: '100%', background: 'var(--brand-color)', boxShadow: '0 0 8px var(--brand-color)' }} />
                      </div>
                      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <h4 style={{ margin: '0 0 6px', fontSize: '0.85rem', fontWeight: '800', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.media_title}
                        </h4>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 'auto', alignItems: 'center' }}>
                          <span>{progressPct}% Completed</span>
                          <Link
                            to={item.media_type === 'movie' || item.media_type === 'series' || item.media_type === 'tv' ? `/watch/${item.media_type}/${item.media_id}` : `/anime/${item.media_id}?episode=${item.episode}`}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', textDecoration: 'none', color: 'var(--brand-color)', fontWeight: 'bold' }}
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
                <p style={{ margin: 0, fontSize: '0.85rem' }}>{isOwnProfile ? 'Heart your favorite anime or movie to display them here!' : 'This user has hidden or hasn\'t added any favorites yet.'}</p>
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

          {/* TAB: STREAM HISTORY (Private) */}
          {isOwnProfile && activeTab === 'history' && (
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
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{new Date(item.watched_at).toLocaleDateString()}</span>
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

          {/* TAB: RECOMMENDED ANIME (Private) */}
          {isOwnProfile && activeTab === 'recommendations' && (
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

      {showStoryUpload && (
        <StoryUploadModal user={currentUser} onClose={() => setShowStoryUpload(false)} />
      )}
    </div>
  );
}
