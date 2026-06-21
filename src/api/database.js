
// Fallback to localStorage since GitHub Pages is static hosting and Neon has CORS issues in browser
const STORAGE_KEYS = {
  REMINDERS: 'animevault_reminders',
  NOTIFICATIONS: 'animevault_notifications',
  SETTINGS: 'animevault_settings',
  USER_STATS: 'animevault_user_stats',
  FAVORITES: 'animevault_favorites',
  WATCH_HISTORY: 'animevault_watch_history',
  LEVEL: 'animevault_level',
  ACTIVITY: 'animevault_activity',
  POSTS: 'animevault_posts',
  FRIENDS: 'animevault_friends',
  FRIEND_REQUESTS: 'animevault_friend_requests'
};

// Initialize database tables (localStorage only)
export async function initializeDatabase() {
  console.log('Initializing localStorage storage');

  // Initialize localStorage items if they don't exist
  if (!localStorage.getItem(STORAGE_KEYS.REMINDERS)) {
    localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)) {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({}));
  }
  if (!localStorage.getItem(STORAGE_KEYS.USER_STATS)) {
    localStorage.setItem(STORAGE_KEYS.USER_STATS, JSON.stringify({
      totalWatchTime: 0,
      animeCompleted: 0,
      episodesWatched: 0
    }));
  }
  if (!localStorage.getItem(STORAGE_KEYS.FAVORITES)) {
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify({
      animes: [],
      studios: [],
      characters: []
    }));
  }
  if (!localStorage.getItem(STORAGE_KEYS.WATCH_HISTORY)) {
    localStorage.setItem(STORAGE_KEYS.WATCH_HISTORY, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.LEVEL)) {
    localStorage.setItem(STORAGE_KEYS.LEVEL, JSON.stringify({
      level: 1,
      xp: 0,
      xpToNextLevel: 100
    }));
  }
  if (!localStorage.getItem(STORAGE_KEYS.ACTIVITY)) {
    localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify({}));
  }
  if (!localStorage.getItem(STORAGE_KEYS.POSTS)) {
    localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.FRIENDS)) {
    localStorage.setItem(STORAGE_KEYS.FRIENDS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.FRIEND_REQUESTS)) {
    localStorage.setItem(STORAGE_KEYS.FRIEND_REQUESTS, JSON.stringify([]));
  }
  console.log('LocalStorage initialized successfully');
}

// Reminders CRUD
export async function getReminders() {
  try {
    const reminders = JSON.parse(localStorage.getItem(STORAGE_KEYS.REMINDERS) || '[]');
    return reminders.sort((a, b) => (a.airing_at || a.airingAt) - (b.airing_at || b.airingAt));
  } catch (error) {
    console.error('Error fetching reminders:', error);
    return [];
  }
}

export async function addReminder(reminder) {
  try {
    const reminders = JSON.parse(localStorage.getItem(STORAGE_KEYS.REMINDERS) || '[]');
    const newReminder = {
      id: Date.now(),
      schedule_id: reminder.scheduleId,
      anime_id: reminder.animeId,
      title: reminder.title,
      episode: reminder.episode,
      airing_at: reminder.airingAt,
      image: reminder.image,
      created_at: new Date().toISOString()
    };

    // Check if reminder already exists
    const exists = reminders.find(r => r.schedule_id === newReminder.schedule_id);
    if (!exists) {
      reminders.push(newReminder);
      localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(reminders));
    }

    return newReminder;
  } catch (error) {
    console.error('Error adding reminder:', error);
    return null;
  }
}

export async function removeReminder(scheduleId) {
  try {
    const reminders = JSON.parse(localStorage.getItem(STORAGE_KEYS.REMINDERS) || '[]');
    const filtered = reminders.filter(r => r.schedule_id !== scheduleId);
    localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error removing reminder:', error);
    return false;
  }
}

// Notifications CRUD
export async function getNotifications() {
  try {
    const notifications = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS) || '[]');
    return notifications.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}

export async function addNotification(notification) {
  try {
    const notifications = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS) || '[]');
    const newNotification = {
      id: Date.now(),
      type: notification.type,
      title: notification.title,
      description: notification.description,
      image: notification.image,
      time: notification.time,
      read: notification.read,
      created_at: new Date().toISOString()
    };
    notifications.unshift(newNotification);
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    return newNotification;
  } catch (error) {
    console.error('Error adding notification:', error);
    return null;
  }
}

export async function markNotificationAsRead(id) {
  try {
    const notifications = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS) || '[]');
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
    return updated.find(n => n.id === id);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return null;
  }
}

export async function dismissNotification(id) {
  try {
    const notifications = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS) || '[]');
    const filtered = notifications.filter(n => n.id !== id);
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error dismissing notification:', error);
    return false;
  }
}

// Settings CRUD
export async function getSettings() {
  try {
    const settings = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || '{}');
    return settings;
  } catch (error) {
    console.error('Error fetching settings:', error);
    return {};
  }
}

