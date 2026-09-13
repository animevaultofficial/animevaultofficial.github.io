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
    badge: 'Windows 10 / 11 • x64',
    description: 'Native desktop installer for 64-bit Windows PCs.',
    icon: windowsIcon,
    iconAlt: 'Windows logo',
    fileName: `AnimeVault Windows x64 v${VERSION}.exe`,
    url: releaseAssetUrl('AnimeVault-Windows-x64.exe'),
    note: 'Latest Windows installer',
  },
  {
    id: 'mac-arm64',
    name: 'macOS',
    badge: 'Apple Silicon • arm64',
    description: 'DMG installer for Macs with Apple Silicon processors.',
    icon: 'https://img.icons8.com/color/512/mac-os.png',
    iconAlt: 'macOS logo',
    fileName: `AnimeVault macOS Apple Silicon v${VERSION}.dmg`,
    url: releaseAssetUrl('AnimeVault-macOS-arm64.dmg'),
    note: 'Apple Silicon DMG',
  },
  {
    id: 'mac-x64',
    name: 'macOS Intel',
    badge: 'Intel • x64',
    description: 'DMG installer for Intel-based Mac computers.',
    icon: 'https://img.icons8.com/color/512/mac-os.png',
    iconAlt: 'macOS logo',
    fileName: `AnimeVault macOS Intel v${VERSION}.dmg`,
    url: releaseAssetUrl('AnimeVault-macOS-x64.dmg'),
    note: 'Intel DMG',
  },
  {
    id: 'linux',
    name: 'Linux',
    badge: 'x86_64 • AppImage',
    description: 'Portable AppImage for modern 64-bit Linux distributions.',
    icon: 'https://cdn.simpleicons.org/linux/f5c300',
    iconAlt: 'Linux logo',
    fileName: `AnimeVault Linux x64 v${VERSION}.AppImage`,
    url: releaseAssetUrl('AnimeVault-Linux-x86_64.AppImage'),
    note: 'Make executable, then run',
  },
  {
    id: 'linux-deb',
    name: 'Linux Debian',
    badge: 'Debian / Ubuntu • amd64',
    description: 'Native Debian package for Debian and Ubuntu-based systems.',
    icon: 'https://cdn.simpleicons.org/linux/f5c300',
    iconAlt: 'Linux logo',
    fileName: `AnimeVault Linux amd64 v${VERSION}.deb`,
    url: releaseAssetUrl('AnimeVault-Linux-amd64.deb'),
    note: 'Install with your package manager',
  },
  {
    id: 'android',
    name: 'Android',
    badge: 'Android 6+',
    description: 'Official Android APK built from the AnimeVault release pipeline.',
    icon: androidIcon,
    iconAlt: 'Android logo',
    fileName: `AnimeVault Android v${VERSION}.apk`,
    url: releaseAssetUrl('Anime.Vault.apk'),
    note: 'Side-load APK release',
  },
];

const features = [
  { icon: Sparkles, title: 'Fast Streaming', text: 'Watch anime instantly with ultra-low latency and a modern playback layout.' },
  { icon: Tv, title: 'Huge Library', text: 'Explore anime, dramas, movies, and TV shows from one responsive experience.' },
  { icon: Bookmark, title: 'Track Progress', text: 'Save watch history and continue from where you left off across sessions.' },
  { icon: Laptop, title: 'Always Up To Date', text: 'Every download button targets the latest GitHub Release asset.' },
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
        <p>Every button points to the matching asset in the latest GitHub Release, so the download page stays current after successful builds.</p>
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
