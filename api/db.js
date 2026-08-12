// api/db.js
// Server-side DB API for AnimeVault
// Exposes REST endpoints under /api/db/*
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const sql = neon(process.env.DATABASE_URL);

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'hash_' + Math.abs(hash).toString(36);
}

async function getSql() {
  return sql;
}

function json(res, status, obj) {
  res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(obj));
}

export default async function handler(req, res) {
  const url = req.url || '';
  try {
    // Route matching
    if (req.method === 'POST' && url === '/api/db/signup') {
      const body = await getBody(req);
      const { username, password } = body || {};
      if (!username || !password) return json(res, 400, { success: false, message: 'Missing fields' });
      if (password.length < 6) return json(res, 400, { success: false, message: 'Password must be at least 6 characters.' });
      const trimmed = String(username).trim().toLowerCase().split('@')[0];
      const db = await getSql();
      try {
        const existing = await db`SELECT id FROM users WHERE LOWER(username) = LOWER(${trimmed})`;
        if (existing.length) return json(res, 400, { success: false, message: 'Username already taken.' });
        const hashed = await bcrypt.hash(password, 12);
     const result = await db`
  INSERT INTO users (username, password, is_admin)
  VALUES (${trimmed}, ${hashed}, false)
  ON CONFLICT (username)
  DO UPDATE SET username = EXCLUDED.username
  RETURNING id, username, avatar, banner, is_admin
`;
        const user = result[0];
        return json(res, 200, { success: true, user });
      } catch (e) {
        console.error('signup error', e);
        return json(res, 500, { success: false, message: 'Internal error' });
      }
    }

    if (req.method === 'POST' && url === '/api/db/login') {
      const body = await getBody(req);
      const { username, password } = body || {};
      if (!username || !password) return json(res, 400, { success: false, message: 'Missing fields' });
      const trimmed = String(username).trim().toLowerCase().split('@')[0];
      const db = await getSql();
      try {
        const result = await db`
          SELECT id, username, password, avatar, banner, is_admin, is_verified, two_factor_enabled FROM users
          WHERE LOWER(username) = LOWER(${trimmed})
        `;
        if (!result.length) return json(res, 401, { success: false, message: 'Invalid username or password' });
        const userRow = result[0];
        const stored = userRow.password || '';
        let valid = false;
        if (stored.startsWith('hash_')) {
          valid = (simpleHash(password) === stored);
        } else {
          valid = await bcrypt.compare(password, stored);
        }
        if (!valid) return json(res, 401, { success: false, message: 'Invalid username or password' });
        const { password: _p, ...safeUser } = userRow;
        return json(res, 200, { success: true, user: safeUser });
      } catch (e) {
        console.error('login error', e);
        return json(res, 500, { success: false, message: 'Internal error' });
      }
    }

    if (req.method === 'GET' && url.startsWith('/api/db/user/')) {
      const id = url.replace('/api/db/user/', '').split('?')[0];
      if (!id) return json(res, 400, { success: false, message: 'Missing id' });
      const db = await getSql();
      try {
        const result = await db`
          SELECT id, username, avatar, banner, is_admin, is_verified, two_factor_enabled, created_at FROM users WHERE id = ${Number(id)}
        `;
        if (!result.length) return json(res, 404, { success: false, message: 'Not found' });
        return json(res, 200, { success: true, user: result[0] });
      } catch (e) {
        console.error('get user', e);
        return json(res, 500, { success: false, message: 'Internal error' });
      }
    }

    if (req.method === 'POST' && url === '/api/db/searchUsers') {
      const body = await getBody(req);
      const { query = '', viewerId = null } = body || {};
      const db = await getSql();
      try {
        const q = `%${String(query || '').trim()}%`;
        const results = await db`
          SELECT id, username, avatar, banner FROM users WHERE username ILIKE ${q} ORDER BY created_at DESC LIMIT 50
        `;
        return json(res, 200, { success: true, users: results });
      } catch (e) {
        console.error('searchUsers', e);
        return json(res, 500, { success: false, message: 'Internal error' });
      }
    }

    if (req.method === 'POST' && url === '/api/db/follow') {
      const body = await getBody(req);
      const { followerId, targetId } = body || {};
      if (!followerId || !targetId) return json(res, 400, { success: false });
      const db = await getSql();
      try {
        await db`INSERT INTO user_follows (follower_id, following_id) VALUES (${followerId}, ${targetId}) ON CONFLICT DO NOTHING`;
        return json(res, 200, { success: true });
      } catch (e) { console.error('follow', e); return json(res, 500, { success: false }); }
    }

    if (req.method === 'POST' && url === '/api/db/unfollow') {
      const body = await getBody(req);
      const { followerId, targetId } = body || {};
      if (!followerId || !targetId) return json(res, 400, { success: false });
      const db = await getSql();
      try {
        await db`DELETE FROM user_follows WHERE follower_id = ${followerId} AND following_id = ${targetId}`;
        return json(res, 200, { success: true });
      } catch (e) { console.error('unfollow', e); return json(res, 500, { success: false }); }
    }

    if (req.method === 'POST' && url === '/api/db/block') {
      const body = await getBody(req);
      const { blockerId, targetId } = body || {};
      if (!blockerId || !targetId) return json(res, 400, { success: false });
      const db = await getSql();
      try {
        await db`DELETE FROM user_follows WHERE (follower_id = ${blockerId} AND following_id = ${targetId}) OR (follower_id = ${targetId} AND following_id = ${blockerId})`;
        await db`INSERT INTO user_blocks (blocker_id, blocked_id) VALUES (${blockerId}, ${targetId}) ON CONFLICT DO NOTHING`;
        return json(res, 200, { success: true });
      } catch (e) { console.error('block', e); return json(res, 500, { success: false }); }
    }

    if (req.method === 'POST' && url === '/api/db/unblock') {
      const body = await getBody(req);
      const { blockerId, targetId } = body || {};
      if (!blockerId || !targetId) return json(res, 400, { success: false });
      const db = await getSql();
      try {
        await db`DELETE FROM user_blocks WHERE blocker_id = ${blockerId} AND blocked_id = ${targetId}`;
        return json(res, 200, { success: true });
      } catch (e) { console.error('unblock', e); return json(res, 500, { success: false }); }
    }

    if (req.method === 'POST' && url === '/api/db/uploadStory') {
      const body = await getBody(req);
      const { userId, mediaUrl, mediaType, hoursToExpire = 24, caption = '' } = body || {};
      if (!userId || !mediaUrl) return json(res, 400, { success: false });
      const db = await getSql();
      try {
        const expiresAt = new Date(Date.now() + hoursToExpire * 60 * 60 * 1000).toISOString();
        await db`INSERT INTO stories (user_id, media_url, media_type, expires_at, caption) VALUES (${userId}, ${mediaUrl}, ${mediaType}, ${expiresAt}, ${caption})`;
        return json(res, 200, { success: true });
      } catch (e) { console.error('uploadStory', e); return json(res, 500, { success: false }); }
    }

    if (req.method === 'GET' && url.startsWith('/api/db/stories/')) {
      const parts = url.split('/');
      const userId = parts[parts.length - 1].split('?')[0];
      const viewerParam = (req.url || '').split('viewerId=')[1];
      const viewerId = viewerParam ? Number(viewerParam) : null;
      const db = await getSql();
      try {
        const now = new Date().toISOString();
        const stories = await db`SELECT id, user_id, media_url, media_type, expires_at, caption FROM stories WHERE user_id = ${Number(userId)} AND expires_at > ${now}`;
        // Determine allViewed by checking views table (if exists) - best effort
        let allViewed = true;
        if (viewerId) {
          try {
            const viewed = await db`SELECT story_id FROM story_views WHERE viewer_id = ${viewerId} AND story_id = ANY(${stories.map(s => s.id)})`;
            const viewedIds = new Set(viewed.map(v => v.story_id));
            allViewed = stories.every(s => viewedIds.has(s.id));
          } catch {}
        }
        return json(res, 200, { success: true, stories, allViewed, note: null });
      } catch (e) { console.error('getActiveStories', e); return json(res, 500, { success: false, stories: [], allViewed: true, note: null }); }
    }

    if (req.method === 'POST' && url === '/api/db/addNote') {
      const body = await getBody(req);
      const { userId, content, hoursToExpire = 24, songData = null } = body || {};
      if (!userId || (!content && !songData)) return json(res, 400, { success: false });
      const db = await getSql();
      try {
        const expiresAt = new Date(Date.now() + hoursToExpire * 60 * 60 * 1000).toISOString();
        const songDataStr = songData ? JSON.stringify(songData) : null;
        await db`DELETE FROM notes WHERE user_id = ${userId}`;
        await db`INSERT INTO notes (user_id, content, expires_at, song_data) VALUES (${userId}, ${content}, ${expiresAt}, ${songDataStr})`;
        return json(res, 200, { success: true });
      } catch (e) { console.error('addNote', e); return json(res, 500, { success: false }); }
    }

    if (req.method === 'GET' && url.startsWith('/api/db/comments/')) {
      const mediaId = url.replace('/api/db/comments/', '').split('?')[0];
      const db = await getSql();
      try {
        const comments = await db`SELECT id, user_id, username, content, created_at FROM media_comments WHERE media_id = ${mediaId} ORDER BY created_at DESC`;
        return json(res, 200, { success: true, comments });
      } catch (e) { console.error('fetchMediaComments', e); return json(res, 500, { success: false, comments: [] }); }
    }

    if (req.method === 'POST' && url === '/api/db/addComment') {
      const body = await getBody(req);
      const { userId, username, mediaId, content } = body || {};
      if (!userId || !username || !mediaId || !content) return json(res, 400, { success: false });
      const db = await getSql();
      try {
        const result = await db`INSERT INTO media_comments (user_id, username, media_id, content) VALUES (${userId}, ${username}, ${mediaId}, ${content}) RETURNING id, user_id, username, media_id, content, created_at`;
        return json(res, 200, { success: true, comment: result[0] });
      } catch (e) { console.error('addMediaComment', e); return json(res, 500, { success: false }); }
    }

    if (req.method === 'POST' && url === '/api/db/deleteComment') {
      const body = await getBody(req);
      const { commentId, userId } = body || {};
      if (!commentId || !userId) return json(res, 400, { success: false });
      const db = await getSql();
      try {
        await db`DELETE FROM media_comments WHERE id = ${commentId} AND user_id = ${userId}`;
        return json(res, 200, { success: true });
      } catch (e) { console.error('deleteMediaComment', e); return json(res, 500, { success: false }); }
    }

    // If no route matched
    return json(res, 404, { error: 'Not found' });
  } catch (e) {
    console.error('api/db unexpected', e);
    return json(res, 500, { error: 'Internal server error' });
  }
}

function getBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try {
        const parsed = data ? JSON.parse(data) : {};
        resolve(parsed);
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}
