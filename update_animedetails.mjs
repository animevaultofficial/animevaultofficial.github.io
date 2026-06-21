import fs from 'fs';

const filePath = 'src/pages/AnimeDetails.jsx';
let content = fs.readFileSync(filePath, 'utf8');

const newReturn = `
  return (
    <div className="new-player-container">
      <div className="new-player-grid">
        {/* LEFT COLUMN: Player & Main Info */}
        <div className="new-player-main">
          
          {/* ── Video Player ── */}
          <div className="player-section-v2">
            {!user ? (
              <div className="video-player-error">
                <PlayCircle size={48} />
                <p>Login required to watch!</p>
                <button
                  className="btn-play-v2"
                  onClick={() => {
                    setAuthTab('login');
                    setShowAuthModal(true);
                  }}
                >
                  Login Now
                </button>
              </div>
            ) : currentEpisode ? (
              <VideoPlayer
                sources={[]}
                poster={anime.bannerImage || anime.coverImage?.extraLarge}
                title={\`\${animeTitle} · EP \${currentEpisode.number}\`}
                key={embedUrl || currentEpisode.id}
                embedUrl={embedUrl}
                isZen={zenMode}
              />
            ) : (
              <div className="video-player-error">
                <PlayCircle size={48} className="spin" />
                <p>No episodes available yet.</p>
              </div>
            )}

            {/* Player status message */}
            {user && playerStatus && (
              <div className="player-status-bar">
                <AlertCircle size={14} />
                <span>{playerStatus}</span>
              </div>
            )}

            {/* Fallback External Link for broken iframes */}
            {user && embedUrl && (
              <div style={{ display: 'flex', justifyContent: 'center', margin: '1rem 0' }}>
                <a
                  href={embedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-info-v2"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '0.6rem 1.5rem',
                    background: 'var(--brand-color)',
                    color: '#fff',
                    textDecoration: 'none',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                  }}
                >
                  <ExternalLink size={16} /> Open Player in New Tab (Bypasses Blocks)
                </a>
              </div>
            )}
            
            {animeDownloadUrls && (
              <div className="anime-download-row">
                <span>DOWNLOAD:</span>
                <a href={animeDownloadUrls.dlhub} target="_blank" rel="noopener noreferrer" className="download-chip dlhub">
                  <Download size={14} /> DLHub
                </a>
              </div>
            )}

            {/* ── Language Selector ── */}
            {user && currentEpisode && (
              <div className="server-selector-v2">
                <div className="server-info">
                  <Tv size={20} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h4 style={{ margin: 0 }}>{activeEmbedServer.label || 'Anime Player'}</h4>
                      <button
                        className={\`zen-toggle-v2 \${zenMode ? 'active' : ''}\`}
                        onClick={() => setZenMode(!zenMode)}
                        title={zenMode ? 'Turn off Ad-Blocker' : 'Turn on Ad-Blocker (Zen Mode)'}
                      >
                        <Zap size={14} fill={zenMode ? 'currentColor' : 'none'} />
                        {zenMode ? 'Zen Mode ON' : 'Zen Mode OFF'}
                      </button>
                    </div>
                    <p>Pick a large-library server, then choose SUB/DUB/HINDI.</p>
                  </div>
                </div>

                <div className="server-controls" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {EMBED_SERVERS.map((server) => (
                    <button
                      key={server.id}
                      className={\`download-chip \${embedServer === server.id ? 'active' : ''}\`}
                      title={server.description}
                      style={{
                        padding: '0.5rem 1rem',
                        fontSize: '0.85rem',
                        fontWeight: 'bold',
                        background: embedServer === server.id ? 'var(--brand-color)' : 'var(--glass)',
                        color: embedServer === server.id ? '#fff' : 'var(--text-secondary)',
                        borderColor: embedServer === server.id ? 'var(--brand-color)' : 'var(--glass-border)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                      onClick={() => selectEmbedServer(server.id)}
                    >
                      {server.label}
                    </button>
                  ))}
                  <button
                    className="download-chip"
                    style={{
                      padding: '0.5rem 1rem',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      background: 'var(--glass)',
                      color: 'var(--text-secondary)',
                      borderColor: 'var(--glass-border)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                    onClick={switchToNextServer}
                  >
                    Try next server
                  </button>
                  {EMBED_LANGUAGE_OPTIONS.map(({ id: lang, label }) => (
                    <button
                      key={lang}
                      className={\`download-chip \${language === lang ? 'active' : ''}\`}
                      style={{
                        padding: '0.5rem 1.2rem',
                        textTransform: 'uppercase',
                        fontSize: '0.85rem',
                        fontWeight: 'bold',
                        background: language === lang ? 'var(--brand-color)' : 'var(--glass)',
                        color: language === lang ? '#fff' : 'var(--text-secondary)',
                        borderColor: language === lang ? 'var(--brand-color)' : 'var(--glass-border)',
                        boxShadow: language === lang ? '0 0 10px rgba(255,26,117,0.4)' : 'none',
                        transition: 'all 0.2s ease',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                      onClick={() => selectLanguage(lang)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Title & Meta ── */}
          <div className="new-player-meta-section">
            <h1 className="new-player-title">{animeTitle}</h1>
            <div className="new-player-badges">
              <span className="badge score"><Star size={14} fill="currentColor" /> {anime.averageScore}%</span>
              <span className="badge type"><Tv size={14} /> {anime.format}</span>
              <span className="badge status"><Users size={14} /> {anime.status}</span>
              {anime.seasonYear && <span className="badge year"><Calendar size={14} /> {anime.seasonYear}</span>}
            </div>
            
            <div className="new-player-actions">
              <button
                className="btn-play-v2"
                onClick={() => {
                  if (!user) {
                    setAuthTab('login');
                    setShowAuthModal(true);
                    return;
                  }
                  if (episodes.length > 0) selectEpisode(episodes[0]);
                }}
              >
                <Play size={20} fill="currentColor" /> Watch Now
              </button>
              <button 
                className="btn-info-v2"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  color: isLiked(anime.id, 'anime') ? '#ff1a75' : 'var(--text-secondary)',
                  borderColor: isLiked(anime.id, 'anime') ? '#ff1a75' : 'var(--glass-border)',
                  background: isLiked(anime.id, 'anime') ? 'rgba(255,26,117,0.1)' : 'var(--glass)',
                  boxShadow: isLiked(anime.id, 'anime') ? '0 0 10px rgba(255,26,117,0.2)' : 'none',
                  transition: 'all 0.2s ease', cursor: 'pointer'
                }}
                onClick={() => toggleLike(anime.id, 'anime', safeTitle(anime.title), anime.coverImage?.large)}
              >
                <Heart size={20} fill={isLiked(anime.id, 'anime') ? '#ff1a75' : 'none'} /> 
                {isLiked(anime.id, 'anime') ? 'Favorited' : 'Add to Collection'}
              </button>
            </div>
          </div>

          {/* ── Tabs Navigation ── */}
          <div className="new-player-tabs-nav">
            <button className={\`tab-btn \${activeTab === 'episodes' ? 'active' : ''}\`} onClick={() => setActiveTab('episodes')}>Episodes</button>
            <button className={\`tab-btn \${activeTab === 'info' ? 'active' : ''}\`} onClick={() => setActiveTab('info')}>Info</button>
            <button className={\`tab-btn \${activeTab === 'community' ? 'active' : ''}\`} onClick={() => setActiveTab('community')}>Community</button>
          </div>

          {/* ── Tab Content ── */}
          <div className="new-player-tab-content">
            {activeTab === 'episodes' && (
              <div className="mobile-episodes-only">
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
                    <div className="episodes-grid-v2">
                      {visibleEpisodes.map(ep => (
                        <button
                          key={ep.id}
                          className={\`episode-btn-v2 \${currentEpisode?.id === ep.id ? 'active' : ''} \${progress[anime.id] >= ep.number ? 'watched' : ''}\`}
                          onClick={() => selectEpisode(ep)}
                        >
                          <span className="episode-label">EP</span>
                          <span className="episode-number">{ep.number}</span>
                          {progress[anime.id] >= ep.number && <CheckCircle2 size={12} className="check" />}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p>No episodes available for this title yet.</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'info' && (
              <div className="info-tab-content">
                <div className="details-section-v2">
                  <h2>Synopsis</h2>
                  <p>{stripHtml(anime.description)}</p>
                </div>
                {anime.relations?.nodes?.length > 0 && (() => {
                  const SHOW_TYPES = ['PREQUEL', 'SEQUEL', 'PARENT', 'SIDE_STORY', 'SUMMARY'];
                  const filtered = anime.relations.nodes
                    .map((rel, i) => ({ rel, type: anime.relations.edges[i]?.relationType }))
                    .filter(({ type }) => SHOW_TYPES.includes(type));
                  if (!filtered.length) return null;
                  return (
                    <div className="details-section-v2">
                      <h2>Seasons & Related</h2>
                      <div className="relations-grid-v2">
                        {filtered.map(({ rel, type }) => (
                          <Link key={rel.id} to={\`/anime/\${rel.id}\`} className="relation-card-v2">
                            <div className="relation-image">
                              <img src={rel.coverImage?.large} alt={safeTitle(rel.title)} />
                              <span className="relation-type">{type.replace('_', ' ')}</span>
                            </div>
                            <div className="relation-info">
                              <h4>{safeTitle(rel.title)}</h4>
                              <span>{rel.format} · {rel.status}</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })()}
                
                <div className="sidebar-block-v2">
                  <h3>Details</h3>
                  <div className="info-list-v2">
                    <div className="info-row-v2">
                      <span className="info-label-v2">Native Title</span>
                      <span className="info-value-v2">{anime.title?.native}</span>
                    </div>
                    <div className="info-row-v2">
                      <span className="info-label-v2">Studios</span>
                      <span className="info-value-v2">{anime.studios?.nodes?.map(n => n.name).join(', ')}</span>
                    </div>
                    <div className="info-row-v2">
                      <span className="info-label-v2">Episodes</span>
                      <span className="info-value-v2">
                        {anime.nextAiringEpisode
                          ? \`\${anime.nextAiringEpisode.episode - 1} aired / \${anime.episodes || '?'} total\`
                          : anime.episodes || 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'community' && (
              <CommentsSection mediaId={anime.id} />
            )}
          </div>
        </div>

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
                <div className="episodes-grid-v2">
                  {visibleEpisodes.map(ep => (
                        <button
                          key={ep.id}
                          className={\`episode-btn-v2 \${currentEpisode?.id === ep.id ? 'active' : ''} \${progress[anime.id] >= ep.number ? 'watched' : ''}\`}
                          onClick={() => selectEpisode(ep)}
                        >
                          <span className="episode-label">EP</span>
                          <span className="episode-number">{ep.number}</span>
                          {progress[anime.id] >= ep.number && <CheckCircle2 size={12} className="check" />}
                        </button>
                  ))}
                </div>
              ) : (
                <p>No episodes available for this title yet.</p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default AnimeDetails;
`;

const markerRegex = /^\s*return\s*\(\s*<div\s+className="details-page-v2"\s*>/m;
const match = content.match(markerRegex);

if (match) {
  const beforeReturn = content.substring(0, match.index);
  const newContent = beforeReturn + newReturn;
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log('Successfully updated AnimeDetails.jsx with proper bounds');
} else {
  console.log('Could not find the specific return statement marker.');
}
