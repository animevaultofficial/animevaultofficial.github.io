const fs = require('fs');

const cssToAdd = \`
/* ── SERVER & LANG SELECTORS V2 ── */
.server-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 10px;
}

.server-group,
.lang-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.server-btn-v2,
.lang-btn-v2 {
  padding: 8px 16px;
  font-size: 0.85rem;
  font-weight: 700;
  border-radius: 8px;
  cursor: pointer;
  background: var(--glass);
  color: var(--text-secondary);
  border: 1px solid var(--glass-border);
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);
}

.lang-btn-v2 {
  text-transform: uppercase;
}

.server-btn-v2:hover,
.lang-btn-v2:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.server-btn-v2.active,
.lang-btn-v2.active {
  background: var(--brand-color);
  color: #fff;
  border-color: var(--brand-color);
  box-shadow: 0 4px 12px rgba(255, 26, 117, 0.3);
}

@media (min-width: 640px) {
  .server-controls {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
}
\`;

fs.appendFileSync('src/styles.css', '\\n' + cssToAdd);
console.log('Appended server and lang buttons CSS successfully!');
