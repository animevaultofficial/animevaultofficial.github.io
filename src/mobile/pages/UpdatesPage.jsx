import React, { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, Download, CheckCircle, AlertTriangle, Package, ExternalLink, Loader } from 'lucide-react';
import { APP_VERSION } from '../../version.js';

const CURRENT_VERSION = APP_VERSION;
const GITHUB_REPO = 'animevaultofficial/animevaultofficial.github.io';
const UPDATE_CHECK_KEY = 'av_last_update_check';

export default function UpdatesPage({ goBack }) {
  const [checking, setChecking] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem(UPDATE_CHECK_KEY);
    if (stored) setLastChecked(new Date(parseInt(stored)).toLocaleString());
    checkForUpdates(true);
  }, []);

  async function checkForUpdates(silent = false) {
    setChecking(true);
    try {
      const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      const latestVersion = data.tag_name?.replace(/^v/, '') || data.name?.replace(/^v/, '') || '';
      const isOutdated = latestVersion && compareVersions(CURRENT_VERSION, latestVersion) < 0;

      setUpdateInfo({
        currentVersion: CURRENT_VERSION,
        latestVersion: latestVersion || CURRENT_VERSION,
        isOutdated,
        releaseUrl: data.html_url || `https://github.com/${GITHUB_REPO}/releases`,
        releaseNotes: data.body?.slice(0, 1500) || 'No release notes available.',
        publishedAt: data.published_at ? new Date(data.published_at).toLocaleDateString() : 'Unknown',
      });

      localStorage.setItem(UPDATE_CHECK_KEY, String(Date.now()));
      setLastChecked(new Date().toLocaleString());

      if (isOutdated && !silent) {
        // Show notification that update is available
      }
    } catch (err) {
      if (!silent) {
        setUpdateInfo({
          currentVersion: CURRENT_VERSION,
          latestVersion: CURRENT_VERSION,
          isOutdated: false,
          releaseUrl: `https://github.com/${GITHUB_REPO}/releases`,
          releaseNotes: null,
          publishedAt: null,
          error: 'Could not check for updates. Check your connection.',
        });
      }
    }
    setChecking(false);
  }

  function compareVersions(a, b) {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      if ((pa[i] || 0) > (pb[i] || 0)) return 1;
      if ((pa[i] || 0) < (pb[i] || 0)) return -1;
    }
    return 0;
  }

  return (
    <div className="mobile-content">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <button onClick={goBack} className="btn btn-ghost" style={{ padding: '6px 10px' }}><ArrowLeft size={18} /></button>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Updates</h2>
      </div>

      {/* Version Info Card */}
      <div className="info-card" style={{ marginBottom: 16, textAlign: 'center', padding: '1.2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
          <Package size={28} style={{ color: 'var(--brand)' }} />
          <span style={{ fontSize: '1.8rem', fontWeight: 900 }}>{CURRENT_VERSION}</span>
        </div>
        <p style={{ color: 'var(--text3)', fontSize: '0.78rem' }}>
          AnimeVault Mobile
        </p>
        {updateInfo?.isOutdated && (
          <div style={{ marginTop: 10, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', borderRadius: 10, padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <AlertTriangle size={16} /> Update available: v{updateInfo.latestVersion}
          </div>
        )}
        {updateInfo && !updateInfo.isOutdated && !updateInfo.error && (
          <div style={{ marginTop: 10, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', borderRadius: 10, padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <CheckCircle size={16} /> You're up to date!
          </div>
        )}
        {updateInfo?.error && (
          <div style={{ marginTop: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: 10, padding: '8px 12px', fontSize: '0.8rem' }}>
            {updateInfo.error}
          </div>
        )}
      </div>

      {/* Check for Updates Button */}
      <button
        onClick={() => checkForUpdates(false)}
        disabled={checking}
        style={{
          width: '100%', padding: 14, background: checking ? 'var(--surface2)' : 'var(--brand)',
          color: checking ? 'var(--text3)' : '#fff', fontWeight: 900, border: 'none',
          borderRadius: 12, cursor: checking ? 'progress' : 'pointer', fontSize: '0.9rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          marginBottom: 12, fontFamily: 'var(--font)',
        }}>
        {checking ? <Loader size={18} className="spin" /> : <RefreshCw size={18} />}
        {checking ? 'Checking...' : 'Check for Updates'}
      </button>

      {/* Last checked */}
      {lastChecked && (
        <p style={{ textAlign: 'center', color: 'var(--text3)', fontSize: '0.7rem', marginBottom: 16 }}>
          Last checked: {lastChecked}
        </p>
      )}

      {/* Release Info */}
      {updateInfo && !updateInfo.error && (
        <div style={{ marginBottom: 16 }}>
          <div className="section-header" style={{ marginBottom: 10 }}>
            <span className="section-title">🐙 Release Info</span>
          </div>
          <div className="info-card" style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span className="info-label">Latest Release</span>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.85rem' }}>v{updateInfo.latestVersion}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span className="info-label">Published</span>
              <span style={{ color: 'var(--text3)', fontSize: '0.8rem' }}>{updateInfo.publishedAt}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="info-label">Your Version</span>
              <span style={{ color: 'var(--text3)', fontSize: '0.8rem' }}>v{updateInfo.currentVersion}</span>
            </div>
          </div>
        </div>
      )}

      {/* Release Notes */}
      {updateInfo?.releaseNotes && (
        <div style={{ marginBottom: 16 }}>
          <div className="section-header" style={{ marginBottom: 10 }}>
            <span className="section-title">📋 Release Notes</span>
          </div>
          <div className="info-card" style={{ maxHeight: 300, overflowY: 'auto', whiteSpace: 'pre-wrap', fontSize: '0.78rem', lineHeight: 1.6, color: 'var(--text2)' }}>
            {updateInfo.releaseNotes}
          </div>
        </div>
      )}

      {/* View on GitHub */}
      {updateInfo?.releaseUrl && (
        <a
          href={updateInfo.releaseUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            width: '100%', padding: 12, background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border)', borderRadius: 12, color: '#fff',
            fontWeight: 800, fontSize: '0.85rem', textDecoration: 'none', marginBottom: 12,
            fontFamily: 'var(--font)',
          }}>
          <ExternalLink size={16} /> View on GitHub
        </a>
      )}

      {/* Update Button - only show when outdated */}
      {updateInfo?.isOutdated && (
        <a
          href={updateInfo.releaseUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            width: '100%', padding: 14, background: '#10b981',
            color: '#fff', fontWeight: 900, border: 'none',
            borderRadius: 12, cursor: 'pointer', fontSize: '0.9rem',
            textDecoration: 'none', fontFamily: 'var(--font)',
            boxShadow: '0 4px 15px rgba(16,185,129,0.4)',
          }}>
          <Download size={18} /> Download v{updateInfo.latestVersion}
        </a>
      )}
    </div>
  );
}