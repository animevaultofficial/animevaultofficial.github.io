import { useEffect } from 'react';
import { useUser } from '../../api/UserContext';
import { notificationsEnabled, scheduleMobileNotification } from './mobileNotifications';

export default function ReminderBridge() {
  const { reminders } = useUser();

  useEffect(() => {
    const restore = () => {
      if (!notificationsEnabled()) return;
      (reminders || []).forEach(reminder => {
        const timestamp = Number(reminder?.airing_at || reminder?.airingAt || 0) * 1000;
        if (!reminder?.id || !timestamp || timestamp <= Date.now()) return;
        scheduleMobileNotification({
          id: reminder.id,
          timestamp,
          title: `${reminder.title || 'Anime'} is airing`,
          body: `Episode ${reminder.episode || ''} is now available.`.trim(),
          url: `/anime/${reminder.anime_id || reminder.animeId || ''}`,
        });
      });
    };
    restore();
    document.addEventListener('visibilitychange', restore);
    return () => document.removeEventListener('visibilitychange', restore);
  }, [reminders]);

  return null;
}
