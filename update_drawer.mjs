import fs from 'fs';

let jsxContent = fs.readFileSync('src/pages/AnimeDetails.jsx', 'utf8');

// 1. Re-add mobile-episodes-only to the mobile tab
jsxContent = jsxContent.replace(
  /{activeTab === 'episodes' && \(\s*<>\s*{totalPages > 1 && \(/,
  \`{activeTab === 'episodes' && (
              <div className="mobile-episodes-only">
                {totalPages > 1 && (\`
);

jsxContent = jsxContent.replace(
  /\s*<\/div>\s*<\/>\s*\)}/g,
  \`
                </div>
              </div>
            )}\`
);

// 2. We need to replace the episodes-grid-v2 rendering with rich cards in the mobile section.
// It currently looks like:
// <div className="episodes-grid-v2">
//   {visibleEpisodes.map(ep => (
//     <button ...>
//       <span className="episode-label">EP</span>
//       <span className="episode-number">{ep.number}</span>
//       ...
//     </button>
//   ))}
// </div>
// We'll rewrite this part entirely later in the script by just replacing the whole return chunk.

const newEpisodesGridStr = \`
                    <div className="rich-episodes-list">
                      {visibleEpisodes.map(ep => (
                        <button
                          key={ep.id}
                          className={\`rich-episode-card \${currentEpisode?.id === ep.id ? 'active' : ''} \${progress[anime.id] >= ep.number ? 'watched' : ''}\`}
                          onClick={() => selectEpisode(ep)}
                        >
                          <div className="ep-card-img">
                            <img 
                              src={ep.image || anime.bannerImage || anime.coverImage?.large} 
                              alt={\`Episode \${ep.number}\`} 
                              onError={(e) => { e.target.src = anime.coverImage?.large }}
                            />
                            <div className="ep-card-overlay">
                              <PlayCircle size={24} className="play-icon" />
                            </div>
                            {progress[anime.id] >= ep.number && <div className="watched-badge"><CheckCircle2 size={12} /> Watched</div>}
                          </div>
                          <div className="ep-card-info">
                            <span className="ep-card-number">Episode {ep.number}</span>
                            <span className="ep-card-title" title={ep.title || \`Episode \${ep.number}\`}>{ep.title || \`Episode \${ep.number}\`}</span>
                          </div>
                        </button>
                      ))}
                    </div>
\`;

// Actually, let's just do a string replace on the grid block.
// Wait, I can just replace the whole return statement of AnimeDetails to be perfectly sure.
// Since it's big, I'll just write a targeted replace for the grid.

jsxContent = jsxContent.replace(/<div className="episodes-grid-v2">[\s\S]*?<\/div>/, newEpisodesGridStr);

// 3. Re-add the sidebar at the end of new-player-grid
const sidebarContent = \`
        {/* RIGHT COLUMN: Desktop Sidebar */}
        <aside className="new-player-sidebar">
          {/* Desktop Episode Browser */}
          <div className="desktop-episodes-container details-section-v2">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0 }}>
                Episodes
                <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                  ({episodes.length})
                </span>
              </h2>
            </div>
            {totalPages > 1 && (
              <div className="ep-page-selector">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    className={\`ep-page-btn \${epPage === i ? 'active' : ''}\`}
                    onClick={() => setEpPage(i)}
                  >
                    {i * EP_PAGE_SIZE + 1}–{Math.min((i + 1) * EP_PAGE_SIZE, episodes.length)}
                  </button>
                ))}
              </div>
            )}
            <div className="episodes-container-v2">
              {visibleEpisodes.length > 0 ? (
                \${newEpisodesGridStr}
              ) : (
                <p>No episodes available for this title yet.</p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
\`;

// Replace the closing tags with the sidebar included.
jsxContent = jsxContent.replace(/<\/div>\s*<\/div>\s*\);\s*}\s*export default AnimeDetails;/, sidebarContent + '\\n  );\\n}\\n\\nexport default AnimeDetails;');

fs.writeFileSync('src/pages/AnimeDetails.jsx', jsxContent, 'utf8');

// Now update CSS
let cssContent = fs.readFileSync('src/styles.css', 'utf8');
cssContent = cssContent.replace(
  /.new-player-grid \{\s*display: grid;\s*grid-template-columns: 1fr;/,
  \`.new-player-grid {
  display: grid;
  grid-template-columns: 1fr 380px;\`
);

cssContent = cssContent.replace(
  /\/\* mobile-episodes-only removed \*\//,
  \`.mobile-episodes-only { display: none; }\`
);

// add rich episode card styles
cssContent += \`
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
console.log('Successfully updated AnimeDetails and styles');