export async function updateSetting(key, value) {
  try {
    const settings = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || '{}');
    settings[key] = value;
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    return { key, value };
  } catch (error) {
    console.error('Error updating setting:', error);
    return null;
  }
}

// User Stats CRUD
export async function getUserStats() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_STATS) || '{}');
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return {};
  }
}

export async function updateUserStats(updates) {
  try {
    const stats = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_STATS) || '{}');
    const updatedStats = { ...stats, ...updates };
    localStorage.setItem(STORAGE_KEYS.USER_STATS, JSON.stringify(updatedStats));
    return updatedStats;
  } catch (error) {
    console.error('Error updating user stats:', error);
    return null;
  }
}

// Favorites CRUD
export async function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.FAVORITES) || '{}');
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return { animes: [], studios: [], characters: [] };
  }
}

export async function addFavorite(type, item) {
  try {
    const favorites = JSON.parse(localStorage.getItem(STORAGE_KEYS.FAVORITES) || '{}');
    if (!favorites[type].find(f => f.id === item.id)) {
      favorites[type].push(item);
      localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
    }
    return favorites;
  } catch (error) {
    console.error('Error adding favorite:', error);
    return null;
  }
}

export async function removeFavorite(type, itemId) {
  try {
    const favorites = JSON.parse(localStorage.getItem(STORAGE_KEYS.FAVORITES) || '{}');
    favorites[type] = favorites[type].filter(f => f.id !== itemId);
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
    return favorites;
  } catch (error) {
    console.error('Error removing favorite:', error);
    return null;
  }
}

export async function setFavoriteItem(type, item) {
  try {
    const favorites = JSON.parse(localStorage.getItem(STORAGE_KEYS.FAVORITES) || '{}');
    favorites[type] = [item]; // Set as primary favorite
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
    return favorites;
  } catch (error) {
    console.error('Error setting favorite:', error);
    return null;
  }
}

export async function getFavoriteItem(type) {
  try {
    const favorites = JSON.parse(localStorage.getItem(STORAGE_KEYS.FAVORITES) || '{}');
    return favorites[type]?.[0] || null;
  } catch (error) {
    console.error('Error getting favorite:', error);
    return null;
  }
}

// Watch History CRUD
export async function getWatchHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.WATCH_HISTORY) || '[]');
  } catch (error) {
    console.error('Error fetching watch history:', error);
    return [];
  }
}

export async function addWatchHistory(anime) {
  try {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.WATCH_HISTORY) || '[]');
    history.unshift({
      ...anime,
      watchedAt: new Date().toISOString()
    });
    // Keep only last 50 items
    const recentHistory = history.slice(0, 50);
    localStorage.setItem(STORAGE_KEYS.WATCH_HISTORY, JSON.stringify(recentHistory));
    return recentHistory;
  } catch (error) {
    console.error('Error adding watch history:', error);
    return null;
  }
}

// Level CRUD
export async function getLevel() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.LEVEL) || '{}');
  } catch (error) {
    console.error('Error fetching level:', error);
    return { level: 1, xp: 0, xpToNextLevel: 100 };
  }
}

export async function addXP(amount) {
  try {
    const levelData = JSON.parse(localStorage.getItem(STORAGE_KEYS.LEVEL) || '{}');
    let { level, xp, xpToNextLevel } = levelData;
    xp += amount;

    // Level up if needed
    while (xp >= xpToNextLevel) {
      xp -= xpToNextLevel;
      level += 1;
      xpToNextLevel = Math.floor(xpToNextLevel * 1.5);
    }

    const updatedLevel = { level, xp, xpToNextLevel };
    localStorage.setItem(STORAGE_KEYS.LEVEL, JSON.stringify(updatedLevel));
    return updatedLevel;
  } catch (error) {
    console.error('Error adding XP:', error);
    return null;
  }
}

// Activity CRUD
export async function getActivity() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITY) || '{}');
  } catch (error) {
    console.error('Error fetching activity:', error);
    return {};
  }
}

export async function addActivity() {
  try {
    const activity = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITY) || '{}');
    const today = new Date().toISOString().split('T')[0];
    activity[today] = (activity[today] || 0) + 1;
    localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(activity));
    return activity;
  } catch (error) {
    console.error('Error adding activity:', error);
    return null;
  }
}

// Posts CRUD
export async function getPosts() {
  try {
    const posts = JSON.parse(localStorage.getItem(STORAGE_KEYS.POSTS) || '[]');
    return posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (error) {
    console.error('Error fetching posts:', error);
    return [];
  }
}

export async function addPost(post) {
  try {
    const posts = JSON.parse(localStorage.getItem(STORAGE_KEYS.POSTS) || '[]');
    const newPost = {
      id: Date.now(),
      ...post,
      createdAt: new Date().toISOString(),
      likes: [],
      comments: [],
      shares: 0
    };
    posts.unshift(newPost);
    localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(posts));
    return newPost;
  } catch (error) {
    console.error('Error adding post:', error);
    return null;
  }
}

