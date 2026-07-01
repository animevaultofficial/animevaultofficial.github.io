import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, UserX, Shield, Trash2, RefreshCw, Loader,
  BadgeCheck, AlertTriangle, CheckCircle, Database, Settings, Users,
  BarChart3, Server, Bookmark, LogOut, MessageSquare, Image, Edit3, X,
  Terminal, List, ChevronLeft, ChevronRight, Save, Link, TrendingUp, Plus
} from 'lucide-react';
import { useUser } from '../api/UserContext';
import {
  listAllUsers, searchUsersAdmin, toggleUserVerification, toggleUserAdmin,
  deleteUserAccount, getSiteStats, getDatabaseStats, getSystemInfo,
  bulkDeleteUsers, updateUsername, getUserDetails, getRecentStories,
  getRecentNotes, getRecentComments, deleteStory, deleteNote, deleteComment,
  updateSiteSettings, fetchSiteSettings, getActiveSessions, revokeSession,
  getTrendingBoard, getAllTrendingItems, addTrendingItem, updateTrendingItem, deleteTrendingItem
} from '../api/db';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'content', label: 'Content', icon: Image },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'system', label: 'System', icon: Server },
  { id: 'sessions', label: 'Sessions', icon: LogOut },
];

export default function AdminDashboard() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState({});
  const [message, setMessage] = useState(null);

  // Dashboard data
  const [stats, setStats] = useState({ totalUsers: 0, totalAdmins: 0, totalVerified: 0 });
  const [dbStats, setDbStats] = useState({});
  const [sysInfo, setSysInfo] = useState({});

  // User management
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [actionLoading, setActionLoading] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [usernameEdit, setUsernameEdit] = useState({});

  // Content management
  const [stories, setStories] = useState([]);
  const [notes, setNotes] = useState([]);
  const [comments, setComments] = useState([]);
  const [contentTab, setContentTab] = useState('stories');

  // Trending items management
  const [trendingItems, setTrendingItems] = useState([]);
  const [newTrendingItem, setNewTrendingItem] = useState({
    page_type: 'anime',
    media_id: '',
    title: '',
    description: '',
    image_url: '',
    banner_url: '',
    sort_order: 0
  });
  const [editingTrendingId, setEditingTrendingId] = useState(null);

  // Site settings
  const [siteSettings, setSiteSettings] = useState({ announcement: '', maintenance: 'false' });

  // Sessions
  const [sessions, setSessions] = useState([]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  // ── LOADERS ──
  const loadDashboard = useCallback(async () => {
    setLoading(prev => ({ ...prev, dashboard: true }));
    try {
      const [s, d, i] = await Promise.all([
        getSiteStats(), getDatabaseStats(), getSystemInfo()
      ]);
      setStats(s);
      setDbStats(d);
      setSysInfo(i);
    } catch (e) { console.error(e); }
    setLoading(prev => ({ ...prev, dashboard: false }));
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(prev => ({ ...prev, users: true }));
    try {
      if (searchQuery.trim()) {
        const results = await searchUsersAdmin(searchQuery);
        setUsers(results);
        setTotalUsers(results.length);
      } else {
        const { users: userList, total } = await listAllUsers(page, 50);
        setUsers(userList);
        setTotalUsers(total);
      }
    } catch (e) { console.error(e); }
    setLoading(prev => ({ ...prev, users: false }));
  }, [page, searchQuery]);

  const loadContent = useCallback(async () => {
    setLoading(prev => ({ ...prev, content: true }));
    try {
      const [s, n, c, t] = await Promise.all([
        getRecentStories(20), getRecentNotes(20), getRecentComments(20),
        getAllTrendingItems('anime')
      ]);
      setStories(s);
      setNotes(n);
      setComments(c);
      setTrendingItems(t);
    } catch (e) { console.error(e); }
    setLoading(prev => ({ ...prev, content: false }));
  }, []);

  const loadSettings = useCallback(async () => {
    setLoading(prev => ({ ...prev, settings: true }));
    try {
      const s = await fetchSiteSettings();
      setSiteSettings(s);
    } catch (e) { console.error(e); }
    setLoading(prev => ({ ...prev, settings: false }));
  }, []);

  const loadSessions = useCallback(async () => {
    setLoading(prev => ({ ...prev, sessions: true }));
    try {
      const s = await getActiveSessions(50);
      setSessions(s);
    } catch (e) { console.error(e); }
    setLoading(prev => ({ ...prev, sessions: false }));
  }, []);

  useEffect(() => {
    if (activeTab === 'dashboard') loadDashboard();
    else if (activeTab === 'users') loadUsers();
    else if (activeTab === 'content') loadContent();
    else if (activeTab === 'settings') loadSettings();
    else if (activeTab === 'sessions') loadSessions();
  }, [activeTab, loadDashboard, loadUsers, loadContent, loadSettings, loadSessions]);

  // ── USER ACTIONS ──
  const handleUserAction = async (action, userId) => {
    setActionLoading(`${action}-${userId}`);
    try {
      let result;
      if (action === 'verify') result = await toggleUserVerification(userId);
      else if (action === 'admin') result = await toggleUserAdmin(userId);
      else if (action === 'delete') {
        if (!window.confirm('Permanently delete this user? This cannot be undone.')) return;
        result = await deleteUserAccount(userId);
      } else if (action === 'details') {
        const details = await getUserDetails(userId);
        setUserDetails(details);
        setUsernameEdit({ [userId]: details?.username || '' });
        return;
      }
      if (result?.success) {
        showMessage('success', 'User updated successfully');
        loadUsers();
      } else {
        showMessage('error', 'Action failed. Database may be offline.');
      }
    } catch (e) { showMessage('error', e.message); }
    setActionLoading(null);
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.length === 0) return;
    if (!window.confirm(`Delete ${selectedUsers.length} selected users permanently?`)) return;
    setActionLoading('bulk-delete');
    try {
      const result = await bulkDeleteUsers(selectedUsers);
      if (result?.success) {
        showMessage('success', `Deleted ${result.deleted} users`);
        setSelectedUsers([]);
        loadUsers();
      }
    } catch (e) { showMessage('error', e.message); }
    setActionLoading(null);
  };

  const handleUsernameUpdate = async (userId) => {
    const newName = usernameEdit[userId];
    if (!newName || newName.length < 3) return;
    setActionLoading(`username-${userId}`);
    try {
      const result = await updateUsername(userId, newName);
      if (result?.success) {
        showMessage('success', 'Username updated');
        setUserDetails(null);
        loadUsers();
      } else {
        showMessage('error', result?.message || 'Failed');
      }
    } catch (e) { showMessage('error', e.message); }
    setActionLoading(null);
  };

  // ── CONTENT ACTIONS ──
  const handleDeleteContent = async (type, id) => {
    if (!window.confirm(`Delete this ${type}?`)) return;
    try {
      let success;
      if (type === 'story') success = await deleteStory(id);
      else if (type === 'note') success = await deleteNote(id);
      else if (type === 'comment') success = await deleteComment(id);
      if (success) {
        showMessage('success', `${type} deleted`);
        loadContent();
      } else showMessage('error', 'Failed to delete');
    } catch (e) { showMessage('error', e.message); }
  };

  // ── TRENDING ITEMS ACTIONS ──
  const handleAddTrendingItem = async () => {
    if (!newTrendingItem.title || !newTrendingItem.media_id) {
      showMessage('error', 'Title and Media ID are required');
      return;
    }
    try {
      const result = await addTrendingItem(newTrendingItem);
      if (result.success) {
        showMessage('success', 'Trending item added');
        setNewTrendingItem({
          page_type: 'anime',
          media_id: '',
          title: '',
          description: '',
          image_url: '',
          banner_url: '',
          sort_order: 0
        });
        loadContent();
      } else {
        showMessage('error', result.error || 'Failed to add');
      }
    } catch (e) { showMessage('error', e.message); }
  };

  const handleUpdateTrendingItem = async (id) => {
    try {
      const item = trendingItems.find(t => t.id === id);
      if (!item) return;
      const result = await updateTrendingItem(id, item);
      if (result.success) {
        showMessage('success', 'Trending item updated');
        loadContent();
      } else {
        showMessage('error', 'Failed to update');
      }
    } catch (e) { showMessage('error', e.message); }
  };

  const handleDeleteTrendingItem = async (id) => {
    if (!window.confirm('Delete this trending item?')) return;
    try {
      const success = await deleteTrendingItem(id);
      if (success) {
        showMessage('success', 'Trending item deleted');
        loadContent();
      } else {
        showMessage('error', 'Failed to delete');
      }
    } catch (e) { showMessage('error', e.message); }
  };

  const updateTrendingItemField = (id, field, value) => {
    setTrendingItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  // ── SETTINGS ACTIONS ──
  const handleSaveSettings = async () => {
    setLoading(prev => ({ ...prev, savingSettings: true }));
    try {
      const result = await updateSiteSettings(siteSettings);
      if (result?.success) showMessage('success', 'Settings saved');
      else showMessage('error', 'Failed to save');
    } catch (e) { showMessage('error', e.message); }
    setLoading(prev => ({ ...prev, savingSettings: false }));
  };

  const handleRevokeSession = async (sessionId) => {
    const success = await revokeSession(sessionId);
    if (success) {
      showMessage('success', 'Session revoked');
      loadSessions();
    } else showMessage('error', 'Failed');
  };

  const toggleSelectUser = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const isActionLoading = (action, id) => actionLoading === `${action}-${id}`;

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="admin-dashboard" style={{ padding: '1.5rem 2rem', maxWidth: '1400px', margin: '0 auto', color: '#fff' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Server size={28} color="#ffd700" /> Admin Panel
          </h1>
          <p style={{ color: '#94a3b8', margin: '4px 0 0', fontSize: '0.85rem' }}>Full database access & site management</p>
        </div>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '8px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Shield size={16} color="#ffd700" />
            <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>{user.username}</span>
            <BadgeCheck size={16} color="#1d9bf0" />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '1.5rem', overflowX: 'auto', flexWrap: 'wrap' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: '10px 18px', borderRadius: '10px', cursor: 'pointer',
            background: activeTab === tab.id ? 'rgba(255,26,117,0.2)' : 'rgba(255,255,255,0.03)',
            color: activeTab === tab.id ? '#ff1a75' : '#94a3b8', fontWeight: '700', fontSize: '0.85rem',
            display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s',
            border: activeTab === tab.id ? '1px solid rgba(255,26,117,0.3)' : '1px solid rgba(255,255,255,0.06)'
          }}
            onMouseEnter={e => { if (activeTab !== tab.id) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
            onMouseLeave={e => { if (activeTab !== tab.id) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Status Message */}
      {message && (
        <div style={{
          padding: '10px 16px', borderRadius: '10px', marginBottom: '1rem',
          background: message.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${message.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: message.type === 'success' ? '#10b981' : '#ef4444',
          display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', fontSize: '0.85rem'
        }}>
          {message.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          {message.text}
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* TAB: DASHBOARD */}
      {/* ═══════════════════════════════════════════ */}
      {activeTab === 'dashboard' && (
        <>
          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ fontSize: '2rem', fontWeight: '900', color: '#ff1a75' }}>{stats.totalUsers}</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700', marginTop: '4px' }}>TOTAL USERS</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ fontSize: '2rem', fontWeight: '900', color: '#1d9bf0' }}>{stats.totalVerified}</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700', marginTop: '4px' }}>VERIFIED</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ fontSize: '2rem', fontWeight: '900', color: '#ffd700' }}>{stats.totalAdmins}</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700', marginTop: '4px' }}>ADMINS</div>
            </div>
          </div>

          {/* Database Table Stats */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', color: '#fff' }}>
              <Database size={18} color="#ff1a75" /> Database Table Row Counts
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
              {Object.entries(dbStats).map(([table, count]) => (
                <div key={table} style={{
                  padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.04)', textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '2px' }}>{table.replace(/_/g, ' ')}</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#fff' }}>{count}</div>
                </div>
              ))}
            </div>
          </div>

          {/* System Info */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '1.25rem' }}>
            <h3 style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', color: '#fff' }}>
              <Terminal size={18} color="#10b981" /> System Information
            </h3>
            <div style={{ display: 'grid', gap: '8px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', gap: '8px' }}><span style={{ color: '#64748b', minWidth: '100px' }}>Database:</span>
                <span style={{ color: sysInfo.dbConnected ? '#10b981' : '#ef4444', fontWeight: '700' }}>{sysInfo.dbConnected ? 'Connected' : 'Disconnected'}</span></div>
              {sysInfo.dbVersion && <div style={{ display: 'flex', gap: '8px' }}><span style={{ color: '#64748b', minWidth: '100px' }}>DB Version:</span><span style={{ color: '#94a3b8', fontSize: '0.8rem', wordBreak: 'break-all' }}>{sysInfo.dbVersion}</span></div>}
              <div style={{ display: 'flex', gap: '8px' }}><span style={{ color: '#64748b', minWidth: '100px' }}>Environment:</span><span style={{ color: '#94a3b8' }}>{sysInfo.nodeEnv || import.meta.env.MODE}</span></div>
              <div style={{ display: 'flex', gap: '8px' }}><span style={{ color: '#64748b', minWidth: '100px' }}>Generated:</span><span style={{ color: '#94a3b8' }}>{formatDate(sysInfo.buildTime)}</span></div>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* TAB: USERS */}
      {/* ═══════════════════════════════════════════ */}
      {activeTab === 'users' && (
        <>
          {/* Search & Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, position: 'relative', maxWidth: '350px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input type="text" placeholder="Search users..." value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none', fontSize: '0.85rem' }} />
            </div>
            <button onClick={loadUsers} style={{
              padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem'
            }}><RefreshCw size={16} /> Refresh</button>
            {selectedUsers.length > 0 && (
              <button onClick={handleBulkDelete} style={{
                padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '10px', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: '700'
              }} disabled={isActionLoading('bulk-delete')}>
                {isActionLoading('bulk-delete') ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={16} />}
                Delete {selectedUsers.length} Selected
              </button>
            )}
          </div>

          {/* User Detail Panel */}
          {userDetails && (
            <div style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px',
              padding: '1.25rem', marginBottom: '1rem', position: 'relative'
            }}>
              <button onClick={() => setUserDetails(null)} style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                <X size={18} />
              </button>
              <h4 style={{ margin: '0 0 12px', color: '#fff' }}>User Details: <span style={{ color: '#ff1a75' }}>{userDetails.username}</span> (ID: {userDetails.id})</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '12px', fontSize: '0.85rem' }}>
                <div><span style={{ color: '#64748b' }}>Verified:</span> <span style={{ color: userDetails.is_verified ? '#1d9bf0' : '#64748b', fontWeight: '700' }}>{userDetails.is_verified ? 'Yes' : 'No'}</span></div>
                <div><span style={{ color: '#64748b' }}>Admin:</span> <span style={{ color: userDetails.is_admin ? '#ffd700' : '#64748b', fontWeight: '700' }}>{userDetails.is_admin ? 'Yes' : 'No'}</span></div>
                <div><span style={{ color: '#64748b' }}>2FA:</span> <span style={{ color: '#94a3b8' }}>{userDetails.two_factor_enabled ? 'Enabled' : 'Disabled'}</span></div>
                <div><span style={{ color: '#64748b' }}>Created:</span> <span style={{ color: '#94a3b8' }}>{formatDate(userDetails.created_at)}</span></div>
                <div><span style={{ color: '#64748b' }}>Watch History:</span> <span style={{ color: '#fff', fontWeight: '700' }}>{userDetails.watchHistoryCount}</span></div>
                <div><span style={{ color: '#64748b' }}>Likes:</span> <span style={{ color: '#fff', fontWeight: '700' }}>{userDetails.likesCount}</span></div>
                <div><span style={{ color: '#64748b' }}>Following:</span> <span style={{ color: '#fff', fontWeight: '700' }}>{userDetails.followingCount}</span></div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input type="text" value={usernameEdit[userDetails.id] || ''}
                  onChange={e => setUsernameEdit({ ...usernameEdit, [userDetails.id]: e.target.value })}
                  placeholder="New username"
                  style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none', fontSize: '0.85rem' }} />
                <button onClick={() => handleUsernameUpdate(userDetails.id)}
                  disabled={isActionLoading('username', userDetails.id)}
                  style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: 'rgba(255,26,117,0.15)', color: '#ff1a75', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', opacity: isActionLoading('username', userDetails.id) ? 0.5 : 1 }}>
                  {isActionLoading('username', userDetails.id) ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Edit3 size={14} />}
                  Update Username
                </button>
              </div>
            </div>
          )}

          {/* Users Table */}
          {loading.users ? (
            <div style={{ textAlign: 'center', padding: '60px' }}>
              <Loader size={32} style={{ animation: 'spin 1s linear infinite', color: '#ff1a75' }} />
              <p style={{ color: '#94a3b8', marginTop: '12px' }}>Loading users...</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <th style={{ padding: '10px', textAlign: 'center', width: '40px' }}>
                      <input type="checkbox" onChange={e => {
                        if (e.target.checked) setSelectedUsers(users.map(u => u.id));
                        else setSelectedUsers([]);
                      }} checked={selectedUsers.length === users.length && users.length > 0}
                        style={{ accentColor: '#ff1a75' }} />
                    </th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontWeight: '700', fontSize: '0.7rem', textTransform: 'uppercase' }}>Username</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', color: '#64748b', fontWeight: '700', fontSize: '0.7rem', textTransform: 'uppercase' }}>ID</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', color: '#64748b', fontWeight: '700', fontSize: '0.7rem', textTransform: 'uppercase' }}>Verified</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', color: '#64748b', fontWeight: '700', fontSize: '0.7rem', textTransform: 'uppercase' }}>Role</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', color: '#64748b', fontWeight: '700', fontSize: '0.7rem', textTransform: 'uppercase' }}>Created</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', color: '#64748b', fontWeight: '700', fontSize: '0.7rem', textTransform: 'uppercase' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, idx) => (
                    <tr key={u.id} style={{
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                      transition: 'background 0.2s'
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,26,117,0.03)'}
                      onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'}>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <input type="checkbox" checked={selectedUsers.includes(u.id)} onChange={() => toggleSelectUser(u.id)}
                          style={{ accentColor: '#ff1a75' }} />
                      </td>
                      <td style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {u.avatar ? (
                          <img src={u.avatar} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,26,117,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff1a75', fontWeight: '900', fontSize: '0.75rem' }}>
                            {(u.username || '?')[0].toUpperCase()}
                          </div>
                        )}
                        <span style={{ fontWeight: '700', color: '#fff' }}>{u.username}</span>
                        {u.is_verified && <BadgeCheck size={14} color="#1d9bf0" fill="#1d9bf0" />}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', color: '#64748b', fontFamily: 'monospace', fontSize: '0.75rem' }}>{u.id}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '700',
                          background: u.is_verified ? 'rgba(29,155,240,0.15)' : 'rgba(100,116,139,0.1)',
                          color: u.is_verified ? '#1d9bf0' : '#64748b'
                        }}>{u.is_verified ? 'Verified' : 'User'}</span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '700',
                          background: u.is_admin ? 'rgba(255,215,0,0.15)' : 'rgba(100,116,139,0.1)',
                          color: u.is_admin ? '#ffd700' : '#64748b'
                        }}>{u.is_admin ? 'Admin' : 'User'}</span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem' }}>{formatDate(u.created_at)}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                          <button onClick={() => handleUserAction('details', u.id)} title="View details"
                            style={{ padding: '4px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                            <List size={14} />
                          </button>
                          <button onClick={() => handleUserAction('verify', u.id)} title={u.is_verified ? 'Unverify' : 'Verify'}
                            style={{
                              padding: '4px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                              background: u.is_verified ? 'rgba(239,68,68,0.1)' : 'rgba(29,155,240,0.1)',
                              color: u.is_verified ? '#ef4444' : '#1d9bf0', display: 'flex', alignItems: 'center',
                              opacity: isActionLoading('verify', u.id) ? 0.5 : 1
                            }}>
                            {isActionLoading('verify', u.id) ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <BadgeCheck size={14} />}
                          </button>
                          <button onClick={() => handleUserAction('admin', u.id)} title={u.is_admin ? 'Demote' : 'Promote'}
                            disabled={String(u.id) === String(user?.id)}
                            style={{
                              padding: '4px 8px', borderRadius: '6px', border: 'none', cursor: String(u.id) === String(user?.id) ? 'not-allowed' : 'pointer',
                              background: u.is_admin ? 'rgba(239,68,68,0.1)' : 'rgba(255,215,0,0.1)',
                              color: u.is_admin ? '#ef4444' : '#ffd700', display: 'flex', alignItems: 'center',
                              opacity: isActionLoading('admin', u.id) || String(u.id) === String(user?.id) ? 0.5 : 1
                            }}>
                            {isActionLoading('admin', u.id) ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Shield size={14} />}
                          </button>
                          <button onClick={() => handleUserAction('delete', u.id)} title="Delete"
                            disabled={String(u.id) === String(user?.id)}
                            style={{
                              padding: '4px 8px', borderRadius: '6px', border: 'none', cursor: String(u.id) === String(user?.id) ? 'not-allowed' : 'pointer',
                              background: 'rgba(239,68,68,0.1)', color: '#ef4444', display: 'flex', alignItems: 'center',
                              opacity: isActionLoading('delete', u.id) ? 0.5 : 1
                            }}>
                            {isActionLoading('delete', u.id) ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!searchQuery && totalUsers > 50 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '1rem' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: '#94a3b8', cursor: page === 1 ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '0.8rem' }}>
                <ChevronLeft size={14} style={{ verticalAlign: 'middle' }} /> Previous
              </button>
              <span style={{ padding: '8px 16px', color: '#64748b', fontSize: '0.8rem' }}>Page {page} of {Math.ceil(totalUsers / 50)}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(totalUsers / 50)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: '#94a3b8', cursor: page >= Math.ceil(totalUsers / 50) ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '0.8rem' }}>
                Next <ChevronRight size={14} style={{ verticalAlign: 'middle' }} />
              </button>
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* TAB: CONTENT */}
      {/* ═══════════════════════════════════════════ */}
      {activeTab === 'content' && (
        <>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
            {[
              { id: 'stories', label: 'Stories', icon: Image, count: stories.length },
              { id: 'notes', label: 'Notes', icon: Bookmark, count: notes.length },
              { id: 'comments', label: 'Comments', icon: MessageSquare, count: comments.length },
              { id: 'trending', label: 'Trending', icon: TrendingUp, count: trendingItems.length },
            ].map(t => (
              <button key={t.id} onClick={() => setContentTab(t.id)} style={{
                padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                background: contentTab === t.id ? 'rgba(255,26,117,0.15)' : 'rgba(255,255,255,0.03)',
                color: contentTab === t.id ? '#ff1a75' : '#94a3b8', fontWeight: '700', fontSize: '0.85rem',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}>
                <t.icon size={14} /> {t.label} ({t.count})
              </button>
            ))}
            <button onClick={loadContent} style={{
              padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.03)', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem'
            }}><RefreshCw size={14} /> Refresh</button>
          </div>

          {loading.content ? (
            <div style={{ textAlign: 'center', padding: '60px' }}>
              <Loader size={32} style={{ animation: 'spin 1s linear infinite', color: '#ff1a75' }} />
            </div>
          ) : contentTab === 'trending' ? (
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {/* Add Trending Item Form */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '1.5rem' }}>
                <h4 style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#ff1a75' }}>
                  <Plus size={18} /> Add Trending Item
                </h4>
                <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
                  <div>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Title *</label>
                    <input type="text" value={newTrendingItem.title}
                      onChange={e => setNewTrendingItem({ ...newTrendingItem, title: e.target.value })}
                      placeholder="Anime title"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none', fontSize: '0.8rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Media ID *</label>
                    <input type="text" value={newTrendingItem.media_id}
                      onChange={e => setNewTrendingItem({ ...newTrendingItem, media_id: e.target.value })}
                      placeholder="e.g. 180745"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none', fontSize: '0.8rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Sort Order</label>
                    <input type="number" value={newTrendingItem.sort_order}
                      onChange={e => setNewTrendingItem({ ...newTrendingItem, sort_order: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none', fontSize: '0.8rem' }} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Description</label>
                    <textarea value={newTrendingItem.description}
                      onChange={e => setNewTrendingItem({ ...newTrendingItem, description: e.target.value })}
                      placeholder="Brief description"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none', fontSize: '0.8rem', minHeight: '60px', fontFamily: 'inherit', resize: 'vertical' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Cover Image URL</label>
                    <input type="url" value={newTrendingItem.image_url}
                      onChange={e => setNewTrendingItem({ ...newTrendingItem, image_url: e.target.value })}
                      placeholder="https://..."
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none', fontSize: '0.8rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px' }}>Banner Image URL</label>
                    <input type="url" value={newTrendingItem.banner_url}
                      onChange={e => setNewTrendingItem({ ...newTrendingItem, banner_url: e.target.value })}
                      placeholder="https://..."
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none', fontSize: '0.8rem' }} />
                  </div>
                </div>
                <button onClick={handleAddTrendingItem}
                  style={{ marginTop: '12px', padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'rgba(255,26,117,0.2)', color: '#ff1a75', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Plus size={16} /> Add Item
                </button>
              </div>

              {/* Trending Items List */}
              <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b', fontWeight: '700', fontSize: '0.7rem', textTransform: 'uppercase' }}>ID</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b', fontWeight: '700', fontSize: '0.7rem', textTransform: 'uppercase' }}>Title</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b', fontWeight: '700', fontSize: '0.7rem', textTransform: 'uppercase' }}>Media ID</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b', fontWeight: '700', fontSize: '0.7rem', textTransform: 'uppercase' }}>Order</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b', fontWeight: '700', fontSize: '0.7rem', textTransform: 'uppercase' }}>Status</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b', fontWeight: '700', fontSize: '0.7rem', textTransform: 'uppercase' }}>Created</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b', fontWeight: '700', fontSize: '0.7rem', textTransform: 'uppercase' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trendingItems.length === 0 ? (
                      <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No trending items.</td></tr>
                    ) : (
                      trendingItems.map((item, idx) => (
                        <tr key={item.id} style={{
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'
                        }}>
                          <td style={{ padding: '10px 12px', color: '#64748b', fontFamily: 'monospace', fontSize: '0.7rem' }}>{item.id}</td>
                          <td style={{ padding: '10px 12px', color: '#fff', fontWeight: '600', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</td>
                          <td style={{ padding: '10px 12px', color: '#94a3b8', fontSize: '0.75rem' }}>{item.media_id}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <input type="number" value={item.sort_order}
                              onChange={e => updateTrendingItemField(item.id, 'sort_order', parseInt(e.target.value))}
                              style={{ width: '50px', padding: '4px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none', fontSize: '0.75rem' }} />
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <select value={item.active ? 'active' : 'inactive'}
                              onChange={e => updateTrendingItemField(item.id, 'active', e.target.value === 'active')}
                              style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: item.active ? '#10b981' : '#ef4444', outline: 'none', fontSize: '0.75rem' }}>
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                            </select>
                          </td>
                          <td style={{ padding: '10px 12px', color: '#94a3b8', fontSize: '0.75rem' }}>{formatDate(item.created_at)}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                              <button onClick={() => handleUpdateTrendingItem(item.id)} title="Save"
                                style={{ padding: '4px 8px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                                <Save size={12} />
                              </button>
                              <button onClick={() => handleDeleteTrendingItem(item.id)} title="Delete"
                                style={{ padding: '4px 8px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontWeight: '700', fontSize: '0.7rem', textTransform: 'uppercase' }}>ID</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontWeight: '700', fontSize: '0.7rem', textTransform: 'uppercase' }}>User</th>
                    {contentTab === 'stories' && <th style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontWeight: '700', fontSize: '0.7rem', textTransform: 'uppercase' }}>Media</th>}
                    {contentTab === 'notes' && <th style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontWeight: '700', fontSize: '0.7rem', textTransform: 'uppercase' }}>Content</th>}
                    {contentTab === 'comments' && <th style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontWeight: '700', fontSize: '0.7rem', textTransform: 'uppercase' }}>Media ID</th>}
                    {contentTab === 'comments' && <th style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontWeight: '700', fontSize: '0.7rem', textTransform: 'uppercase' }}>Comment</th>}
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontWeight: '700', fontSize: '0.7rem', textTransform: 'uppercase' }}>Created</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', color: '#64748b', fontWeight: '700', fontSize: '0.7rem', textTransform: 'uppercase' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(contentTab === 'stories' ? stories : contentTab === 'notes' ? notes : comments).length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No {contentTab} found.</td></tr>
                  ) : (
                    (contentTab === 'stories' ? stories : contentTab === 'notes' ? notes : comments).map((item, idx) => (
                      <tr key={item.id} style={{
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'
                      }}>
                        <td style={{ padding: '10px 14px', color: '#64748b', fontFamily: 'monospace', fontSize: '0.75rem' }}>{item.id}</td>
                        <td style={{ padding: '10px 14px', color: '#fff', fontWeight: '600' }}>{item.username || 'Unknown'}</td>
                        {contentTab === 'stories' && (
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{item.media_type}</span>
                              {item.media_url && <a href={item.media_url} target="_blank" rel="noopener" style={{ color: '#1d9bf0', fontSize: '0.75rem' }}><Link size={12} /></a>}
                            </div>
                          </td>
                        )}
                        {contentTab === 'notes' && <td style={{ padding: '10px 14px', color: '#94a3b8', fontSize: '0.8rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.content}</td>}
                        {contentTab === 'comments' && <td style={{ padding: '10px 14px', color: '#94a3b8', fontSize: '0.75rem', fontFamily: 'monospace' }}>{item.media_id}</td>}
                        {contentTab === 'comments' && <td style={{ padding: '10px 14px', color: '#94a3b8', fontSize: '0.8rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.comment_text}</td>}
                        <td style={{ padding: '10px 14px', color: '#94a3b8', fontSize: '0.75rem' }}>{formatDate(item.created_at)}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <button onClick={() => handleDeleteContent(contentTab === 'stories' ? 'story' : contentTab === 'notes' ? 'note' : 'comment', item.id)}
                            style={{ padding: '4px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* TAB: SETTINGS */}
      {/* ═══════════════════════════════════════════ */}
      {activeTab === 'settings' && (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1.5rem', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>
            <Settings size={18} color="#ff1a75" /> Site Settings
          </h3>
          <div style={{ display: 'grid', gap: '1rem', maxWidth: '500px' }}>
            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', fontWeight: '700', marginBottom: '6px' }}>Announcement Banner</label>
              <input type="text" value={siteSettings.announcement}
                onChange={e => setSiteSettings({ ...siteSettings, announcement: e.target.value })}
                placeholder="Leave empty to hide"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none', fontSize: '0.85rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', fontWeight: '700', marginBottom: '6px' }}>Maintenance Mode</label>
              <select value={siteSettings.maintenance}
                onChange={e => setSiteSettings({ ...siteSettings, maintenance: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none', fontSize: '0.85rem' }}>
                <option value="false">Disabled</option>
                <option value="true">Enabled</option>
              </select>
            </div>
            <button onClick={handleSaveSettings} disabled={loading.savingSettings}
              style={{
                padding: '12px 24px', borderRadius: '10px', border: 'none', background: 'var(--brand-color)',
                color: '#000', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', fontSize: '0.85rem',
                opacity: loading.savingSettings ? 0.6 : 1
              }}>
              {loading.savingSettings ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
              Save Settings
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* TAB: SESSIONS */}
      {/* ═══════════════════════════════════════════ */}
      {activeTab === 'sessions' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button onClick={loadSessions} style={{
              padding: '8px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem'
            }}><RefreshCw size={16} /> Refresh</button>
          </div>
          {loading.sessions ? (
            <div style={{ textAlign: 'center', padding: '60px' }}>
              <Loader size={32} style={{ animation: 'spin 1s linear infinite', color: '#ff1a75' }} />
            </div>
          ) : (
            <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontWeight: '700', fontSize: '0.7rem', textTransform: 'uppercase' }}>User</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontWeight: '700', fontSize: '0.7rem', textTransform: 'uppercase' }}>Device</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontWeight: '700', fontSize: '0.7rem', textTransform: 'uppercase' }}>Last Active</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontWeight: '700', fontSize: '0.7rem', textTransform: 'uppercase' }}>Expires</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', color: '#64748b', fontWeight: '700', fontSize: '0.7rem', textTransform: 'uppercase' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No active sessions.</td></tr>
                  ) : (
                    sessions.map((s, idx) => (
                      <tr key={s.id} style={{
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'
                      }}>
                        <td style={{ padding: '10px 14px', color: '#fff', fontWeight: '600' }}>{s.username || 'Unknown'}</td>
                        <td style={{ padding: '10px 14px', color: '#94a3b8', fontSize: '0.8rem' }}>{s.device_name || 'Unknown Device'}</td>
                        <td style={{ padding: '10px 14px', color: '#94a3b8', fontSize: '0.75rem' }}>{formatDate(s.last_active)}</td>
                        <td style={{ padding: '10px 14px', color: '#94a3b8', fontSize: '0.75rem' }}>{formatDate(s.expires_at)}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <button onClick={() => handleRevokeSession(s.id)}
                            style={{ padding: '4px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '0.75rem', fontWeight: '700' }}>
                            Revoke
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* TAB: SYSTEM */}
      {/* ═══════════════════════════════════════════ */}
      {activeTab === 'system' && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>
              <Terminal size={18} color="#10b981" /> System Information
            </h3>
            <div style={{ display: 'grid', gap: '10px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ color: '#64748b', minWidth: '120px' }}>Database Status:</span>
                <span style={{
                  padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700',
                  background: sysInfo.dbConnected ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                  color: sysInfo.dbConnected ? '#10b981' : '#ef4444'
                }}>
                  {sysInfo.dbConnected ? '● Connected' : '● Disconnected'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}><span style={{ color: '#64748b', minWidth: '120px' }}>Database Version:</span><span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{sysInfo.dbVersion || 'N/A'}</span></div>
              <div style={{ display: 'flex', gap: '12px' }}><span style={{ color: '#64748b', minWidth: '120px' }}>Environment:</span><span style={{ color: '#94a3b8' }}>{sysInfo.nodeEnv || import.meta.env.MODE}</span></div>
              <div style={{ display: 'flex', gap: '12px' }}><span style={{ color: '#64748b', minWidth: '120px' }}>Session Token:</span><span style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '0.75rem' }}>{localStorage.getItem('animevault_session_token')?.slice(0, 20) || 'None'}...</span></div>
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>
              <Database size={18} color="#ff1a75" /> Database Overview
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
              {Object.entries(dbStats).map(([table, count]) => (
                <div key={table} style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>{table.replace(/_/g, ' ')}</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#fff' }}>{count}</div>
                </div>
              ))}
            </div>
            <button onClick={loadDashboard} style={{ marginTop: '1rem', padding: '8px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#94a3b8', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
              <RefreshCw size={14} /> Refresh Stats
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}