import fs from 'fs';

const cssContent = `
/* ── CUSTOM VIDEO PLAYER UI ── */
.av-custom-player {
  position: relative;
  width: 100%;
  height: 100%;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
}

.av-custom-player [data-media-provider] {
  width: 100%;
  height: 100%;
}

.av-controls {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
  z-index: 10;
}

/* Show controls when interacting, hovering, or paused */
.av-custom-player[data-controls] .av-controls,
.av-custom-player[data-paused] .av-controls {
  opacity: 1;
  pointer-events: auto;
}

.av-controls-scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 20%, transparent 70%, rgba(0,0,0,0.8) 100%);
  pointer-events: none;
  z-index: -1;
}

.av-controls-top {
  padding: 1.5rem;
  display: flex;
  justify-content: flex-start;
  transform: translateY(-20px);
  transition: transform 0.3s ease;
}

.av-custom-player[data-controls] .av-controls-top,
.av-custom-player[data-paused] .av-controls-top {
  transform: translateY(0);
}

.av-player-title {
  margin: 0;
  color: #fff;
  font-size: 1.25rem;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0,0,0,0.8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.av-controls-bottom {
  padding: 0 1.5rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  transform: translateY(20px);
  transition: transform 0.3s ease;
}

.av-custom-player[data-controls] .av-controls-bottom,
.av-custom-player[data-paused] .av-controls-bottom {
  transform: translateY(0);
}

.av-controls-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.av-toolbar-left, .av-toolbar-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

/* Buttons */
.av-btn {
  background: none;
  border: none;
  color: #fff;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  position: relative;
}

.av-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: scale(1.1);
}

/* Button states (Vidstack handles these via [data-active], [data-paused], etc) */
.av-btn[data-state="paused"] .vds-icon-pause { display: none; }
.av-btn[data-state="playing"] .vds-icon-play { display: none; }
.av-btn[data-state="muted"] .vds-icon-volume { display: none; }
.av-btn[data-state="unmuted"] .vds-icon-mute { display: none; }
.av-btn[data-active] .vds-icon-enter { display: none; }
.av-btn:not([data-active]) .vds-icon-exit { display: none; }

/* Sliders */
.av-slider {
  position: relative;
  width: 100%;
  height: 24px;
  display: flex;
  align-items: center;
  cursor: pointer;
  touch-action: none;
}

.av-volume-slider {
  width: 80px;
}

.av-slider-track {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  position: relative;
  overflow: hidden;
}

.av-slider-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: var(--brand-color);
  transform-origin: left center;
  will-change: transform;
}

.av-slider-progress {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: rgba(255, 255, 255, 0.5);
  transform-origin: left center;
  will-change: transform;
}

.av-slider-thumb {
  position: absolute;
  top: 50%;
  left: 0;
  width: 14px;
  height: 14px;
  background: #fff;
  border-radius: 50%;
  transform: translate(-50%, -50%) scale(0);
  transition: transform 0.2s ease;
  box-shadow: 0 0 10px rgba(0,0,0,0.5);
  will-change: left;
}

.av-slider:hover .av-slider-thumb,
.av-slider[data-dragging] .av-slider-thumb {
  transform: translate(-50%, -50%) scale(1);
}

.av-time-display {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.85rem;
  font-family: monospace;
  font-weight: 500;
  display: flex;
  gap: 4px;
  align-items: center;
}

.av-time-sep {
  opacity: 0.5;
}

/* Quality Badge specific to custom layout */
.custom-quality {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  z-index: 20;
}

@media (max-width: 768px) {
  .av-volume-slider, 
  .av-btn:has(.vds-icon-volume) {
    display: none;
  }
  .av-controls-top {
    padding: 1rem;
  }
  .av-player-title {
    font-size: 1rem;
  }
  .av-controls-bottom {
    padding: 0 1rem 1rem;
  }
}
`;

fs.appendFileSync('src/styles.css', '\n' + cssContent);
console.log('Appended custom player styles to src/styles.css');
