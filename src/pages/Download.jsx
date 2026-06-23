import React from 'react';
import { Bookmark, CheckCircle2, DownloadCloud, Laptop, ShieldCheck, Sparkles, Tv } from 'lucide-react';
import androidIcon from '../../android.png';
import windowsIcon from '../../windows icon.png';
import '../styles/download.css';

import packageJson from '../../package.json';

const VERSION = packageJson.version;
const REPOSITORY = 'animevaultofficial/animevaultofficial.github.io';
const releaseAssetUrl = (assetName) => `https://github.com/${REPOSITORY}/releases/latest/download/${assetName}`;

const platforms = [
  {
    id: 'windows',
    name: 'Windows',
    badge: 'Windows 10 / 11',
    description: 'Fast native desktop installer with automatic updates and Discord Rich Presence support.',
    icon: windowsIcon,
    iconAlt: 'Windows logo',
    fileName: `AnimeVault Windows x64 v${VERSION}.exe`,
    url: releaseAssetUrl('AnimeVault-Windows-x64.exe'),
    note: 'Recommended for most PCs',
  },
  {
    id: 'mac',
    name: 'macOS',
    badge: 'macOS 12+',
    description: 'Universal desktop downloads for Intel and Apple Silicon Macs with a polished native shell.',
    icon: 'https://img.icons8.com/color/512/mac-os.png',
    iconAlt: 'macOS logo',
    fileName: `AnimeVault macOS Apple Silicon v${VERSION}.dmg`,
    url: releaseAssetUrl('AnimeVault-macOS-arm64.dmg'),
    note: 'Apple Silicon DMG',
  },
  {
    id: 'linux',
    name: 'Linux',
    badge: 'Ubuntu / Debian / AppImage',
    description: 'Portable AppImage build for modern Linux distributions without a complicated install flow.',
    icon: 'https://cdn.simpleicons.org/linux/f5c300',
    iconAlt: 'Linux logo',
    fileName: `AnimeVault Linux x64 v${VERSION}.AppImage`,
    url: releaseAssetUrl('AnimeVault-Linux-x64.AppImage'),
    note: 'Make executable, then run',
  },
  {
    id: 'android',
    name: 'Android',
    badge: 'Android 6+',
    description: 'Take AnimeVault anywhere with a mobile APK built from the same release pipeline.',
    icon: androidIcon,
    iconAlt: 'Android logo',
    fileName: `AnimeVault Android v${VERSION}.apk`,
    url: releaseAssetUrl('AnimeVault-Android.apk'),
    note: 'Side-load APK release',
  },
];

const features = [
  { icon: Sparkles, title: 'Fast Streaming', text: 'Watch anime instantly with ultra-low latency and a modern playback layout.' },
  { icon: Tv, title: 'Huge Library', text: 'Explore anime, dramas, movies, and manga from one responsive experience.' },
  { icon: Bookmark, title: 'Track Progress', text: 'Save watch history and continue from where you left off across sessions.' },
  { icon: Laptop, title: 'Desktop First', text: 'Installers are produced by CI, auto-tagged from package.json, and uploaded to GitHub Releases.' },
];

const Download = () => (
  <div className="app-shell download-page">
    <section className="download-hero" aria-labelledby="download-title">
      <div className="download-hero__backdrop" />
      <div className="download-hero__content">
        <span className="download-eyebrow"><DownloadCloud size={18} /> Official downloads</span>
        <h1 className="download-title gradient-text" id="download-title">Anime Vault</h1>
        <p className="download-subtitle">
          Download the latest AnimeVault release for Windows, macOS, Linux, and Android from GitHub Releases.
        </p>
        <div className="download-hero__meta" aria-label="Release details">
          <span><CheckCircle2 size={16} /> Latest release assets</span>
          <span><ShieldCheck size={16} /> Version {VERSION}</span>
        </div>
      </div>
    </section>

    <section className="downloads-section" aria-label="Platform downloads">
      <div className="download-section-heading">
        <span className="download-eyebrow">Choose your platform</span>
        <h2>Install AnimeVault</h2>
        <p>Each button points at the latest GitHub Release asset, so downloads update automatically after every successful main-branch installer build.</p>
      </div>

      <div className="platform-cards">
        {platforms.map((platform) => (
          <article className="glass-card platform-card" key={platform.id}>
            <div className="platform-card__shine" />
            <div className="platform-icon-container">
              <img src={platform.icon} alt={platform.iconAlt} className="platform-icon" />
            </div>
            <span className="platform-badge">{platform.badge}</span>
            <h3 className="platform-title">{platform.name}</h3>
            <p className="platform-desc">{platform.description}</p>
            <a
              href={platform.url}
              className="button-primary download-btn-gradient"
              aria-label={`Download AnimeVault for ${platform.name}`}
              rel="noopener noreferrer"
            >
              <DownloadCloud size={18} />
              <span>{platform.fileName}</span>
            </a>
            <small className="platform-note">{platform.note}</small>
          </article>
        ))}
      </div>
    </section>

    <section className="features-section" aria-label="App features">
      <div className="features-grid">
        {features.map(({ icon: Icon, title, text }) => (
          <article className="glass-card feature-card" key={title}>
            <Icon className="feature-icon" size={32} />
            <h3 className="feature-title">{title}</h3>
            <p className="feature-text">{text}</p>
          </article>
        ))}
      </div>
    </section>

    <footer className="download-footer">
      © 2026 Anime Vault • All Rights Reserved
    </footer>
  </div>
);

export default Download;
