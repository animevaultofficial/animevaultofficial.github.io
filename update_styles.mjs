import fs from 'fs';

const cssContent = `
/* ── NEW PLAYER UI STYLES ── */
.new-player-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem;
  padding-top: 80px; /* Offset for header */
}

.new-player-grid {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 2rem;
  align-items: start;
}

.new-player-main {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.new-player-sidebar {
  display: block;
}

.desktop-episodes-container {
  background: var(--glass);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  padding: 1.5rem;
  height: calc(100vh - 120px);
  position: sticky;
  top: 90px;
  overflow-y: auto;
}

/* Hide mobile episodes on desktop */
.mobile-episodes-only {
  display: none;
}

.new-player-meta-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.new-player-title {
  font-size: 2rem;
  font-weight: 800;
  margin: 0;
  line-height: 1.2;
}

.new-player-badges {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.new-player-badges .badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0.4rem 0.8rem;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.new-player-badges .badge.score {
  color: #ffaa00;
  border-color: rgba(255, 170, 0, 0.3);
  background: rgba(255, 170, 0, 0.1);
}

.new-player-actions {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
  flex-wrap: wrap;
}

.new-player-tabs-nav {
  display: flex;
  gap: 1rem;
  border-bottom: 1px solid var(--glass-border);
  padding-bottom: 0.5rem;
}

.new-player-tabs-nav .tab-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  padding: 0.5rem 1rem;
  border-bottom: 3px solid transparent;
  transition: all 0.2s ease;
}

.new-player-tabs-nav .tab-btn.active {
  color: var(--brand-color);
  border-bottom-color: var(--brand-color);
}

.new-player-tab-content {
  padding-top: 1rem;
}

.info-tab-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

@media (max-width: 1024px) {
  .new-player-grid {
    grid-template-columns: 1fr;
  }
  
  .new-player-sidebar {
    display: none;
  }
  
  .mobile-episodes-only {
    display: block;
  }
  
  .new-player-container {
    padding: 1rem 0;
  }
  
  .new-player-meta-section, 
  .new-player-tabs-nav, 
  .new-player-tab-content {
    padding: 0 1rem;
  }

  .new-player-title {
    font-size: 1.5rem;
  }

  .new-player-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
  
  .new-player-actions button {
    width: 100%;
    justify-content: center;
  }
}
`;

fs.appendFileSync('src/styles.css', '\\n' + cssContent);
console.log('Appended styles to src/styles.css');
