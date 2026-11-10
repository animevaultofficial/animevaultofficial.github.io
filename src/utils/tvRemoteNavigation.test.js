import { afterEach, describe, expect, it, vi } from 'vitest';
import { installTvRemoteNavigation } from './tvRemoteNavigation';

describe('TV remote navigation', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('moves focus into cards that are outside a horizontal rail viewport', () => {
    document.body.innerHTML = `
      <main>
        <div class="auto-train-window" data-tv-scroll-row>
          <div class="auto-train-group">
            <a id="first" href="#first">First anime</a>
            <a id="next" href="#next">Next anime</a>
          </div>
        </div>
      </main>
    `;

    const row = document.querySelector('.auto-train-window');
    const first = document.querySelector('#first');
    const next = document.querySelector('#next');
    row.getBoundingClientRect = () => ({ left: 0, top: 80, right: 300, bottom: 340, width: 300, height: 260 });
    first.getBoundingClientRect = () => ({ left: 20, top: 100, right: 180, bottom: 300, width: 160, height: 200 });
    next.getBoundingClientRect = () => ({ left: 1200, top: 100, right: 1360, bottom: 300, width: 160, height: 200 });

    const uninstall = installTvRemoteNavigation();
    first.focus();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));

    expect(document.activeElement).toBe(next);
    expect(row.scrollLeft).toBeGreaterThan(0);
    uninstall();
  });

  it('moves Down from hero actions into the first poster row', () => {
    document.body.innerHTML = `
      <main>
        <section class="home-v2-reference">
        <section class="hero-v2">
          <button id="hero-action">Play</button>
        </section>
        <div id="first-row" data-tv-scroll-row>
          <a id="left-card" href="#left">Left anime</a>
          <a id="nearest-card" href="#nearest">Nearest anime</a>
        </div>
        <div id="second-row" data-tv-scroll-row>
          <a id="later-card" href="#later">Later anime</a>
        </div>
        </section>
      </main>
    `;

    const heroAction = document.querySelector('#hero-action');
    const firstRow = document.querySelector('#first-row');
    const secondRow = document.querySelector('#second-row');
    const leftCard = document.querySelector('#left-card');
    const nearestCard = document.querySelector('#nearest-card');
    heroAction.getBoundingClientRect = () => ({ left: 180, top: 240, right: 280, bottom: 280, width: 100, height: 40 });
    firstRow.getBoundingClientRect = () => ({ left: 0, top: 120, right: 400, bottom: 260, width: 400, height: 140 });
    secondRow.getBoundingClientRect = () => ({ left: 0, top: 300, right: 400, bottom: 440, width: 400, height: 140 });
    leftCard.getBoundingClientRect = () => ({ left: 10, top: 140, right: 110, bottom: 240, width: 100, height: 100 });
    nearestCard.getBoundingClientRect = () => ({ left: 170, top: 140, right: 270, bottom: 240, width: 100, height: 100 });

    const uninstall = installTvRemoteNavigation();
    heroAction.focus();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));

    expect(document.activeElement).toBe(nearestCard);
    uninstall();
  });

  it('moves between poster rows to the nearest card and scrolls it into view', () => {
    document.body.innerHTML = `
      <main>
        <section class="home-v2-reference">
        <div id="current-row" data-tv-scroll-row>
          <a id="current-card" href="#current">Current anime</a>
        </div>
        <div id="next-row" data-tv-scroll-row>
          <a id="far-card" href="#far">Far anime</a>
          <a id="nearest-card" href="#nearest">Nearest anime</a>
        </div>
        </section>
      </main>
    `;

    const currentRow = document.querySelector('#current-row');
    const nextRow = document.querySelector('#next-row');
    const currentCard = document.querySelector('#current-card');
    const farCard = document.querySelector('#far-card');
    const nearestCard = document.querySelector('#nearest-card');
    currentRow.getBoundingClientRect = () => ({ left: 0, top: 80, right: 400, bottom: 220, width: 400, height: 140 });
    nextRow.getBoundingClientRect = () => ({ left: 0, top: 240, right: 400, bottom: 380, width: 400, height: 140 });
    currentCard.getBoundingClientRect = () => ({ left: 180, top: 100, right: 280, bottom: 200, width: 100, height: 100 });
    farCard.getBoundingClientRect = () => ({ left: 20, top: 260, right: 120, bottom: 360, width: 100, height: 100 });
    nearestCard.getBoundingClientRect = () => ({ left: 190, top: 260, right: 290, bottom: 360, width: 100, height: 100 });
    nearestCard.scrollIntoView = vi.fn();

    const uninstall = installTvRemoteNavigation();
    currentCard.focus();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));

    expect(document.activeElement).toBe(nearestCard);
    expect(nearestCard.scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', inline: 'nearest', behavior: 'auto' });

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(currentCard);
    uninstall();
  });

  it('uses poster-row order even when overlapping hero layout breaks geometric scoring', () => {
    document.body.innerHTML = `
      <main>
        <section class="home-v2-reference">
          <section class="hero-v2"><button id="hero-action">Play</button></section>
          <div id="weekly" data-tv-scroll-row><a id="weekly-card" href="#weekly">Weekly</a></div>
          <div id="recent" data-tv-scroll-row><a id="recent-card" href="#recent">Recent</a></div>
        </section>
      </main>
    `;

    const heroAction = document.querySelector('#hero-action');
    const weekly = document.querySelector('#weekly');
    const weeklyCard = document.querySelector('#weekly-card');
    const recent = document.querySelector('#recent');
    const recentCard = document.querySelector('#recent-card');
    heroAction.getBoundingClientRect = () => ({ left: 180, top: 300, right: 280, bottom: 340, width: 100, height: 40 });
    weekly.getBoundingClientRect = () => ({ left: 0, top: 200, right: 400, bottom: 340, width: 400, height: 140 });
    recent.getBoundingClientRect = () => ({ left: 0, top: 360, right: 400, bottom: 500, width: 400, height: 140 });
    weeklyCard.getBoundingClientRect = () => ({ left: 140, top: 220, right: 240, bottom: 320, width: 100, height: 100 });
    recentCard.getBoundingClientRect = () => ({ left: 140, top: 380, right: 240, bottom: 480, width: 100, height: 100 });
    const uninstall = installTvRemoteNavigation();

    heroAction.focus();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(weeklyCard);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(recentCard);
    uninstall();
  });

  it('does not wrap horizontal focus at either end of a card row', () => {
    document.body.innerHTML = `
      <main>
        <div data-tv-scroll-row>
          <div class="auto-train-group">
            <a id="first" href="#first">First anime</a>
            <a id="last" href="#last">Last anime</a>
          </div>
        </div>
      </main>
    `;

    const first = document.querySelector('#first');
    const last = document.querySelector('#last');
    first.getBoundingClientRect = () => ({ left: 20, top: 100, right: 180, bottom: 300, width: 160, height: 200 });
    last.getBoundingClientRect = () => ({ left: 190, top: 100, right: 350, bottom: 300, width: 160, height: 200 });
    const uninstall = installTvRemoteNavigation();

    first.focus();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(first);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(last);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(last);
    uninstall();
  });

  it('activates the focused card with the remote select key', () => {
    document.body.innerHTML = '<main><a id="card" href="#card">Anime card</a></main>';
    const card = document.querySelector('#card');
    const handleClick = vi.fn(event => event.preventDefault());
    const conflictingHandler = vi.fn();
    card.addEventListener('click', handleClick);
    card.getBoundingClientRect = () => ({ left: 20, top: 100, right: 180, bottom: 300, width: 160, height: 200 });
    const uninstall = installTvRemoteNavigation();
    window.addEventListener('keydown', conflictingHandler, true);

    card.focus();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Select', bubbles: true, cancelable: true }));

    expect(handleClick).toHaveBeenCalledTimes(2);
    expect(conflictingHandler).not.toHaveBeenCalled();
    window.removeEventListener('keydown', conflictingHandler, true);
    uninstall();
  });

  it('leaves key handling unchanged outside TV mode', () => {
    document.body.innerHTML = '<main><a id="card" href="#card">Anime card</a></main>';
    const card = document.querySelector('#card');
    card.getBoundingClientRect = () => ({ left: 20, top: 100, right: 180, bottom: 300, width: 160, height: 200 });
    const uninstall = installTvRemoteNavigation({ tvMode: false });

    card.focus();
    const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(card);
    uninstall();
  });

  it('does not focus controls inside hidden or aria-hidden content', () => {
    document.body.innerHTML = `
      <main>
        <button id="visible">Visible</button>
        <button aria-hidden="true">Hidden</button>
      </main>
    `;

    const visible = document.querySelector('#visible');
    const hidden = document.querySelector('[aria-hidden="true"]');
    visible.getBoundingClientRect = () => ({ left: 20, top: 20, right: 120, bottom: 60, width: 100, height: 40 });
    hidden.getBoundingClientRect = () => ({ left: 140, top: 20, right: 240, bottom: 60, width: 100, height: 40 });

    const uninstall = installTvRemoteNavigation();
    visible.focus();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));

    expect(document.activeElement).toBe(visible);
    uninstall();
  });
});
