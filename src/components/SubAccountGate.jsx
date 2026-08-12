import { useEffect, useMemo, useState } from 'react';
import { Edit3, Plus, Trash2, UserPlus, X } from 'lucide-react';
import { useUser } from '../api/UserContext';
import AuthModal from './AuthModal';
import {
  MAX_SUB_ACCOUNTS,
  SUB_ACCOUNT_COLORS,
  SUB_ACCOUNT_AGE_RATINGS,
  clearActiveSubAccount,
  ensureSubAccounts,
  getActiveSubAccount,
  saveSubAccounts,
  setActiveSubAccount
} from '../utils/subAccounts';


function getProfileRouteSubAccountRequest(userId) {
  if (typeof window === 'undefined' || !userId) return null;
  const prefix = `#/profile/${userId}/`;
  const hash = window.location.hash || '';
  if (!hash.toLowerCase().startsWith(prefix.toLowerCase())) return null;
  const segment = hash.slice(prefix.length).split('/').find(part => part.toLowerCase().startsWith('sub='));
  return segment ? decodeURIComponent(segment.slice(4)) : null;
}

function findRequestedProfile(profiles, request) {
  if (!request) return null;
  const exact = profiles.find(profile => String(profile.id) === String(request));
  if (exact) return exact;
  const index = Number.parseInt(request, 10);
  return Number.isInteger(index) && index > 0 ? profiles[index - 1] || null : null;
}

const FALLBACK_POSTERS = [
  'https://cdn.myanimelist.net/images/anime/10/47347.jpg',
  'https://cdn.myanimelist.net/images/anime/1208/94745.jpg',
  'https://cdn.myanimelist.net/images/anime/1223/96541.jpg',
  'https://cdn.myanimelist.net/images/anime/5/87048.jpg',
  'https://cdn.myanimelist.net/images/anime/1517/100633.jpg',
  'https://cdn.myanimelist.net/images/anime/1764/126627.jpg',
  'https://cdn.myanimelist.net/images/anime/1935/127974.jpg',
  'https://cdn.myanimelist.net/images/anime/1806/126216.jpg',
  'https://cdn.myanimelist.net/images/anime/1000/110531.jpg',
  'https://cdn.myanimelist.net/images/anime/1286/99889.jpg',
  'https://cdn.myanimelist.net/images/anime/1171/109222.jpg',
  'https://cdn.myanimelist.net/images/anime/3/72078.jpg'
];

function PosterWall() {
  const [posterImages, setPosterImages] = useState(FALLBACK_POSTERS);

  useEffect(() => {
    let cancelled = false;
    async function loadPosterWall() {
      try {
        const response = await fetch('https://api.jikan.moe/v4/top/anime?filter=bypopularity&limit=24');
        if (!response.ok) return;
        const payload = await response.json();
        const images = (payload?.data || [])
          .map(anime => anime?.images?.jpg?.large_image_url || anime?.images?.webp?.large_image_url)
          .filter(Boolean);
        if (!cancelled && images.length >= 12) setPosterImages(images);
      } catch {
        // Keep the curated fallback poster set if the public API is unavailable.
      }
    }

    loadPosterWall();
    return () => { cancelled = true; };
  }, []);

  const tiledPosters = Array.from({ length: 48 }, (_, index) => posterImages[index % posterImages.length]);

  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: '-12vh -12vw', overflow: 'hidden', opacity: 0.68, transform: 'rotate(-10deg) scale(1.18)', transformOrigin: 'center' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, minmax(120px, 1fr))', gap: 14 }}>
        {tiledPosters.map((poster, index) => (
          <div key={`${poster}-${index}`} style={{ aspectRatio: '2 / 3', borderRadius: 16, overflow: 'hidden', background: 'rgba(255,255,255,0.08)', boxShadow: '0 12px 34px rgba(0,0,0,0.42)' }}>
            <img src={poster} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileAvatar({ profile, size = 132 }) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: profile.avatar ? '#111827' : profile.color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontSize: size * 0.34,
      fontWeight: 900,
      boxShadow: '0 24px 55px rgba(255, 26, 117, 0.20)',
      border: '4px solid rgba(255, 26, 117, 0.35)',
      overflow: 'hidden'
    }}>
      {profile.avatar ? (
        <img src={profile.avatar} alt={profile.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        profile.name.charAt(0).toUpperCase()
      )}
    </div>
  );
}

