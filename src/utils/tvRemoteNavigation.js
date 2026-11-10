const CONTROL_SELECTOR = [
  'a[href]',
  'button:not(:disabled)',
  'input:not(:disabled)',
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  '[role="button"][tabindex]:not([aria-disabled="true"])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const DIRECTION_KEYS = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  Up: [0, -1],
  Down: [0, 1],
  Left: [-1, 0],
  Right: [1, 0],
};
const LEGACY_DIRECTION_KEYS = {
  37: [-1, 0],
  38: [0, -1],
  39: [1, 0],
  40: [0, 1],
};
const ACTIVATION_KEYS = ['Enter', 'NumpadEnter', ' ', 'Spacebar', 'Select', 'OK', 'Accept'];

function isTextEntry(element) {
  return element?.matches('input:not([type="button"]):not([type="submit"]):not([type="reset"]), textarea, [contenteditable="true"]');
}

function isFocusableCandidate(element) {
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;

  let current = element;
  while (current && current !== document.documentElement) {
    const style = window.getComputedStyle(current);
    if (style.visibility === 'hidden' || style.display === 'none' || style.opacity === '0' || style.pointerEvents === 'none') return false;
    current = current.parentElement;
  }
  return true;
}

function getControls() {
  const visibleModals = [...document.querySelectorAll('[aria-modal="true"], [role="dialog"], .av-v2-drawer.is-open, .mobile-menu')].filter(isFocusableCandidate);
  const modal = visibleModals[visibleModals.length - 1];
  const scope = modal || document;
  return [...scope.querySelectorAll(CONTROL_SELECTOR)].filter(element => {
    if (element.tabIndex < 0 || element.closest('[aria-hidden="true"], [inert]')) return false;
    return isFocusableCandidate(element);
  });
}

