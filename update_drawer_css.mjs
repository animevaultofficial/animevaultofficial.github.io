import fs from 'fs';

let cssContent = fs.readFileSync('src/styles.css', 'utf8');

// Restore grid template
cssContent = cssContent.replace(
  /.new-player-grid \{\s*display: grid;\s*grid-template-columns: 1fr;/g,
  \`.new-player-grid {
  display: grid;
  grid-template-columns: 1fr 380px;\`
);

// Add missing rules directly
cssContent += \`

/* Hide mobile episodes tab wrapper on desktop */
.mobile-episodes-only {
  display: none;
}

/* ── RICH EPISODE CARDS ── */
.rich-episodes-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.rich-episode-card {
  display: flex;
  gap: 1rem;
  background: var(--glass);
  border: 1px solid transparent;
  border-radius: 12px;
  padding: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  align-items: center;
  color: var(--text-primary);
  width: 100%;
}

.rich-episode-card:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: var(--glass-border);
}

.rich-episode-card.active {
  background: rgba(255, 26, 117, 0.1);
  border-color: var(--brand-color);
}

.ep-card-img {
  position: relative;
  width: 120px;
  height: 68px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  background: #1a1a1a;
}

.ep-card-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.rich-episode-card:hover .ep-card-img img {
  transform: scale(1.05);
}

.ep-card-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.rich-episode-card:hover .ep-card-overlay,
.rich-episode-card.active .ep-card-overlay {
  opacity: 1;
}

.play-icon {
  color: #fff;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
}

.rich-episode-card.active .play-icon {
  color: var(--brand-color);
}

.watched-badge {
  position: absolute;
  top: 4px;
  left: 4px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  font-size: 0.6rem;
  padding: 2px 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 2px;
}

.watched-badge .lucide {
  color: #0f0;
}

.ep-card-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  overflow: hidden;
}

.ep-card-number {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-weight: 600;
  text-transform: uppercase;
}

.ep-card-title {
  font-size: 0.9rem;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 1024px) {
  .new-player-sidebar { display: none; }
  .mobile-episodes-only { display: block; }
}

@media (max-width: 480px) {
  .ep-card-img {
    width: 100px;
    height: 56px;
  }
}
\`;

fs.writeFileSync('src/styles.css', cssContent, 'utf8');
console.log('Appended styles for grid and rich episodes');
