import { useEffect, useMemo, useState } from 'react';
import { Plus, UserPlus, X } from 'lucide-react';
import { useUser } from '../api/UserContext';
import AuthModal from './AuthModal';
import {
  MAX_SUB_ACCOUNTS,
  SUB_ACCOUNT_COLORS,
  clearActiveSubAccount,
  ensureSubAccounts,
  getActiveSubAccount,
  saveSubAccounts,
  setActiveSubAccount
} from '../utils/subAccounts';

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
    createSubAccount
  } = useUser();
  const [profiles, setProfiles] = useState([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const [createMessage, setCreateMessage] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAvatar, setNewAvatar] = useState('');
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
      const savedActive = getActiveSubAccount(user.id);
      const validActive = savedActive && nextProfiles.some(profile => profile.id === savedActive.id);
      setActiveSubAccountState(validActive ? savedActive : null);
      setIsLoadingProfiles(false);
    }

    loadProfiles();
    return () => { cancelled = true; };
  }, [user?.id, user?.username, user?.avatar, setActiveSubAccountState]);

  const canCreate = profiles.length < MAX_SUB_ACCOUNTS;
  const createError = useMemo(() => {
    if (!newName.trim()) return 'Enter a profile name.';
    if (newName.trim().length > 18) return 'Use 18 characters or less.';
    if (profiles.some(profile => profile.name.toLowerCase() === newName.trim().toLowerCase())) return 'That profile name already exists.';
    return '';
  }, [newName, profiles]);

  function chooseProfile(profile) {
    setActiveSubAccount(user.id, profile);
    setActiveSubAccountState(profile);
  }

  async function handleCreate(event) {
    event.preventDefault();
    if (!canCreate || createError) return;
    setCreateMessage('');
    const nextProfile = {
      id: `${user.id}-profile-${Date.now()}`,
      name: newName.trim(),
      color: newColor,
      avatar: newAvatar.trim() || null,
      isMain: profiles.length === 0,
      createdAt: new Date().toISOString()
    };

    const result = await createSubAccount(nextProfile);
    if (!result.success) {
      setCreateMessage(result.message || 'Could not save profile to the database.');
      return;
    }

    const savedProfile = result.profile || nextProfile;
    const nextProfiles = saveSubAccounts(user.id, [...profiles, savedProfile]);
    setProfiles(nextProfiles);
    setNewName('');
    setNewAvatar('');
    setNewColor(SUB_ACCOUNT_COLORS[nextProfiles.length % SUB_ACCOUNT_COLORS.length]);
    setShowCreate(false);
    chooseProfile(savedProfile);
  }

  if (authLoading) return children;

  if (!user) {
    return (
      <>
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '32px', background: 'radial-gradient(circle at top, rgba(255,26,117,0.22), transparent 34%), linear-gradient(135deg, #050505, #13040a 52%, #09090f)', color: '#fff', textAlign: 'center' }}>
          <div style={{ maxWidth: 640, padding: 28, border: '1px solid rgba(255, 26, 117, 0.22)', borderRadius: 28, background: 'rgba(10, 10, 16, 0.62)', boxShadow: '0 30px 80px rgba(255, 26, 117, 0.14)' }}>
            <img src="/logo.png" alt="AnimeVault" style={{ height: 74, marginBottom: 24 }} />
            <h1 style={{ fontSize: 'clamp(2.4rem, 7vw, 5.5rem)', lineHeight: 1, margin: '0 0 16px', fontWeight: 950 }}>Sign up to watch AnimeVault.</h1>
            <p style={{ color: '#cbd5e1', fontSize: '1.1rem', marginBottom: 28 }}>Create one main account with one email, then add up to five synced watching profiles for everyone in your home.</p>
            <button onClick={() => { setAuthTab('signup'); setShowAuthModal(true); }} style={{ border: 'none', borderRadius: 999, padding: '14px 28px', fontWeight: 900, background: 'linear-gradient(135deg, #ff1a75, #ef4444)', color: '#000', cursor: 'pointer', fontSize: '1rem', boxShadow: '0 0 24px rgba(255, 26, 117, 0.35)' }}>Sign Up to Watch</button>
            <button onClick={() => { setAuthTab('login'); setShowAuthModal(true); }} style={{ marginLeft: 12, border: '1px solid rgba(255,26,117,0.35)', borderRadius: 999, padding: '13px 24px', fontWeight: 800, background: 'rgba(255,26,117,0.08)', color: '#fff', cursor: 'pointer' }}>Sign In</button>
          </div>
        </div>
        <AuthModal />
      </>
    );
  }

  if (hasActiveProfile) return children;

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(circle at top, rgba(255,26,117,0.20), transparent 32%), linear-gradient(135deg, #050505, #16030c 55%, #09090f)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '36px 20px' }}>
      <div style={{ width: 'min(980px, 100%)', textAlign: 'center' }}>
        <h1 style={{ fontSize: 'clamp(2.5rem, 7vw, 4.5rem)', margin: '0 0 12px', fontWeight: 950 }}><span style={{ color: '#ff1a75' }}>Anime</span>Vault</h1>
        <p style={{ color: '#f8fafc', fontSize: '1.45rem', margin: '0 0 70px' }}>{isLoadingProfiles ? 'Loading profiles...' : "Who's watching?"}</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(24px, 6vw, 70px)', flexWrap: 'wrap' }}>
          {profiles.map(profile => (
            <button key={profile.id} onClick={() => chooseProfile(profile)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff', display: 'grid', gap: 18, justifyItems: 'center' }}>
              <ProfileAvatar profile={profile} />
              <span style={{ fontSize: '1.15rem', fontWeight: 800 }}>{profile.name}</span>
            </button>
          ))}
          {canCreate && (
            <button onClick={() => setShowCreate(true)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff', display: 'grid', gap: 18, justifyItems: 'center' }}>
              <div style={{ width: 132, height: 132, borderRadius: '50%', background: 'rgba(17, 24, 39, 0.82)', display: 'grid', placeItems: 'center', boxShadow: '0 24px 55px rgba(255,26,117,0.16)', border: '4px solid rgba(255, 26, 117, 0.2)' }}><Plus size={44} /></div>
              <span style={{ fontSize: '1.15rem', fontWeight: 800 }}>Add Profile</span>
            </button>
          )}
        </div>
        <p style={{ marginTop: 42, color: '#fda4af', fontSize: '0.95rem' }}>{profiles.length}/{MAX_SUB_ACCOUNTS} profiles linked to {user.username}</p>
      </div>

      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', display: 'grid', placeItems: 'center', padding: 20 }} onClick={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} onClick={event => event.stopPropagation()} style={{ width: 'min(430px, 100%)', background: '#09090f', border: '1px solid rgba(255,26,117,0.28)', borderRadius: 20, padding: 24, textAlign: 'left', boxShadow: '0 30px 80px rgba(255,26,117,0.18)' }}>
            <button type="button" onClick={() => setShowCreate(false)} style={{ float: 'right', background: 'transparent', color: '#fda4af', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            <h2 style={{ marginTop: 0, display: 'flex', gap: 10, alignItems: 'center' }}><UserPlus size={22} /> Add Profile</h2>
            <input autoFocus value={newName} onChange={event => setNewName(event.target.value)} placeholder="Profile name" style={{ width: '100%', padding: '13px 14px', borderRadius: 12, border: '1px solid rgba(255,26,117,0.24)', background: 'rgba(255,255,255,0.06)', color: '#fff', marginBottom: 12 }} />
            <input value={newAvatar} onChange={event => setNewAvatar(event.target.value)} placeholder="Profile picture URL (optional)" style={{ width: '100%', padding: '13px 14px', borderRadius: 12, border: '1px solid rgba(255,26,117,0.24)', background: 'rgba(255,255,255,0.06)', color: '#fff', marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>{SUB_ACCOUNT_COLORS.map(color => <button key={color} type="button" onClick={() => setNewColor(color)} aria-label={`Use ${color}`} style={{ width: 34, height: 34, borderRadius: '50%', background: color, border: newColor === color ? '3px solid #fff' : '3px solid transparent', cursor: 'pointer' }} />)}</div>
            {(createError || createMessage) && <p style={{ color: '#fca5a5', fontSize: '0.85rem' }}>{createError || createMessage}</p>}
            <button disabled={Boolean(createError)} style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: 'none', background: createError ? '#475569' : 'linear-gradient(135deg, #ff1a75, #ef4444)', color: '#000', fontWeight: 900, cursor: createError ? 'not-allowed' : 'pointer' }}>Create Profile</button>
          </form>
        </div>
      )}
    </div>
  );
}