export async function toggleLikePost(postId, userId = 'current-user') {
  try {
    const posts = JSON.parse(localStorage.getItem(STORAGE_KEYS.POSTS) || '[]');
    const postIndex = posts.findIndex(p => p.id === postId);
    if (postIndex !== -1) {
      const post = posts[postIndex];
      const likeIndex = post.likes.indexOf(userId);
      if (likeIndex === -1) {
        post.likes.push(userId);
      } else {
        post.likes.splice(likeIndex, 1);
      }
      posts[postIndex] = post;
      localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(posts));
      return post;
    }
    return null;
  } catch (error) {
    console.error('Error toggling like:', error);
    return null;
  }
}

export async function addCommentToPost(postId, comment) {
  try {
    const posts = JSON.parse(localStorage.getItem(STORAGE_KEYS.POSTS) || '[]');
    const postIndex = posts.findIndex(p => p.id === postId);
    if (postIndex !== -1) {
      const post = posts[postIndex];
      post.comments.push({
        id: Date.now(),
        ...comment,
        createdAt: new Date().toISOString()
      });
      posts[postIndex] = post;
      localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(posts));
      return post;
    }
    return null;
  } catch (error) {
    console.error('Error adding comment:', error);
    return null;
  }
}

// Friends CRUD
export async function getFriends() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.FRIENDS) || '[]');
  } catch (error) {
    console.error('Error fetching friends:', error);
    return [];
  }
}

export async function addFriend(friend) {
  try {
    const friends = JSON.parse(localStorage.getItem(STORAGE_KEYS.FRIENDS) || '[]');
    // Check if already friends
    if (!friends.find(f => f.id === friend.id)) {
      friends.push({ ...friend, addedAt: new Date().toISOString() });
      localStorage.setItem(STORAGE_KEYS.FRIENDS, JSON.stringify(friends));
    }
    return friends;
  } catch (error) {
    console.error('Error adding friend:', error);
    return null;
  }
}

export async function removeFriend(friendId) {
  try {
    const friends = JSON.parse(localStorage.getItem(STORAGE_KEYS.FRIENDS) || '[]');
    const updatedFriends = friends.filter(f => f.id !== friendId);
    localStorage.setItem(STORAGE_KEYS.FRIENDS, JSON.stringify(updatedFriends));
    return updatedFriends;
  } catch (error) {
    console.error('Error removing friend:', error);
    return null;
  }
}

// Friend Requests CRUD
export async function getFriendRequests() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.FRIEND_REQUESTS) || '[]');
  } catch (error) {
    console.error('Error fetching friend requests:', error);
    return [];
  }
}

export async function sendFriendRequest(request) {
  try {
    const requests = JSON.parse(localStorage.getItem(STORAGE_KEYS.FRIEND_REQUESTS) || '[]');
    if (!requests.find(r => r.id === request.id || r.fromId === request.fromId)) {
      requests.push({
        ...request,
        id: Date.now(),
        createdAt: new Date().toISOString(),
        status: 'pending'
      });
      localStorage.setItem(STORAGE_KEYS.FRIEND_REQUESTS, JSON.stringify(requests));
    }
    return requests;
  } catch (error) {
    console.error('Error sending friend request:', error);
    return null;
  }
}

export async function acceptFriendRequest(requestId) {
  try {
    const requests = JSON.parse(localStorage.getItem(STORAGE_KEYS.FRIEND_REQUESTS) || '[]');
    const requestIndex = requests.findIndex(r => r.id === requestId);
    if (requestIndex !== -1) {
      const request = requests[requestIndex];
      request.status = 'accepted';
      requests[requestIndex] = request;
      localStorage.setItem(STORAGE_KEYS.FRIEND_REQUESTS, JSON.stringify(requests));

      // Add to friends
      const friends = JSON.parse(localStorage.getItem(STORAGE_KEYS.FRIENDS) || '[]');
      if (!friends.find(f => f.id === request.fromId)) {
        friends.push({
          id: request.fromId,
          name: request.fromName,
          avatar: request.fromAvatar,
          addedAt: new Date().toISOString()
        });
        localStorage.setItem(STORAGE_KEYS.FRIENDS, JSON.stringify(friends));
      }

      return { request, friends };
    }
    return null;
  } catch (error) {
    console.error('Error accepting friend request:', error);
    return null;
  }
}

export async function declineFriendRequest(requestId) {
  try {
    const requests = JSON.parse(localStorage.getItem(STORAGE_KEYS.FRIEND_REQUESTS) || '[]');
    const updatedRequests = requests.filter(r => r.id !== requestId);
    localStorage.setItem(STORAGE_KEYS.FRIEND_REQUESTS, JSON.stringify(updatedRequests));
    return updatedRequests;
  } catch (error) {
    console.error('Error declining friend request:', error);
    return null;
  }
}


