import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const timers = new Map();
const KEY = 'av_mobile_notification_permission';
const isNative = () => Capacitor.isNativePlatform();
const numericId = id => Math.abs(Number(id)) % 2147483647 || Math.floor(Math.random() * 2147483646) + 1;

export function notificationsEnabled() {
  try { return localStorage.getItem('av_notifications') !== 'false'; } catch { return true; }
}

export async function requestMobileNotificationPermission() {
  if (!notificationsEnabled()) return 'disabled';
  if (isNative()) {
    try {
      const current = await LocalNotifications.checkPermissions();
      if (current.display === 'granted') return 'granted';
      if (current.display === 'denied') return 'denied';
      const result = await LocalNotifications.requestPermissions();
      try { localStorage.setItem(KEY, result.display); } catch {}
      return result.display;
    } catch { return 'unsupported'; }
  }
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    const result = await Notification.requestPermission();
    try { localStorage.setItem(KEY, result); } catch {}
    return result;
  } catch { return 'denied'; }
}

export function showMobileNotification({ title, body, tag, url }) {
  if (!notificationsEnabled()) return false;
  if (isNative()) {
    LocalNotifications.schedule({ notifications: [{ id: numericId(tag || Date.now()), title, body, schedule: { at: new Date() }, extra: { url } }] }).catch(() => {});
    return true;
  }
  if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return false;
  try {
    const notification = new Notification(title, { body, tag: tag || 'animevault', icon: '/logo.png', badge: '/logo.png' });
    notification.onclick = () => { window.focus?.(); if (url && url.startsWith('/')) window.history.pushState({}, '', url); notification.close(); window.dispatchEvent(new PopStateEvent('popstate')); };
    return true;
  } catch { return false; }
}

export async function scheduleMobileNotification({ id, timestamp, title, body, url }) {
  if (!id || !timestamp || timestamp <= Date.now() || !notificationsEnabled()) return false;
  if (isNative()) {
    try {
      const permission = await requestMobileNotificationPermission();
      if (permission !== 'granted') return false;
      await LocalNotifications.cancel({ notifications: [{ id: numericId(id) }] });
      await LocalNotifications.schedule({ notifications: [{ id: numericId(id), title, body, schedule: { at: new Date(timestamp) }, extra: { url } }] });
      return true;
    } catch { return false; }
  }
  if (timers.has(id)) clearTimeout(timers.get(id));
  const scheduleNext = () => {
    const remaining = timestamp - Date.now();
    if (remaining <= 0) { timers.delete(id); showMobileNotification({ title, body, tag: `airing-${id}`, url }); return; }
    timers.set(id, setTimeout(scheduleNext, Math.min(remaining, 2147483647)));
  };
  scheduleNext();
  return true;
}

export async function cancelMobileNotification(id) {
  if (timers.has(id)) { clearTimeout(timers.get(id)); timers.delete(id); }
  if (isNative()) { try { await LocalNotifications.cancel({ notifications: [{ id: numericId(id) }] }); } catch {} }
}

export function cancelAllMobileNotifications() {
  timers.forEach(timer => clearTimeout(timer));
  timers.clear();
  if (isNative()) LocalNotifications.cancel({ notifications: [] }).catch(() => {});
}