function centerOf(element) {
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function focus(element) {
  if (!element) return;
  try { element.focus({ preventScroll: true }); } catch { element.focus(); }
  const row = element.closest('[data-tv-scroll-row]');
  if (row) {
    const rowRect = row.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const inset = 12;
    if (elementRect.left < rowRect.left + inset) {
      row.scrollLeft -= rowRect.left + inset - elementRect.left;
    } else if (elementRect.right > rowRect.right - inset) {
      row.scrollLeft += elementRect.right - rowRect.right + inset;
    }
  }
  if (typeof element.scrollIntoView === 'function') {
    try { element.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' }); } catch { element.scrollIntoView(); }
  }
}

function focusFirstControl() {
  const controls = getControls();
  const preferred = controls.find(element => element.closest('main, .av-v2-content, .app-shell, .detail-page')) || controls[0];
  if (preferred) focus(preferred);
}

function findDirectionalTarget(current, candidates, dx, dy) {
  const origin = centerOf(current);
  let best = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    if (candidate === current) continue;
    const point = centerOf(candidate);
    const x = point.x - origin.x;
    const y = point.y - origin.y;
    const forward = x * dx + y * dy;
    if (forward <= 4) continue;
    const lateral = Math.abs(x * dy - y * dx);
    const score = forward + lateral * 1.8;
    if (score < bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  return best;
}

function getRowControls(row, controls) {
  return controls.filter(element => element.closest('[data-tv-scroll-row]') === row);
}

function findHomeRowTarget(current, controls, dy, currentRow) {
  const home = current.closest('.home-v2-reference');
  if (!home) return undefined;

  const rows = [...home.querySelectorAll('[data-tv-scroll-row]')]
    .filter(row => getRowControls(row, controls).length > 0);
  let targetRow;
  if (currentRow) {
    const rowIndex = rows.indexOf(currentRow);
    targetRow = rows[rowIndex + dy];
    if (!targetRow && dy < 0 && rowIndex === 0) {
      const heroControls = controls.filter(element => element.closest('.hero-v2'));
      return heroControls.reduce((nearest, candidate) => {
        if (!nearest) return candidate;
        return Math.abs(centerOf(candidate).x - centerOf(current).x) < Math.abs(centerOf(nearest).x - centerOf(current).x)
          ? candidate
          : nearest;
      }, null);
    }
  } else if (dy > 0 && current.closest('.hero-v2')) {
    targetRow = rows[0];
  }

  if (!targetRow) return null;
  return getRowControls(targetRow, controls).reduce((nearest, candidate) => {
    if (!nearest) return candidate;
    return Math.abs(centerOf(candidate).x - centerOf(current).x) < Math.abs(centerOf(nearest).x - centerOf(current).x)
      ? candidate
      : nearest;
  }, null);
}

function findRowTarget(current, controls, dy, currentRow = null) {
  const homeTarget = findHomeRowTarget(current, controls, dy, currentRow);
  if (homeTarget !== undefined) return homeTarget;

  const origin = centerOf(currentRow || current);
  const rows = [...new Set(controls
    .map(element => element.closest('[data-tv-scroll-row]'))
    .filter(row => row && row !== currentRow))]
    .map(row => ({ row, point: centerOf(row) }))
    .filter(({ point }) => (point.y - origin.y) * dy > 4)
    .sort((a, b) => Math.abs(a.point.y - origin.y) - Math.abs(b.point.y - origin.y));
  const targetRow = rows[0]?.row;
  if (!targetRow) return null;

  const originX = centerOf(current).x;
  return getRowControls(targetRow, controls).reduce((nearest, candidate) => {
    if (!nearest) return candidate;
    return Math.abs(centerOf(candidate).x - originX) < Math.abs(centerOf(nearest).x - originX)
      ? candidate
      : nearest;
  }, null);
}

export function installTvRemoteNavigation({ tvMode = true } = {}) {
  if (typeof window === 'undefined') return () => {};
  if (!tvMode) return () => {};

  const onKeyDown = event => {
    const active = document.activeElement;
    if (isTextEntry(active) || active?.tagName === 'SELECT') return;
    const direction = DIRECTION_KEYS[event.key] || LEGACY_DIRECTION_KEYS[event.keyCode];
    const activation = ACTIVATION_KEYS.includes(event.key) || event.keyCode === 13;
    if (event.repeat) {
      if (direction || activation) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }

    if (direction) {
      const controls = getControls();
      const current = controls.includes(active) ? active : null;
      const row = current?.closest('[data-tv-scroll-row]');
      let next;
      if (current && row && direction[0] !== 0) {
        const rowControls = getRowControls(row, controls);
        const index = rowControls.indexOf(current);
        next = rowControls[index + direction[0]] || null;
      } else if (current && direction[1] !== 0) {
        next = findRowTarget(current, controls, direction[1], row);
        if (!next && !current.closest('.home-v2-reference')) {
          next = findDirectionalTarget(current, controls, direction[0], direction[1]);
        }
      } else {
        const firstContentControl = controls.find(element => element.closest('main'));
        next = current
          ? findDirectionalTarget(current, controls, direction[0], direction[1])
          : firstContentControl || controls[0];
      }
      if (next) {
        event.preventDefault();
        event.stopImmediatePropagation();
        focus(next);
      } else if (row) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      return;
    }

    if (activation && active && active !== document.body) {
      if (active.matches('button, a[href], [role="button"], [tabindex]:not([tabindex="-1"])')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        active.click();
      }
    }
  };

  if (tvMode) {
    document.documentElement.classList.add('tv-mode');
    document.body.classList.add('tv-mode');
  }

  const focusOnReady = () => {
    const active = document.activeElement;
    if (!active || active === document.body || active === document.documentElement) {
      focusFirstControl();
    }
  };

  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('hashchange', focusOnReady);
  window.addEventListener('load', focusOnReady);
  setTimeout(focusOnReady, 150);
  return () => {
    window.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('hashchange', focusOnReady);
    window.removeEventListener('load', focusOnReady);
  };
}
