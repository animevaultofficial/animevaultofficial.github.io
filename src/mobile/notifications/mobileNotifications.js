const timers = new Map();
const KEY = 'av_mobile_notification_permission';

export function notificationsEnabled() {
  try { return localStorage.getItem('av_notifications') !== 'false'; } catch { return true; }
}

export async function requestMobileNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  if (!notificationsEnabled()) return 'disabled';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  const result = await Notification.requestPermission();
  try { localStorage.setItem(KEY, result); } catch {}
  return result;
}

export function showMobileNotification({ title, body, tag, url }) {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (!notificationsEnabled() || Notification.permission !== 'granted') return false;
  try {
    const notification = new Notification(title, { body, tag: tag || 'animevault', icon: '/logo.png', badge: '/logo.png' });
    notification.onclick = () => {
      window.focus?.();
      if (url && url.startsWith('/')) window.history.pushState({}, '', url);
      notification.close();
      window.dispatchEvent(new PopStateEvent('popstate'));
    };
    return true;
  } catch { return false; }
}

export function scheduleMobileNotification({ id, timestamp, title, body, url }) {
  if (!id || !timestamp || timestamp <= Date.now()) return false;
  if (timers.has(id)) clearTimeout(timers.get(id));
  const delay = Math.min(timestamp - Date.now(), 2147483647);
  const timer = setTimeout(() => {
    timers.delete(id);
    showMobileNotification({ title, body, tag: `airing-${id}`, url });
  }, delay);
  timers.set(id, timer);
  return true;
}

export function cancelMobileNotification(id) {
  if (!timers.has(id)) return;
  clearTimeout(timers.get(id));
  timers.delete(id);
}

export function cancelAllMobileNotifications() {
  timers.forEach(timer => clearTimeout(timer));
  timers.clear();
}
