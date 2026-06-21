const STORAGE_PREFIX = 'av_mobile_';

export const storage = {
  get(key) {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_PREFIX + key));
    } catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value)); } catch {}
  },
  remove(key) {
    try { localStorage.removeItem(STORAGE_PREFIX + key); } catch {}
  }
};

// Continue watching - stored locally
const CW_KEY = 'continue_watching';

export function getContinueWatching() {
  return storage.get(CW_KEY) || [];
}

export function addContinueWatching(anime) {
  const list = getContinueWatching().filter(item => item.id !== anime.id);
  list.unshift({ ...anime, timestamp: Date.now() });
  storage.set(CW_KEY, list.slice(0, 20));
  return list;
}

// Favorites / collections
const FAV_KEY = 'favorites';

export function getFavorites() {
  return storage.get(FAV_KEY) || [];
}

export function toggleFavorite(anime) {
  let list = getFavorites();
  const idx = list.findIndex(a => a.id === anime.id);
  if (idx >= 0) {
    list.splice(idx, 1);
  } else {
    list.unshift({ id: anime.id, title: anime.title, image: anime.image, timestamp: Date.now() });
  }
  storage.set(FAV_KEY, list);
  return list;
}

export function isFavorite(id) {
  return getFavorites().some(a => a.id === id);
}