export default function SubAccountGate({ children }) {
  const {
    user,
    authLoading,
    setShowAuthModal,
    setAuthTab,
    activeSubAccount,
    setActiveSubAccountState,
    fetchSubAccounts,
    ensureMainSubAccount,
    createSubAccount,
    updateSubAccount,
    deleteSubAccount
  } = useUser();
  const [profiles, setProfiles] = useState([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const [createMessage, setCreateMessage] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [newName, setNewName] = useState('');
  const [newAvatar, setNewAvatar] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [newAgeRating, setNewAgeRating] = useState('adults');
  const [newColor, setNewColor] = useState(SUB_ACCOUNT_COLORS[0]);
  const hasActiveProfile = Boolean(activeSubAccount);

  useEffect(() => {
    let cancelled = false;
    async function loadProfiles() {
      if (!user?.id) {
        setProfiles([]);
        clearActiveSubAccount();
        setActiveSubAccountState(null);
        return;
      }

      setIsLoadingProfiles(true);
      let nextProfiles = [];
      try {
        await ensureMainSubAccount();
        nextProfiles = await fetchSubAccounts();
      } catch {
        nextProfiles = ensureSubAccounts(user);
      }
      if (cancelled) return;

      if (!nextProfiles.length) nextProfiles = ensureSubAccounts(user);
      setProfiles(nextProfiles);
      saveSubAccounts(user.id, nextProfiles);
      const routeRequestedProfile = findRequestedProfile(
        nextProfiles,
        getProfileRouteSubAccountRequest(user.id)
      );
      const savedActive = getActiveSubAccount(user.id);
      const validActive = savedActive
        ? nextProfiles.find(profile => profile.id === savedActive.id)
        : null;
      const nextActive = routeRequestedProfile || validActive || null;
      if (nextActive) setActiveSubAccount(user.id, nextActive);
      setActiveSubAccountState(nextActive);
      setIsLoadingProfiles(false);
    }

    loadProfiles();
    return () => { cancelled = true; };
  }, [user?.id, user?.username, user?.avatar, setActiveSubAccountState]);

  const canCreate = profiles.length < MAX_SUB_ACCOUNTS;
  const createError = useMemo(() => {
    if (!newName.trim()) return 'Enter a profile name.';
    if (newName.trim().length > 18) return 'Use 18 characters or less.';
    if (profiles.some(profile => profile.id !== editingProfile?.id && profile.name.toLowerCase() === newName.trim().toLowerCase())) return 'That profile name already exists.';
    return '';
  }, [newName, profiles, editingProfile]);


  function resetProfileForm() {
    setEditingProfile(null);
    setNewName('');
    setNewAvatar('');
    setNewAgeRating('adults');
    setNewColor(SUB_ACCOUNT_COLORS[profiles.length % SUB_ACCOUNT_COLORS.length]);
    setCreateMessage('');
  }

  function openCreateProfile() {
    resetProfileForm();
    setShowCreate(true);
  }

  function openEditProfile(profile) {
    setEditingProfile(profile);
    setNewName(profile.name || '');
    setNewAvatar(profile.avatar || '');
    setNewAgeRating(profile.ageRating || 'adults');
    setNewColor(profile.color || SUB_ACCOUNT_COLORS[0]);
    setCreateMessage('');
    setShowCreate(true);
  }

  async function handleDeleteProfile(profile) {
    if (profiles.length <= 1) {
      setCreateMessage('Keep at least one profile.');
      return;
    }
    if (!window.confirm(`Remove ${profile.name}? Watch history stays on the main account, but this profile will be deleted.`)) return;
    const result = await deleteSubAccount(profile.id);
    if (!result.success) {
      setCreateMessage(result.message || 'Could not delete profile.');
      return;
    }
    const nextProfiles = saveSubAccounts(user.id, profiles.filter(item => item.id !== profile.id));
    setProfiles(nextProfiles);
    if (activeSubAccount?.id === profile.id) {
      clearActiveSubAccount();
      setActiveSubAccountState(null);
    }
  }

  function chooseProfile(profile) {
    setActiveSubAccount(user.id, profile);
    setActiveSubAccountState(profile);
  }


  async function handleAvatarUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setCreateMessage('Profile picture must be under 5MB.');
      return;
    }
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !uploadPreset) {
      setCreateMessage('Cloudinary upload is not configured.');
      return;
    }
    setIsUploadingAvatar(true);
    setCreateMessage('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);
      formData.append('folder', 'animevault_profiles');
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData });
      const result = await response.json();
      if (!response.ok || !result.secure_url) throw new Error(result.error?.message || 'Upload failed.');
      setNewAvatar(result.secure_url);
    } catch (err) {
      setCreateMessage(err.message || 'Could not upload profile picture.');
    } finally {
      setIsUploadingAvatar(false);
      event.target.value = '';
    }
  }

  async function handleCreate(event) {
    event.preventDefault();
    if ((!editingProfile && !canCreate) || createError) return;
    setCreateMessage('');
    const nextProfile = {
      id: `${user.id}-profile-${Date.now()}`,
      name: newName.trim(),
      color: newColor,
      avatar: newAvatar.trim() || null,
      ageRating: newAgeRating,
      isMain: editingProfile?.isMain || profiles.length === 0,
      createdAt: new Date().toISOString()
    };

    const result = editingProfile
      ? await updateSubAccount(editingProfile.id, { ...nextProfile, id: editingProfile.id })
      : await createSubAccount(nextProfile);
    if (!result.success) {
      setCreateMessage(result.message || 'Could not save profile to the database.');
      return;
    }

    const savedProfile = result.profile || nextProfile;
    const nextProfiles = editingProfile
      ? profiles.map(profile => profile.id === editingProfile.id ? savedProfile : profile)
      : [...profiles, savedProfile];
    saveSubAccounts(user.id, nextProfiles);
    setProfiles(nextProfiles);
    setShowCreate(false);
    resetProfileForm();
    if (!editingProfile || activeSubAccount?.id === editingProfile.id) chooseProfile(savedProfile);
  }

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '32px', background: 'radial-gradient(circle at top, rgba(255,26,117,0.20), transparent 32%), linear-gradient(135deg, #050505, #16030c 55%, #09090f)', color: '#fff', textAlign: 'center' }}>
        <div style={{ display: 'grid', gap: 14, justifyItems: 'center' }}>
          <img src="/logo.png" alt="AnimeVault" style={{ height: 70 }} />
          <h1 style={{ margin: 0, fontSize: 'clamp(2rem, 6vw, 4rem)', fontWeight: 950 }}><span style={{ color: '#ff1a75' }}>Anime</span>Vault</h1>
          <p style={{ margin: 0, color: '#fda4af', fontWeight: 800 }}>Loading your watching profiles...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <div className="sub-account-signup" style={{ minHeight: '100vh', position: 'relative', display: 'grid', placeItems: 'center', padding: '20px', background: '#050505', color: '#fff', textAlign: 'center', overflow: 'hidden' }}>
          <PosterWall />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(0,0,0,0.92), rgba(12,3,8,0.82) 48%, rgba(0,0,0,0.94)), radial-gradient(circle at center, rgba(255,26,117,0.18), transparent 42%)' }} />
          <div className="sub-account-signup-card" style={{ position: 'relative', zIndex: 1, width: 'min(520px, 100%)', padding: 'clamp(20px, 4vw, 28px)', border: '1px solid rgba(255, 26, 117, 0.28)', borderRadius: 24, background: 'rgba(10, 10, 16, 0.72)', boxShadow: '0 24px 70px rgba(0,0,0,0.52), 0 0 34px rgba(255, 26, 117, 0.14)', backdropFilter: 'blur(14px)' }}>
            <img src="/logo.png" alt="AnimeVault" style={{ height: 'clamp(48px, 11vw, 62px)', marginBottom: 16 }} />
            <h1 style={{ fontSize: 'clamp(1.9rem, 9vw, 3.8rem)', lineHeight: 1.02, margin: '0 0 12px', fontWeight: 950 }}>Sign up to watch AnimeVault.</h1>
            <p style={{ color: '#f8fafc', fontSize: 'clamp(0.95rem, 3vw, 1.05rem)', marginBottom: 22, textShadow: '0 2px 16px rgba(0,0,0,0.8)' }}>Create one main account with one email, then add up to five synced watching profiles for everyone in your home.</p>
            <button onClick={() => { setAuthTab('signup'); setShowAuthModal(true); }} style={{ border: 'none', borderRadius: 999, padding: '14px 28px', fontWeight: 900, background: 'linear-gradient(135deg, #ff1a75, #ef4444)', color: '#000', cursor: 'pointer', fontSize: '1rem', boxShadow: '0 0 24px rgba(255, 26, 117, 0.35)' }}>Sign Up to Watch</button>
            <button onClick={() => { setAuthTab('login'); setShowAuthModal(true); }} style={{ marginLeft: 12, border: '1px solid rgba(255,26,117,0.35)', borderRadius: 999, padding: '13px 24px', fontWeight: 800, background: 'rgba(255,26,117,0.08)', color: '#fff', cursor: 'pointer' }}>Sign In</button>
          </div>
        </div>
        <AuthModal />
      </>
    );
  }

  if (hasActiveProfile) return children;

  if (isLoadingProfiles) {
    return (
      <div className="sub-account-gate sub-account-gate-loading" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px', background: 'radial-gradient(circle at top, rgba(255,26,117,0.20), transparent 32%), linear-gradient(135deg, #050505, #16030c 55%, #09090f)', color: '#fff', textAlign: 'center' }}>
        <div style={{ display: 'grid', gap: 12, justifyItems: 'center' }}>
          <img src="/logo.png" alt="AnimeVault" style={{ height: 56 }} />
          <h1 style={{ margin: 0, fontSize: 'clamp(1.9rem, 9vw, 3.5rem)', fontWeight: 950 }}><span style={{ color: '#ff1a75' }}>Anime</span>Vault</h1>
          <p style={{ margin: 0, color: '#fda4af', fontWeight: 800 }}>Loading your watching profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sub-account-gate" style={{ minHeight: '100vh', background: 'radial-gradient(circle at top, rgba(255,26,117,0.20), transparent 32%), linear-gradient(135deg, #050505, #16030c 55%, #09090f)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(24px, 6vw, 36px) 16px' }}>
      <div style={{ width: 'min(980px, 100%)', textAlign: 'center' }}>
        <h1 style={{ fontSize: 'clamp(2.5rem, 7vw, 4.5rem)', margin: '0 0 12px', fontWeight: 950 }}><span style={{ color: '#ff1a75' }}>Anime</span>Vault</h1>
        <p style={{ color: '#f8fafc', fontSize: 'clamp(1.1rem, 4vw, 1.45rem)', margin: '0 0 clamp(34px, 8vw, 70px)' }}>Who's watching?</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(24px, 6vw, 70px)', flexWrap: 'wrap' }}>
          {profiles.map(profile => (
            <button key={profile.id} onClick={() => chooseProfile(profile)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff', display: 'grid', gap: 18, justifyItems: 'center' }}>
              <ProfileAvatar profile={profile} size={typeof window !== 'undefined' && window.innerWidth < 520 ? 104 : 132} />
              <span style={{ fontSize: '1.15rem', fontWeight: 800 }}>{profile.name}</span>
              {profile.ageRating === 'kids' && <span style={{ marginTop: -12, color: '#fbbf24', fontSize: '0.78rem', fontWeight: 900 }}>Kids 0-12</span>}
              <span style={{ display: 'flex', gap: 8, marginTop: -8 }}>
                <span onClick={(event) => { event.stopPropagation(); openEditProfile(profile); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: '0.72rem', fontWeight: 900 }}><Edit3 size={12} /> Edit</span>
                {profiles.length > 1 && <span onClick={(event) => { event.stopPropagation(); handleDeleteProfile(profile); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 999, background: 'rgba(239,68,68,0.16)', color: '#fecaca', fontSize: '0.72rem', fontWeight: 900 }}><Trash2 size={12} /> Remove</span>}
              </span>
            </button>
          ))}
          {canCreate && (
            <button onClick={openCreateProfile} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff', display: 'grid', gap: 18, justifyItems: 'center' }}>
              <div style={{ width: typeof window !== 'undefined' && window.innerWidth < 520 ? 104 : 132, height: typeof window !== 'undefined' && window.innerWidth < 520 ? 104 : 132, borderRadius: '50%', background: 'rgba(17, 24, 39, 0.82)', display: 'grid', placeItems: 'center', boxShadow: '0 24px 55px rgba(255,26,117,0.16)', border: '4px solid rgba(255, 26, 117, 0.2)' }}><Plus size={44} /></div>
              <span style={{ fontSize: '1.15rem', fontWeight: 800 }}>Add Profile</span>
            </button>
          )}
        </div>
        <p style={{ marginTop: 42, color: '#fda4af', fontSize: '0.95rem' }}>{profiles.length}/{MAX_SUB_ACCOUNTS} profiles linked to {user.username}</p>
      </div>

      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', display: 'grid', placeItems: 'center', padding: 20 }} onClick={() => { setShowCreate(false); resetProfileForm(); }}>
          <form onSubmit={handleCreate} onClick={event => event.stopPropagation()} style={{ width: 'min(430px, 100%)', background: '#09090f', border: '1px solid rgba(255,26,117,0.28)', borderRadius: 20, padding: 24, textAlign: 'left', boxShadow: '0 30px 80px rgba(255,26,117,0.18)' }}>
            <button type="button" onClick={() => { setShowCreate(false); resetProfileForm(); }} style={{ float: 'right', background: 'transparent', color: '#fda4af', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            <h2 style={{ marginTop: 0, display: 'flex', gap: 10, alignItems: 'center' }}><UserPlus size={22} /> {editingProfile ? 'Edit Profile' : 'Add Profile'}</h2>
            <input autoFocus value={newName} onChange={event => setNewName(event.target.value)} placeholder="Profile name" style={{ width: '100%', padding: '13px 14px', borderRadius: 12, border: '1px solid rgba(255,26,117,0.24)', background: 'rgba(255,255,255,0.06)', color: '#fff', marginBottom: 12 }} />
            <label style={{ display: 'grid', gap: 8, marginBottom: 16, color: '#f8fafc', fontWeight: 800 }}>
              Profile picture
              {newAvatar && <ProfileAvatar profile={{ name: newName || 'Profile', avatar: newAvatar, color: newColor }} size={72} />}
              <input type="file" accept="image/*" onChange={handleAvatarUpload} disabled={isUploadingAvatar} style={{ width: '100%', color: '#fff' }} />
              {isUploadingAvatar && <span style={{ color: '#fda4af', fontSize: '0.85rem' }}>Uploading profile picture...</span>}
            </label>
            <label style={{ display: 'grid', gap: 8, marginBottom: 16, color: '#f8fafc', fontWeight: 800 }}>
              Age rating
              <select value={newAgeRating} onChange={event => setNewAgeRating(event.target.value)} style={{ width: '100%', padding: '13px 14px', borderRadius: 12, border: '1px solid rgba(255,26,117,0.24)', background: '#111827', color: '#fff' }}>
                {SUB_ACCOUNT_AGE_RATINGS.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>{SUB_ACCOUNT_COLORS.map(color => <button key={color} type="button" onClick={() => setNewColor(color)} aria-label={`Use ${color}`} style={{ width: 34, height: 34, borderRadius: '50%', background: color, border: newColor === color ? '3px solid #fff' : '3px solid transparent', cursor: 'pointer' }} />)}</div>
            {(createError || createMessage) && <p style={{ color: '#fca5a5', fontSize: '0.85rem' }}>{createError || createMessage}</p>}
            <button disabled={Boolean(createError)} style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: 'none', background: createError ? '#475569' : 'linear-gradient(135deg, #ff1a75, #ef4444)', color: '#000', fontWeight: 900, cursor: createError ? 'not-allowed' : 'pointer' }}>{editingProfile ? 'Save Profile' : 'Create Profile'}</button>
          </form>
        </div>
      )}
    </div>
  );
}
