import React, { useState, useEffect, useCallback } from 'react';
import { Search, UserCheck, UserX, Shield, ShieldOff, Trash2, RefreshCw, Loader, Award, BadgeCheck, AlertTriangle, CheckCircle } from 'lucide-react';
import { useUser } from '../api/UserContext';
import { listAllUsers, searchUsersAdmin, toggleUserVerification, toggleUserAdmin, deleteUserAccount, getSiteStats } from '../api/db';

export default function AdminDashboard() {
  const { user } = useUser();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalAdmins: 0, totalVerified: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [actionLoading, setActionLoading] = useState(null);
  const [message, setMessage] = useState(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
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
      const siteStats = await getSiteStats();
      setStats(siteStats);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    }
    setLoading(false);
  }, [page, searchQuery]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleAction = async (action, userId) => {
    setActionLoading(`${action}-${userId}`);
    setMessage(null);
    let result;
    try {
      if (action === 'verify') result = await toggleUserVerification(userId);
      else if (action === 'admin') result = await toggleUserAdmin(userId);
      else if (action === 'delete') {
        if (!window.confirm('Are you sure you want to permanently delete this user? This cannot be undone.')) {
          setActionLoading(null);
          return;
        }
        result = await deleteUserAccount(userId);
      }
      if (result?.success) {
        setMessage({ type: 'success', text: `User updated successfully!` });
        loadUsers();
      } else {
        setMessage({ type: 'error', text: 'Action failed. Database may be offline.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
    setActionLoading(null);
  };

  const isActionLoading = (action, userId) => actionLoading === `${action}-${userId}`;

  return (
    <div className="admin-dashboard" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Award size={28} color="#ffd700" /> Admin Panel
          </h1>
          <p style={{ color: '#94a3b8', margin: '4px 0 0' }}>Manage users, verification badges, and platform settings</p>
        </div>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '8px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Shield size={16} color="#ffd700" />
            <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>{user.username}</span>
            <BadgeCheck size={16} color="#1d9bf0" />
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '1.25rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: '900', color: '#ff1a75' }}>{stats.totalUsers}</div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginTop: '4px' }}>Total Users</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '1.25rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: '900', color: '#1d9bf0' }}>{stats.totalVerified}</div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginTop: '4px' }}>Verified Users</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '1.25rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: '900', color: '#ffd700' }}>{stats.totalAdmins}</div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginTop: '4px' }}>Admins</div>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative', maxWidth: '400px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text"
            placeholder="Search users by username..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
            style={{
              width: '100%', padding: '10px 12px 10px 36px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff', outline: 'none', fontSize: '0.9rem'
            }}
          />
        </div>
        <button onClick={loadUsers} style={{
          padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '10px', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
        }}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Status Message */}
      {message && (
        <div style={{
          padding: '10px 16px', borderRadius: '10px', marginBottom: '1rem',
          background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          color: message.type === 'success' ? '#10b981' : '#ef4444',
          display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', fontSize: '0.85rem'
        }}>
          {message.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          {message.text}
          <button onClick={() => setMessage(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1.1rem' }}>&times;</button>
        </div>
      )}

      {/* Users Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Loader size={32} style={{ animation: 'spin 1s linear infinite', color: '#ff1a75' }} />
          <p style={{ color: '#94a3b8', marginTop: '12px' }}>Loading users...</p>
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.75rem' }}>ID</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.75rem' }}>Username</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.75rem' }}>Verified</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.75rem' }}>Admin</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.75rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((u, idx) => (
                    <tr key={u.id} style={{
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                      transition: 'background 0.2s'
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,26,117,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'}
                    >
                      <td style={{ padding: '12px 16px', color: '#64748b', fontFamily: 'monospace', fontSize: '0.8rem' }}>{u.id}</td>
                      <td style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {u.avatar ? (
                          <img src={u.avatar} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,26,117,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff1a75', fontWeight: '900', fontSize: '0.8rem' }}>
                            {(u.username || '?')[0].toUpperCase()}
                          </div>
                        )}
                        <span style={{ fontWeight: '700', color: '#fff' }}>{u.username}</span>
                        {u.is_verified && <BadgeCheck size={16} color="#1d9bf0" fill="#1d9bf0" />}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700',
                          background: u.is_verified ? 'rgba(29, 155, 240, 0.15)' : 'rgba(100, 116, 139, 0.1)',
                          color: u.is_verified ? '#1d9bf0' : '#64748b'
                        }}>
                          {u.is_verified ? <BadgeCheck size={12} /> : <UserX size={12} />}
                          {u.is_verified ? 'Verified' : 'Not Verified'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700',
                          background: u.is_admin ? 'rgba(255, 215, 0, 0.15)' : 'rgba(100, 116, 139, 0.1)',
                          color: u.is_admin ? '#ffd700' : '#64748b'
                        }}>
                          {u.is_admin ? <Shield size={12} /> : <ShieldOff size={12} />}
                          {u.is_admin ? 'Admin' : 'User'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleAction('verify', u.id)}
                            disabled={isActionLoading('verify', u.id)}
                            title={u.is_verified ? 'Remove verification badge' : 'Grant verification badge'}
                            style={{
                              padding: '6px 10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                              background: u.is_verified ? 'rgba(239, 68, 68, 0.1)' : 'rgba(29, 155, 240, 0.1)',
                              color: u.is_verified ? '#ef4444' : '#1d9bf0',
                              display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: '700',
                              opacity: isActionLoading('verify', u.id) ? 0.5 : 1,
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = u.is_verified ? 'rgba(239,68,68,0.2)' : 'rgba(29,155,240,0.2)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = u.is_verified ? 'rgba(239,68,68,0.1)' : 'rgba(29,155,240,0.1)'; }}
                          >
                            {isActionLoading('verify', u.id) ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <BadgeCheck size={14} />}
                            {u.is_verified ? 'Unverify' : 'Verify'}
                          </button>
                          <button
                            onClick={() => handleAction('admin', u.id)}
                            disabled={isActionLoading('admin', u.id) || String(u.id) === String(user?.id)}
                            title={u.is_admin ? 'Remove admin privileges' : 'Make admin'}
                            style={{
                              padding: '6px 10px', borderRadius: '8px', border: 'none', cursor: String(u.id) === String(user?.id) ? 'not-allowed' : 'pointer',
                              background: u.is_admin ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 215, 0, 0.1)',
                              color: u.is_admin ? '#ef4444' : '#ffd700',
                              display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: '700',
                              opacity: isActionLoading('admin', u.id) ? 0.5 : 1,
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => { if (String(u.id) !== String(user?.id)) e.currentTarget.style.background = u.is_admin ? 'rgba(239,68,68,0.2)' : 'rgba(255,215,0,0.2)'; }}
                            onMouseLeave={e => { if (String(u.id) !== String(user?.id)) e.currentTarget.style.background = u.is_admin ? 'rgba(239,68,68,0.1)' : 'rgba(255,215,0,0.1)'; }}
                          >
                            {isActionLoading('admin', u.id) ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Shield size={14} />}
                            {u.is_admin ? 'Demote' : 'Promote'}
                          </button>
                          <button
                            onClick={() => handleAction('delete', u.id)}
                            disabled={isActionLoading('delete', u.id) || String(u.id) === String(user?.id)}
                            title="Delete user permanently"
                            style={{
                              padding: '6px 10px', borderRadius: '8px', border: 'none', cursor: String(u.id) === String(user?.id) ? 'not-allowed' : 'pointer',
                              background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
                              display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: '700',
                              opacity: isActionLoading('delete', u.id) ? 0.5 : 1,
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => { if (String(u.id) !== String(user?.id)) e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; }}
                            onMouseLeave={e => { if (String(u.id) !== String(user?.id)) e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                          >
                            {isActionLoading('delete', u.id) ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={14} />}
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!searchQuery && totalUsers > 50 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '1.5rem' }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.03)', color: '#94a3b8', cursor: page === 1 ? 'not-allowed' : 'pointer',
                  fontWeight: '700', fontSize: '0.85rem', opacity: page === 1 ? 0.5 : 1
                }}
              >
                Previous
              </button>
              <span style={{ padding: '8px 16px', color: '#94a3b8', fontSize: '0.85rem' }}>
                Page {page} of {Math.ceil(totalUsers / 50)}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= Math.ceil(totalUsers / 50)}
                style={{
                  padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.03)', color: '#94a3b8', cursor: page >= Math.ceil(totalUsers / 50) ? 'not-allowed' : 'pointer',
                  fontWeight: '700', fontSize: '0.85rem', opacity: page >= Math.ceil(totalUsers / 50) ? 0.5 : 1
                }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}