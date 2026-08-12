import { useState } from 'react';
import { X, Heart, Clock, User, LogOut, Trash2, Calendar, Film, Repeat } from 'lucide-react';
import { useUser } from '../api/UserContext';
import { Link } from 'react-router-dom';
import { getSettings } from '../api/settings';
import { clearActiveSubAccount } from '../utils/subAccounts';

export default function ProfileModal({ isOpen, onClose }) {
  const { user, history: userHistory, likes, logout, clearHistory, activeSubAccount, setActiveSubAccountState } = useUser();
  const settings = getSettings();
  const showHistoryTab = !settings.hideHistory;
  const [activeTab, setActiveTab] = useState(showHistoryTab ? 'likes' : 'likes'); // history tab available only when allowed

  if (!isOpen || !user) return null;

  return (
    <div className="profile-overlay" style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(5, 5, 10, 0.85)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9998, padding: '20px', transition: 'all 0.3s ease'
    }} onClick={onClose}>
      
      <div className="profile-card" style={{
        background: 'rgba(15, 15, 25, 0.75)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 26, 117, 0.2)',
        borderRadius: '16px',
        padding: '30px',
        width: '100%',
        maxWidth: '720px',
        maxHeight: '85vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        boxShadow: '0 8px 32px 0 rgba(255, 26, 117, 0.15), inset 0 0 15px rgba(255, 255, 255, 0.05)',
        animation: 'profileScaleIn 0.3s ease-out'
      }} onClick={e => e.stopPropagation()}>
        
        {/* Close Button */}
        <button onClick={onClose} style={{
          position: 'absolute', top: '20px', right: '20px',
          background: 'none', color: 'var(--text-secondary)',
          cursor: 'pointer', padding: '4px', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s ease', border: '1px solid rgba(255,255,255,0.05)'
        }} onMouseEnter={e => e.currentTarget.style.color = '#fff'}
           onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
          <X size={18} />
        </button>

        {/* User Info Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '28px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '20px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #ff1a75, #ff6b9d)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#000', fontSize: '1.6rem', fontWeight: '900',
            boxShadow: '0 0 15px rgba(255, 26, 117, 0.4)'
          }}>
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {user.username}
            </h2>
            <div style={{ display: 'flex', gap: '16px', marginTop: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={14} /> Vault Citizen
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Heart size={14} style={{ color: '#ff1a75' }} /> {likes.length} Likes
              </span>
            </div>
          </div>
          <button onClick={() => { clearActiveSubAccount(); setActiveSubAccountState(null); onClose(); }} style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '8px 14px', fontSize: '0.8rem', fontWeight: '800', borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.16)', background: 'rgba(255, 255, 255, 0.06)',
            color: '#fff', cursor: 'pointer', transition: 'all 0.2s ease'
          }}>
            <Repeat size={14} /> Switch Profile{activeSubAccount?.name ? ` (${activeSubAccount.name})` : ''}
          </button>
          <button onClick={() => { logout(); onClose(); }} style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '8px 14px', fontSize: '0.8rem', fontWeight: '800', borderRadius: '8px',
            border: '1px solid rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.08)',
            color: '#ef4444', cursor: 'pointer', transition: 'all 0.2s ease'
          }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.18)'}
             onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}>
            <LogOut size={14} /> Logout
          </button>
        </div>

        {/* Tab Controls */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <button onClick={() => setActiveTab('likes')} style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '8px 16px', fontSize: '0.85rem', fontWeight: '800', borderRadius: '8px',
            border: 'none', cursor: 'pointer', transition: 'all 0.2s ease',
            background: activeTab === 'likes' ? 'var(--brand-color)' : 'rgba(255,255,255,0.03)',
            color: activeTab === 'likes' ? '#000' : 'var(--text-secondary)'
          }}>
            <Heart size={14} /> My Liked Items ({likes.length})
          </button>
          
          {showHistoryTab && (
            <button onClick={() => setActiveTab('history')} style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', fontSize: '0.85rem', fontWeight: '800', borderRadius: '8px',
              border: 'none', cursor: 'pointer', transition: 'all 0.2s ease',
              background: activeTab === 'history' ? 'var(--brand-color)' : 'rgba(255,255,255,0.03)',
              color: activeTab === 'history' ? '#000' : 'var(--text-secondary)'
            }}>
              <Clock size={14} /> Watch History ({userHistory.length})
            </button>
          )}

          {showHistoryTab && activeTab === 'history' && userHistory.length > 0 && (
            <button onClick={clearHistory} style={{
              marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px',
              padding: '8px 12px', fontSize: '0.8rem', fontWeight: '800', borderRadius: '8px',
              border: 'none', background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444',
              cursor: 'pointer', transition: 'all 0.2s'
            }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.18)'}
               onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}>
              <Trash2 size={13} /> Clear
            </button>
          )}
        </div>

        {/* Tab Contents */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
          {activeTab === 'likes' ? (
            likes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-tertiary)' }}>
                <Heart size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                <p>No liked items yet. Start adding items to your favorites!</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '16px' }}>
                {likes.map((item, idx) => (
                  <Link key={idx} to={item.media_type === 'manga' ? `/manga/${item.media_id}` : (item.media_type === 'movie' || item.media_type === 'series' || item.media_type === 'tv' ? `/watch/${item.media_type}/${item.media_id}` : `/anime/${item.media_id}`)} onClick={onClose} style={{ textDecoration: 'none', group: 'true' }}>
                    <div style={{
                      position: 'relative', borderRadius: '10px', overflow: 'hidden',
                      aspectRatio: '2/3', background: 'var(--glass)', border: '1px solid rgba(255,255,255,0.05)',
                      transition: 'all 0.3s ease'
                    }} onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.borderColor = 'var(--brand-color)'; }}
                       onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}>
                      <img src={item.media_poster} alt={item.media_title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, width: '100%',
                        background: 'linear-gradient(transparent, rgba(0,0,0,0.95))',
                        padding: '10px 8px 8px', fontSize: '0.75rem', fontWeight: '700', color: '#fff',
                        textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                      }}>{item.media_title}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )
          ) : (
            userHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-tertiary)' }}>
                <Clock size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                <p>Your watch history is empty. Start streaming now!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {userHistory.map((item, idx) => (
                  <Link key={idx} to={item.media_type === 'movie' || item.media_type === 'series' || item.media_type === 'tv' ? `/watch/${item.media_type}/${item.media_id}` : `/anime/${item.media_id}`} onClick={onClose} style={{ textDecoration: 'none' }}>
                    <div style={{
                      display: 'flex', gap: '14px', padding: '10px', borderRadius: '10px',
                      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
                      transition: 'all 0.2s ease', alignItems: 'center'
                    }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255, 26, 117, 0.3)'; }}
                       onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; }}>
                      <img src={item.media_poster} alt={item.media_title} style={{ width: '40px', height: '56px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#fff' }}>{item.media_title}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '4px', textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Film size={10} /> {item.media_type}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                        {new Date(item.watched_at).toLocaleDateString()}
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
        @keyframes profileScaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
