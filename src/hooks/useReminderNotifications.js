import { useEffect, useRef } from 'react';
import { useUser } from '../api/UserContext';
import { log } from '../utils/logger';

export function useReminderNotifications() {
  const { user, reminders, removeReminder } = useUser();
  const notifiedRemindersRef = useRef(new Set(JSON.parse(localStorage.getItem('notified_reminders') || '[]')));

  useEffect(() => {
    if (!user || !reminders || reminders.length === 0) return;

    // Check permissions
    if (Notification.permission !== 'granted') {
      return;
    }

    const checkReminders = () => {
      const nowSeconds = Math.floor(Date.now() / 1000);
      const notifiedSet = notifiedRemindersRef.current;
      let stateChanged = false;

      reminders.forEach((reminder) => {
        const airingAt = parseInt(reminder.airing_at, 10);
        
        // If it's airing now or has aired within the last hour
        if (nowSeconds >= airingAt && nowSeconds <= airingAt + 3600) {
          const reminderId = String(reminder.schedule_id);

          if (!notifiedSet.has(reminderId)) {
            // Trigger Notification
            const n = new Notification(`Episode Released!`, {
              body: `${reminder.media_title} Episode ${reminder.episode} is now airing!`,
              icon: reminder.media_poster || '/logo.png',
              badge: '/logo.png'
            });

            n.onclick = () => {
              window.focus();
              n.close();
            };

            notifiedSet.add(reminderId);
            stateChanged = true;
            log(`[Notifications] Sent push notification for ${reminder.media_title} Ep ${reminder.episode}`);
            
            // Optionally auto-remove it from the DB since it aired
            // removeReminder(reminder.schedule_id); 
          }
        }
      });

      if (stateChanged) {
        localStorage.setItem('notified_reminders', JSON.stringify(Array.from(notifiedSet)));
      }
    };

    // Check immediately on mount/reminders change
    checkReminders();

    // Check every 30 seconds
    const interval = setInterval(checkReminders, 30000);

    return () => clearInterval(interval);
  }, [user, reminders]);
}
