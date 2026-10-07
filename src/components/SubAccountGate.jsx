import { useEffect, useMemo, useState } from 'react';
import { Edit3, LockKeyhole, Plus, ShieldCheck, Trash2, UserPlus, X } from 'lucide-react';
import { useUser } from '../api/UserContext';
import { assetPath } from '../utils/assetPath';
import { fetchParentalPinCredential, saveParentalPinCredential } from '../api/db';
import { createParentalPinCredential, isValidParentalPin, verifyParentalPin } from '../utils/parentalPin';
import {
  MAX_SUB_ACCOUNTS,
  SUB_ACCOUNT_AGE_RATINGS,
  SUB_ACCOUNT_COLORS,
  clearActiveSubAccount,
  ensureSubAccounts,
  saveSubAccounts,
  setActiveSubAccount
} from '../utils/subAccounts';
import { withTimeout } from '../utils/withTimeout';

function ProfileAvatar({ profile, size = 132 }) {
  return (
    <div
      className="sub-account-avatar"
      style={{
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
        boxShadow: '0 24px 55px rgba(255,26,117,.20)',
        border: '4px solid rgba(255,26,117,.35)',
        overflow: 'hidden'
      }}
    >
      {profile.avatar
        ? <img src={profile.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : profile.name.charAt(0).toUpperCase()}
    </div>
  );
}

function SubAccountGateStyles() {
  return (
    <style>{`
      .sub-account-gate {
        position: relative;
        isolation: isolate;
      }
      .sub-account-gate::before,
      .sub-account-gate::after {
        content: "";
        position: fixed;
        z-index: -1;
        width: min(58vw, 620px);
        aspect-ratio: 1;
        border-radius: 50%;
        pointer-events: none;
        filter: blur(85px);
        opacity: .2;
        background: #ff1a75;
        animation: profile-glow 9s ease-in-out infinite alternate;
      }
      .sub-account-gate::before { top: -35%; left: -20%; }
      .sub-account-gate::after {
        right: -24%;
        bottom: -48%;
        background: #8b5cf6;
        animation-delay: -4s;
      }
      .sub-account-gate-content {
        position: relative;
        z-index: 1;
        animation: profile-screen-in .65s cubic-bezier(.2,.75,.25,1) both;
      }
      .sub-account-brand {
        animation: profile-brand-in .7s cubic-bezier(.2,.75,.25,1) both;
      }
      .sub-account-card {
        animation: profile-card-in .55s cubic-bezier(.2,.75,.25,1) both;
        animation-delay: var(--profile-delay, 0ms);
      }
      .sub-account-select {
        display: grid;
        justify-items: center;
        gap: 14px;
        width: 100%;
        padding: 8px;
        border: 0;
        border-radius: 22px;
        background: transparent;
        color: #fff;
        font: inherit;
        cursor: pointer;
        touch-action: manipulation;
        transition: transform .22s ease, background-color .22s ease, box-shadow .22s ease;
      }
      .sub-account-select:hover,
      .sub-account-select:focus-visible {
        transform: translateY(-7px);
        outline: none;
        background: rgba(255,255,255,.045);
        box-shadow: 0 14px 40px rgba(255,26,117,.12);
      }
      .sub-account-avatar {
        transition: transform .28s ease, box-shadow .28s ease, border-color .28s ease;
      }
      .sub-account-select:hover .sub-account-avatar,
      .sub-account-select:focus-visible .sub-account-avatar {
        transform: scale(1.06);
        border-color: rgba(255,26,117,.8) !important;
        box-shadow: 0 0 0 7px rgba(255,26,117,.1), 0 24px 55px rgba(255,26,117,.3) !important;
      }
      .sub-account-select:disabled {
        cursor: default;
      }
      .sub-account-select.profile-opening {
        pointer-events: none;
        animation: profile-open .42s cubic-bezier(.2,.75,.25,1) both;
      }
      .sub-account-select.profile-opening .sub-account-avatar {
        animation: profile-avatar-open .42s cubic-bezier(.2,.75,.25,1) both;
      }
      .sub-account-add {
        transition: transform .22s ease, filter .22s ease;
      }
      .sub-account-add:hover,
      .sub-account-add:focus-visible {
        transform: translateY(-7px) scale(1.035);
        filter: brightness(1.2);
        outline: none;
      }
      .sub-account-add > div {
        transition: border-color .22s ease, box-shadow .22s ease, background-color .22s ease;
      }
      .sub-account-add:hover > div,
      .sub-account-add:focus-visible > div {
        border-color: rgba(255,26,117,.75) !important;
        box-shadow: 0 0 0 7px rgba(255,26,117,.09), 0 24px 55px rgba(255,26,117,.25) !important;
        background: rgba(255,26,117,.12) !important;
      }
      .sub-account-action {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        min-height: 36px;
        padding: 8px 12px;
        border: 0;
        border-radius: 999px;
        background: rgba(255,255,255,.08);
        color: #fff;
        font-size: .72rem;
        font-weight: 900;
        cursor: pointer;
        touch-action: manipulation;
        transition: background-color .18s ease, transform .18s ease;
      }
      .sub-account-action:hover,
      .sub-account-action:focus-visible {
        transform: translateY(-2px);
        background: rgba(255,255,255,.16);
        outline: 2px solid rgba(255,255,255,.55);
        outline-offset: 2px;
      }
      .sub-account-action-remove {
        background: rgba(239,68,68,.16);
        color: #fecaca;
      }
      .sub-account-action-remove:hover,
      .sub-account-action-remove:focus-visible {
        background: rgba(239,68,68,.3);
      }
      .sub-account-modal-backdrop {
        animation: profile-backdrop-in .2s ease both;
      }
      .sub-account-modal {
        animation: profile-modal-in .28s cubic-bezier(.2,.75,.25,1) both;
      }
      @keyframes profile-glow {
        from { transform: translate3d(-3%, -2%, 0) scale(.92); }
        to { transform: translate3d(8%, 7%, 0) scale(1.08); }
      }
      @keyframes profile-screen-in {
        from { opacity: 0; transform: translateY(14px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes profile-brand-in {
        from { opacity: 0; transform: scale(.94); }
        to { opacity: 1; transform: scale(1); }
      }
      @keyframes profile-card-in {
        from { opacity: 0; transform: translateY(22px) scale(.94); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes profile-open {
        35% { opacity: 1; transform: scale(1.04); }
        100% { opacity: 0; transform: scale(1.18); }
      }
      @keyframes profile-avatar-open {
        100% { box-shadow: 0 0 0 18px rgba(255,26,117,0), 0 24px 55px rgba(255,26,117,.45); }
      }
      @keyframes profile-backdrop-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes profile-modal-in {
        from { opacity: 0; transform: translateY(14px) scale(.97); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      @media (prefers-reduced-motion: reduce) {
        .sub-account-gate::before,
        .sub-account-gate::after {
          animation-duration: 1ms;
        }
        .sub-account-gate-content,
        .sub-account-brand,
        .sub-account-card,
        .sub-account-select.profile-opening,
        .sub-account-select.profile-opening .sub-account-avatar,
        .sub-account-modal-backdrop,
        .sub-account-modal {
          animation-duration: 1ms;
          animation-delay: 0ms;
        }
        .sub-account-select,
        .sub-account-avatar,
        .sub-account-add,
        .sub-account-add > div,
        .sub-account-action {
          transition-duration: 1ms;
        }
      }
    `}</style>
  );
}

export default function SubAccountGate({ children }) {
  const {
    user,
    authLoading,
    activeSubAccount,
    setActiveSubAccountState,
    fetchSubAccounts,
    ensureMainSubAccount,
    createSubAccount,
    updateSubAccount,
    deleteSubAccount
  } = useUser();
  const [profiles, setProfiles] = useState([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);
  const [confirmedUserId, setConfirmedUserId] = useState(null);
  const [parentPinDialog, setParentPinDialog] = useState(null);
  const [parentPin, setParentPin] = useState('');
  const [parentPinConfirmation, setParentPinConfirmation] = useState('');
  const [parentPinMessage, setParentPinMessage] = useState('');
  const [isSavingParentPin, setIsSavingParentPin] = useState(false);
  const [parentAuthorizationExpiresAt, setParentAuthorizationExpiresAt] = useState(0);
  const [createMessage, setCreateMessage] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [newName, setNewName] = useState('');
  const [newAvatar, setNewAvatar] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [newAgeRating, setNewAgeRating] = useState('adults');
  const [newColor, setNewColor] = useState(SUB_ACCOUNT_COLORS[0]);

  useEffect(() => {
    let cancelled = false;

    async function loadProfiles() {
      setConfirmedUserId(null);

      if (!user?.id) {
        setProfiles([]);
        setIsLoadingProfiles(false);
        clearActiveSubAccount();
        setActiveSubAccountState(null);
        return;
      }

      setIsLoadingProfiles(true);
      setActiveSubAccountState(null);
      const cachedProfiles = ensureSubAccounts(user);
      setProfiles(cachedProfiles);
      let nextProfiles = [];

      try {
        await withTimeout(ensureMainSubAccount(), 5000, 'Profile setup timed out.');
        nextProfiles = await withTimeout(fetchSubAccounts(), 5000, 'Profile loading timed out.');
      } catch {
        nextProfiles = cachedProfiles;
      }

      if (cancelled) return;
      if (!nextProfiles.length) nextProfiles = cachedProfiles;
      setProfiles(nextProfiles);
      saveSubAccounts(user.id, nextProfiles);
      setIsLoadingProfiles(false);
    }

    loadProfiles();
    return () => { cancelled = true; };
  }, [user?.id, setActiveSubAccountState]);

  const canCreate = profiles.length < MAX_SUB_ACCOUNTS;
  const createError = useMemo(() => {
    if (!newName.trim()) return 'Enter a profile name.';
    if (newName.trim().length > 18) return 'Use 18 characters or less.';
    if (profiles.some(profile =>
      profile.id !== editingProfile?.id &&
      profile.name.toLowerCase() === newName.trim().toLowerCase()
    )) return 'That profile name already exists.';
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
    if (profile.ageRating === 'kids') {
      void requestParentAuthorization(() => showEditProfile(profile));
      return;
    }
    showEditProfile(profile);
  }

  function showEditProfile(profile) {
    setEditingProfile(profile);
    setNewName(profile.name || '');
    setNewAvatar(profile.avatar || '');
    setNewAgeRating(profile.ageRating || 'adults');
    setNewColor(profile.color || SUB_ACCOUNT_COLORS[0]);
    setCreateMessage('');
    setShowCreate(true);
  }

  async function deleteProfile(profile) {
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
      const replacement = nextProfiles[0] || null;
      if (replacement) {
        setActiveSubAccount(user.id, replacement);
        setActiveSubAccountState(replacement);
      } else {
        clearActiveSubAccount();
        setActiveSubAccountState(null);
      }
    }
  }

  function handleDeleteProfile(profile) {
    if (profile.ageRating === 'kids') {
      void requestParentAuthorization(() => deleteProfile(profile));
      return;
    }
    void deleteProfile(profile);
  }

  function chooseProfile(profile) {
    const activateProfile = () => {
      setActiveSubAccount(user.id, profile);
      setActiveSubAccountState(profile);
      setConfirmedUserId(user.id);
    };
    if (profile.ageRating !== 'kids' && profiles.some(item => item.ageRating === 'kids')) {
      void requestParentAuthorization(activateProfile);
      return;
    }
    activateProfile();
  }

  function openProfile(profile) {
    chooseProfile(profile);
  }

  async function requestParentAuthorization(action, { changePin = false } = {}) {
    if (!changePin && parentAuthorizationExpiresAt > Date.now()) {
      await action();
      return;
    }

    setParentPinMessage('');
    setParentPin('');
    setParentPinConfirmation('');
    setIsSavingParentPin(true);
    try {
      const result = await fetchParentalPinCredential(user.id);
      if (!result.success) {
        setCreateMessage(result.message || 'Could not check parent controls.');
        return;
      }

      const credential = result.credential;
      const mode = changePin
        ? (credential ? 'change-verify' : 'setup')
        : (credential ? 'verify' : 'setup');
      setParentPinDialog({ mode, credential, action });
    } catch (error) {
      setCreateMessage(error.message || 'Could not check parent controls.');
    } finally {
      setIsSavingParentPin(false);
    }
  }

  async function submitParentPin(event) {
    event.preventDefault();
    if (!parentPinDialog || isSavingParentPin) return;

    if (parentPinDialog.mode === 'setup') {
      if (!isValidParentalPin(parentPin)) {
        setParentPinMessage('Use a PIN with 6 to 12 digits.');
        return;
      }
      if (parentPin !== parentPinConfirmation) {
        setParentPinMessage('The PIN entries do not match.');
        return;
      }
      setIsSavingParentPin(true);
      try {
        const credential = await createParentalPinCredential(parentPin);
        const result = await saveParentalPinCredential(user.id, credential);
        if (!result.success) throw new Error(result.message || 'Could not save parent PIN.');
        setParentAuthorizationExpiresAt(Date.now() + 5 * 60 * 1000);
        setParentPinDialog(null);
        setParentPin('');
        setParentPinConfirmation('');
        await parentPinDialog.action?.();
      } catch (error) {
        setParentPinMessage(error.message || 'Could not save parent PIN.');
      } finally {
        setIsSavingParentPin(false);
      }
      return;
    }

    if (!isValidParentalPin(parentPin)) {
      setParentPinMessage('Enter your 6 to 12 digit parent PIN.');
      return;
    }
    setIsSavingParentPin(true);
    try {
      const valid = await verifyParentalPin(parentPin, parentPinDialog.credential);
      if (!valid) {
        setParentPinMessage('That parent PIN is incorrect.');
        return;
      }
      if (parentPinDialog.mode === 'change-verify') {
        setParentPinDialog({ ...parentPinDialog, mode: 'setup' });
        setParentPin('');
        setParentPinConfirmation('');
        setParentPinMessage('Enter and confirm your new parent PIN.');
        return;
      }
      setParentAuthorizationExpiresAt(Date.now() + 5 * 60 * 1000);
      setParentPinDialog(null);
      setParentPin('');
      await parentPinDialog.action?.();
    } catch (error) {
      setParentPinMessage(error.message || 'Could not verify parent PIN.');
    } finally {
      setIsSavingParentPin(false);
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    if ((!editingProfile && !canCreate) || createError) return;

    if (newAgeRating === 'kids' || editingProfile?.ageRating === 'kids') {
      await requestParentAuthorization(() => persistProfile());
      return;
    }
    await persistProfile();
  }

  async function persistProfile() {
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
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData
      });
      const result = await response.json();
      if (!response.ok || !result.secure_url) {
        throw new Error(result.error?.message || 'Upload failed.');
      }
      setNewAvatar(result.secure_url);
    } catch (error) {
      setCreateMessage(error.message || 'Could not upload profile picture.');
    } finally {
      setIsUploadingAvatar(false);
      event.target.value = '';
    }
  }

  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 32,
        background: 'radial-gradient(circle at top, rgba(255,26,117,.20), transparent 32%),linear-gradient(135deg,#050505,#16030c 55%,#09090f)',
        color: '#fff',
        textAlign: 'center'
      }}>
        <div style={{ display: 'grid', gap: 14, justifyItems: 'center' }}>
          <img src={assetPath('logo.png')} alt="AnimeVault" style={{ height: 70 }} />
          <h1 style={{ margin: 0, fontSize: 'clamp(2rem,6vw,4rem)', fontWeight: 950 }}>
            <span style={{ color: '#ff1a75' }}>Anime</span>Vault
          </h1>
          <p style={{ margin: 0, color: '#fda4af', fontWeight: 800 }}>Loading your watching profiles...</p>
        </div>
      </div>
    );
  }

  if (!user || user.is_guest) return children;
  if (confirmedUserId === user.id && activeSubAccount?.id) return children;

  if (isLoadingProfiles) {
    return (
      <>
        <SubAccountGateStyles />
        <div
          className="sub-account-gate sub-account-gate-loading"
          role="status"
          aria-live="polite"
          style={{
            minHeight: '100vh',
            display: 'grid',
            placeItems: 'center',
            padding: 24,
            background: 'radial-gradient(circle at top, rgba(255,26,117,.20), transparent 32%),linear-gradient(135deg,#050505,#16030c 55%,#09090f)',
            color: '#fff',
            textAlign: 'center'
          }}
        >
          <div className="sub-account-gate-content" style={{ display: 'grid', gap: 12, justifyItems: 'center' }}>
            <img src={assetPath('logo.png')} alt="AnimeVault" style={{ height: 56 }} />
            <h1 style={{ margin: 0, fontSize: 'clamp(1.9rem,9vw,3.5rem)', fontWeight: 950 }}>
              <span style={{ color: '#ff1a75' }}>Anime</span>Vault
            </h1>
            <p style={{ margin: 0, color: '#fda4af', fontWeight: 800 }}>Loading your watching profile...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SubAccountGateStyles />
      <div
        className="sub-account-gate"
        style={{
          minHeight: '100vh',
          background: 'radial-gradient(circle at top, rgba(255,26,117,.20), transparent 32%),linear-gradient(135deg,#050505,#16030c 55%,#09090f)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'clamp(24px,6vw,36px) 16px'
        }}
      >
        <div className="sub-account-gate-content" style={{ width: 'min(980px,100%)', textAlign: 'center' }}>
          <h1 className="sub-account-brand" style={{
            fontSize: 'clamp(2.5rem,7vw,4.5rem)',
            margin: '0 0 12px',
            fontWeight: 950
          }}>
            <span style={{ color: '#ff1a75' }}>Anime</span>Vault
          </h1>
          <p style={{
            color: '#f8fafc',
            fontSize: 'clamp(1.1rem,4vw,1.45rem)',
            margin: '0 0 clamp(34px,8vw,70px)'
          }}>
            Who's watching?
          </p>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            gap: 'clamp(20px,5vw,54px)',
            flexWrap: 'wrap'
          }}>
            {profiles.map((profile, index) => {
              const avatarSize = typeof window !== 'undefined' && window.innerWidth < 520 ? 104 : 132;
              return (
                <div
                  key={profile.id}
                  className="sub-account-card"
                  style={{ width: 152, '--profile-delay': `${index * 85}ms` }}
                >
                  <button
                    type="button"
                    className="sub-account-select"
                    onClick={() => openProfile(profile)}
                    aria-label={`Open ${profile.name}'s profile`}
                  >
                    <ProfileAvatar profile={profile} size={avatarSize} />
                    <span style={{ fontSize: '1.15rem', fontWeight: 800, overflowWrap: 'anywhere' }}>
                      {profile.name}
                    </span>
                    {profile.ageRating === 'kids' && (
                      <span style={{ marginTop: -10, color: '#fbbf24', fontSize: '.78rem', fontWeight: 900 }}>
                        Kids 0-12
                      </span>
                    )}
                  </button>
                  <div style={{
                    display: 'flex',
                    gap: 8,
                    marginTop: 6,
                    flexWrap: 'wrap',
                    justifyContent: 'center'
                  }}>
                    <button
                      type="button"
                      className="sub-account-action"
                      onClick={() => openEditProfile(profile)}
                    >
                      <Edit3 size={12} /> Edit
                    </button>
                    {profiles.length > 1 && (
                      <button
                        type="button"
                        className="sub-account-action sub-account-action-remove"
                        onClick={() => handleDeleteProfile(profile)}
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {canCreate && (
              <button
                type="button"
                className="sub-account-add"
                onClick={openCreateProfile}
                style={{
                  width: 152,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#fff',
                  display: 'grid',
                  gap: 14,
                  justifyItems: 'center',
                  padding: 8,
                  font: 'inherit',
                  touchAction: 'manipulation'
                }}
              >
                <div style={{
                  width: typeof window !== 'undefined' && window.innerWidth < 520 ? 104 : 132,
                  height: typeof window !== 'undefined' && window.innerWidth < 520 ? 104 : 132,
                  borderRadius: '50%',
                  background: 'rgba(17,24,39,.82)',
                  display: 'grid',
                  placeItems: 'center',
                  boxShadow: '0 24px 55px rgba(255,26,117,.16)',
                  border: '4px solid rgba(255,26,117,.2)'
                }}>
                  <Plus size={44} />
                </div>
                <span style={{ fontSize: '1.15rem', fontWeight: 800 }}>Add Profile</span>
              </button>
            )}
          </div>
          <p style={{ marginTop: 42, color: '#fda4af', fontSize: '.95rem', overflowWrap: 'anywhere' }}>
            {profiles.length}/{MAX_SUB_ACCOUNTS} profiles linked to {user.username}
          </p>
          {createMessage && <p role="alert" style={{ color: '#fca5a5' }}>{createMessage}</p>}
          <button
            type="button"
            onClick={() => { void requestParentAuthorization(() => {}, { changePin: true }); }}
            disabled={isSavingParentPin}
            style={{
              marginTop: 8,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              minHeight: 44,
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,.16)',
              background: 'rgba(255,255,255,.06)',
              color: '#fff',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            <ShieldCheck size={16} /> Set or change parent PIN
          </button>
        </div>

        {parentPinDialog && (
          <div
            className="sub-account-modal-backdrop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="parent-pin-title"
            onClick={() => {
              setParentPinDialog(null);
              setParentPin('');
              setParentPinConfirmation('');
            }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 20,
              background: 'rgba(0,0,0,.78)',
              display: 'grid',
              placeItems: 'center',
              padding: 20
            }}
          >
            <form
              className="sub-account-modal"
              onSubmit={submitParentPin}
              onClick={event => event.stopPropagation()}
              style={{
                width: 'min(420px,100%)',
                background: '#09090f',
                border: '1px solid rgba(255,26,117,.3)',
                borderRadius: 18,
                padding: 24,
                color: '#fff',
                boxShadow: '0 30px 80px rgba(0,0,0,.55)'
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setParentPinDialog(null);
                  setParentPin('');
                  setParentPinConfirmation('');
                }}
                aria-label="Close parent PIN dialog"
                style={{ float: 'right', background: 'transparent', color: '#fda4af', border: 0, cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
              <h2 id="parent-pin-title" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 0 }}>
                <LockKeyhole size={22} />
                {parentPinDialog.mode === 'verify'
                  ? 'Parent approval'
                  : parentPinDialog.mode === 'change-verify'
                    ? 'Verify parent PIN'
                    : 'Set parent PIN'}
              </h2>
              <p style={{ color: '#cbd5e1', lineHeight: 1.5 }}>
                {parentPinDialog.mode === 'verify'
                  ? 'Enter the parent PIN to open an adult profile or manage a kids profile.'
                  : parentPinDialog.mode === 'change-verify'
                    ? 'Verify the current PIN before changing parent controls.'
                    : 'Create a 6–12 digit PIN. Parent approval is required to open adult profiles when kids profiles are enabled.'}
              </p>
              <label style={{ display: 'grid', gap: 7, margin: '16px 0', fontWeight: 750 }}>
                {parentPinDialog.mode === 'setup' ? 'New parent PIN' : 'Parent PIN'}
                <input
                  autoFocus
                  inputMode="numeric"
                  autoComplete="new-password"
                  type="password"
                  pattern="[0-9]{6,12}"
                  maxLength={12}
                  value={parentPin}
                  onChange={event => setParentPin(event.target.value.replace(/\D/g, '').slice(0, 12))}
                  aria-label="Parent PIN"
                  style={{
                    width: '100%',
                    minHeight: 46,
                    boxSizing: 'border-box',
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,.18)',
                    background: '#111827',
                    color: '#fff',
                    fontSize: 18,
                    letterSpacing: 4
                  }}
                />
              </label>
              {parentPinDialog.mode === 'setup' && (
                <label style={{ display: 'grid', gap: 7, margin: '16px 0', fontWeight: 750 }}>
                  Confirm parent PIN
                  <input
                    inputMode="numeric"
                    autoComplete="new-password"
                    type="password"
                    pattern="[0-9]{6,12}"
                    maxLength={12}
                    value={parentPinConfirmation}
                    onChange={event => setParentPinConfirmation(event.target.value.replace(/\D/g, '').slice(0, 12))}
                    aria-label="Confirm parent PIN"
                    style={{
                      width: '100%',
                      minHeight: 46,
                      boxSizing: 'border-box',
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: '1px solid rgba(255,255,255,.18)',
                      background: '#111827',
                      color: '#fff',
                      fontSize: 18,
                      letterSpacing: 4
                    }}
                  />
                </label>
              )}
              {parentPinMessage && <p role="alert" style={{ color: '#fca5a5' }}>{parentPinMessage}</p>}
              <button
                type="submit"
                disabled={isSavingParentPin}
                style={{
                  width: '100%',
                  minHeight: 46,
                  border: 0,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg,#ff1a75,#ef4444)',
                  color: '#000',
                  fontWeight: 900,
                  cursor: isSavingParentPin ? 'wait' : 'pointer'
                }}
              >
                {isSavingParentPin ? 'Checking…' : parentPinDialog.mode === 'setup' ? 'Save PIN' : 'Continue'}
              </button>
            </form>
          </div>
        )}

        {showCreate && (
          <div
            className="sub-account-modal-backdrop"
            onClick={() => { setShowCreate(false); resetProfileForm(); }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 10,
              background: 'rgba(0,0,0,.72)',
              display: 'grid',
              placeItems: 'center',
              padding: 20
            }}
          >
            <form
              className="sub-account-modal"
              onSubmit={saveProfile}
              onClick={event => event.stopPropagation()}
              style={{
                width: 'min(430px,100%)',
                maxHeight: 'calc(100vh - 40px)',
                overflowY: 'auto',
                background: '#09090f',
                border: '1px solid rgba(255,26,117,.28)',
                borderRadius: 20,
                padding: 24,
                textAlign: 'left',
                boxShadow: '0 30px 80px rgba(255,26,117,.18)'
              }}
            >
              <button
                type="button"
                onClick={() => { setShowCreate(false); resetProfileForm(); }}
                aria-label="Close profile form"
                style={{
                  float: 'right',
                  background: 'transparent',
                  color: '#fda4af',
                  border: 'none',
                  cursor: 'pointer',
                  minWidth: 40,
                  minHeight: 40
                }}
              >
                <X size={18} />
              </button>
              <h2 style={{ marginTop: 0, display: 'flex', gap: 10, alignItems: 'center' }}>
                <UserPlus size={22} /> {editingProfile ? 'Edit Profile' : 'Add Profile'}
              </h2>
              <input
                autoFocus
                maxLength={18}
                value={newName}
                onChange={event => setNewName(event.target.value)}
                placeholder="Profile name"
                aria-label="Profile name"
                style={{
                  width: '100%',
                  padding: '13px 14px',
                  borderRadius: 12,
                  border: '1px solid rgba(255,26,117,.24)',
                  background: 'rgba(255,255,255,.06)',
                  color: '#fff',
                  marginBottom: 12,
                  boxSizing: 'border-box'
                }}
              />
              <label style={{ display: 'grid', gap: 8, marginBottom: 16, color: '#f8fafc', fontWeight: 800 }}>
                Profile picture
                {newAvatar && (
                  <ProfileAvatar profile={{ name: newName || 'Profile', avatar: newAvatar, color: newColor }} size={72} />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={isUploadingAvatar}
                  style={{ width: '100%', color: '#fff' }}
                />
                {isUploadingAvatar && (
                  <span style={{ color: '#fda4af', fontSize: '.85rem' }}>Uploading profile picture...</span>
                )}
              </label>
              <label style={{ display: 'grid', gap: 8, marginBottom: 16, color: '#f8fafc', fontWeight: 800 }}>
                Age rating
                <select
                  value={newAgeRating}
                  onChange={event => setNewAgeRating(event.target.value)}
                  style={{
                    width: '100%',
                    padding: '13px 14px',
                    borderRadius: 12,
                    border: '1px solid rgba(255,26,117,.24)',
                    background: '#111827',
                    color: '#fff',
                    boxSizing: 'border-box'
                  }}
                >
                  {SUB_ACCOUNT_AGE_RATINGS.map(option => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </label>
              <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                {SUB_ACCOUNT_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewColor(color)}
                    aria-label={`Use ${color}`}
                    aria-pressed={newColor === color}
                    style={{
                      width: 40,
                      height: 40,
                      flex: '0 0 40px',
                      borderRadius: '50%',
                      background: color,
                      border: newColor === color ? '3px solid #fff' : '3px solid transparent',
                      cursor: 'pointer',
                      touchAction: 'manipulation'
                    }}
                  />
                ))}
              </div>
              {(createError || createMessage) && (
                <p role="alert" style={{ color: '#fca5a5', fontSize: '.85rem' }}>
                  {createError || createMessage}
                </p>
              )}
              <button
                disabled={Boolean(createError) || isUploadingAvatar}
                style={{
                  width: '100%',
                  padding: '13px 16px',
                  minHeight: 46,
                  borderRadius: 12,
                  border: 'none',
                  background: createError ? '#475569' : 'linear-gradient(135deg,#ff1a75,#ef4444)',
                  color: '#000',
                  fontWeight: 900,
                  cursor: createError ? 'not-allowed' : 'pointer',
                  touchAction: 'manipulation'
                }}
              >
                {editingProfile ? 'Save Profile' : 'Create Profile'}
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
