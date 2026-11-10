const CONTROL_SELECTOR = [
  'a[href]',
  'button:not(:disabled)',
  'input:not(:disabled)',
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  'iframe[title]',
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
  return element?.matches('input[type="text"], input[type="email"], input[type="password"], input[type="search"], input[type="url"], input[type="tel"], textarea, [contenteditable="true"]');
}

function isVisible(element) {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  if (rect.width <= 0 || rect.height <= 0 || style.visibility === 'hidden' || style.display === 'none' || style.opacity === '0' || style.pointerEvents === 'none') return false;

  const visibleRect = { left: Math.max(0, rect.left), top: Math.max(0, rect.top), right: Math.min(window.innerWidth, rect.right), bottom: Math.min(window.innerHeight, rect.bottom) };
  let parent = element.parentElement;
  while (parent && visibleRect.right > visibleRect.left && visibleRect.bottom > visibleRect.top) {
    const parentStyle = window.getComputedStyle(parent);
    const parentRect = parent.getBoundingClientRect();
    if (['hidden', 'clip', 'auto', 'scroll'].includes(parentStyle.overflowX)) {
      visibleRect.left = Math.max(visibleRect.left, parentRect.left);
      visibleRect.right = Math.min(visibleRect.right, parentRect.right);
    }
    if (['hidden', 'clip', 'auto', 'scroll'].includes(parentStyle.overflowY)) {
      visibleRect.top = Math.max(visibleRect.top, parentRect.top);
      visibleRect.bottom = Math.min(visibleRect.bottom, parentRect.bottom);
    }
    parent = parent.parentElement;
  }
  return visibleRect.right > visibleRect.left && visibleRect.bottom > visibleRect.top;
}

function getControls() {
  const visibleModals = [...document.querySelectorAll('[aria-modal="true"], [role="dialog"], .av-v2-drawer.is-open, .mobile-menu')].filter(isVisible);
  const modal = visibleModals[visibleModals.length - 1];
  const scope = modal || document;
  return [...scope.querySelectorAll(CONTROL_SELECTOR)].filter(element => {
    if (element.tabIndex < 0 || element.closest('[aria-hidden="true"], [inert]')) return false;
    return isVisible(element);
  });
}

function centerOf(element) {
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function focus(element) {
  if (!element) return;
  try { element.focus({ preventScroll: true }); } catch { element.focus(); }
  if (typeof element.scrollIntoView === 'function') {
    try { element.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' }); } catch { element.scrollIntoView(); }
  }
}

function scrollDirectional(current, dx, dy) {
  let parent = current?.parentElement;
  while (parent) {
    const style = window.getComputedStyle(parent);
    const canScrollX = ['auto', 'scroll'].includes(style.overflowX) && parent.scrollWidth > parent.clientWidth;
    const canScrollY = ['auto', 'scroll'].includes(style.overflowY) && parent.scrollHeight > parent.clientHeight;
    if ((dx && canScrollX) || (dy && canScrollY)) {
      parent.scrollBy({ left: dx * Math.round(parent.clientWidth * .7), top: dy * Math.round(parent.clientHeight * .7), behavior: 'smooth' });
      return true;
    }
    parent = parent.parentElement;
  }
  if (dy) {
    window.scrollBy({ top: dy * Math.round(window.innerHeight * .7), behavior: 'auto' });
    return true;
  }
  return false;
}

function moveWithinRow(current, row, direction) {
  if (!row || !direction) return null;
  const entries = [...row.querySelectorAll(CONTROL_SELECTOR)].filter(element => {
    if (element.matches(':disabled') || element.tabIndex < 0 || element.closest('[aria-hidden="true"], [inert]')) return false;
    let parent = element;
    while (parent && row.contains(parent)) {
      const style = window.getComputedStyle(parent);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      parent = parent.parentElement;
    }
    return true;
  });
  const index = entries.indexOf(current);
  return index < 0 ? null : entries[index + direction] || null;
}

function findDirectionalTarget(current, candidates, dx, dy) {
  const origin = centerOf(current);
  const row = dx ? current.closest('.auto-train-window, .av-mobile-card-rail, .hscroll, .media-all-grid, .ply-rail-scroll, .player-source-bar') : null;
  const rowCandidates = row ? candidates.filter(candidate => candidate !== current && row.contains(candidate)) : [];
  const pool = rowCandidates.length ? rowCandidates : candidates;
  let best = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const candidate of pool) {
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

export function installTvRemoteNavigation({ tvMode = true } = {}) {
  if (typeof window === 'undefined') return () => {};

  const onKeyDown = event => {
    const active = document.activeElement;
    if (isTextEntry(active) || active?.tagName === 'SELECT') return;
    const direction = DIRECTION_KEYS[event.key] || LEGACY_DIRECTION_KEYS[event.keyCode];
    const activation = ACTIVATION_KEYS.includes(event.key) || event.keyCode === 13;
    if ((event.key === 'Back' || event.key === 'GoBack' || event.keyCode === 461) && !isTextEntry(active)) {
      event.preventDefault();
      window.history.back();
      return;
    }
    if (event.repeat && activation) {
      if (activation) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }

    if (direction) {
      const controls = getControls();
      const current = controls.includes(active) ? active : null;
      if (current?.closest('.tv-navigation-rail') && direction[0] > 0) {
        const firstContentControl = controls.find(element => element.closest('.av-v2-content'));
        if (firstContentControl) { event.preventDefault(); event.stopPropagation(); focus(firstContentControl); }
        return;
      }
      if (current?.closest('.av-v2-content') && direction[0] < 0) {
        const currentRect = current.getBoundingClientRect();
        if (currentRect.left <= 100) {
          const activeNav = document.querySelector('.tv-navigation-item[aria-current="page"]') || document.querySelector('.tv-navigation-item');
          if (activeNav) { event.preventDefault(); event.stopPropagation(); focus(activeNav); return; }
        }
      }
      const firstContentControl = controls.find(element => element.closest('main'));
      const next = current
        ? findDirectionalTarget(current, controls, direction[0], direction[1])
        : firstContentControl || controls[0];
      if (next) {
        event.preventDefault();
        event.stopPropagation();
        focus(next);
      } else if (current && direction[0]) {
        const row = current.closest('.auto-train-window, .av-mobile-card-rail, .hscroll, .media-all-grid, .ply-rail-scroll, .player-source-bar');
        const rowTarget = moveWithinRow(current, row, direction[0]);
        const edgeNav = direction[0] < 0 && row && rowTarget == null
          ? document.querySelector('.tv-navigation-item[aria-current="page"]')
          : null;
        if (rowTarget || edgeNav) {
          event.preventDefault();
          event.stopPropagation();
          focus(rowTarget || edgeNav);
        } else if (scrollDirectional(current, direction[0], direction[1])) {
          event.preventDefault();
          event.stopPropagation();
        }
      } else if (current && scrollDirectional(current, direction[0], direction[1])) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }

    if (activation && active && active !== document.body) {
      if (active.matches('button, a[href], [role="button"]')) {
        event.preventDefault();
        event.stopPropagation();
        active.click();
      }
    }
  };

  if (tvMode) {
    document.documentElement.classList.add('tv-mode');
    document.body.classList.add('tv-mode');
  }
  window.addEventListener('keydown', onKeyDown, true);
  return () => window.removeEventListener('keydown', onKeyDown, true);
}
