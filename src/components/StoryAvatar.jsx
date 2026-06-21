import React, { useState, useEffect, useRef } from 'react';
import { getActiveStories } from '../api/db';
import StoryViewerModal from './StoryViewerModal';
import NoteUploadModal from './NoteUploadModal';
import { Music, Play, Pause } from 'lucide-react';

export default function StoryAvatar({ user, viewerId, size = 70, style = {}, onAvatarClick }) {
  const [storiesData, setStoriesData] = useState({ stories: [], allViewed: true, note: null });
  const [showViewer, setShowViewer] = useState(false);
  const [showNoteUpload, setShowNoteUpload] = useState(false);
  const [playingMusic, setPlayingMusic] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!user?.id) return;
    getActiveStories(user.id, viewerId).then(setStoriesData);
  }, [user?.id, viewerId]);

  const hasStories = storiesData.stories.length > 0;
  const isUnread = !storiesData.allViewed;

  const ringStyle = hasStories ? {
    background: isUnread 
      ? 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)'
      : 'linear-gradient(45deg, #555, #777)',
    padding: '4px',
    borderRadius: '50%',
    cursor: 'pointer'
  } : {
    padding: '0',
    borderRadius: '50%',
    cursor: onAvatarClick ? 'pointer' : 'default',
    border: '4px solid #0f0f19'
  };

  const handleClick = (e) => {
    if (hasStories) {
      e.preventDefault();
      setShowViewer(true);
    } else if (onAvatarClick) {
      onAvatarClick(e);
    }
  };

  const handleViewerClose = () => {
    setShowViewer(false);
    getActiveStories(user.id, viewerId).then(setStoriesData);
  };

  const handleNoteClose = (success) => {
    setShowNoteUpload(false);
    if (success) getActiveStories(user.id, viewerId).then(setStoriesData);
  };

  if (!user) return null;

  const isOwn = user?.id === viewerId;
  const noteObj = storiesData.note;
  const noteContent = noteObj ? (typeof noteObj === 'string' ? noteObj : noteObj.content) : null;
  const songData = noteObj && typeof noteObj === 'object' ? noteObj.songData : null;

  const toggleMusic = (e) => {
    e.stopPropagation();
    if (playingMusic) {
      audioRef.current?.pause();
      setPlayingMusic(false);
    } else {
      audioRef.current?.play();
      setPlayingMusic(true);
    }
  };

  const renderNoteBubble = () => {
    if (noteContent || songData) {
      return (
        <div style={{
          position: 'absolute', top: '-12px', left: '50%', transform: 'translate(-50%, -100%)',
          background: '#0a0a14', color: '#fff', padding: '5px 10px', borderRadius: '14px',
          fontSize: '0.7rem', fontWeight: 'bold', maxWidth: '220px', whiteSpace: 'normal', wordBreak: 'break-word',
          zIndex: 30, boxShadow: '0 4px 15px rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)',
          cursor: isOwn ? 'pointer' : 'default', textAlign: 'center', lineHeight: '1.4'
        }} onClick={e => { if(isOwn) { e.stopPropagation(); setShowNoteUpload(true); }}}
        >
          {noteContent && <span>{noteContent}</span>}
          
          {songData && (
            <div 
              onClick={isOwn ? undefined : toggleMusic}
              style={{ 
                marginTop: noteContent ? '6px' : '0', paddingTop: noteContent ? '6px' : '0', borderTop: noteContent ? '1px solid rgba(255,255,255,0.1)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--brand-color)',
                fontSize: '0.7rem', cursor: isOwn ? 'default' : 'pointer'
              }}
            >
              {playingMusic ? <Pause size={12} /> : <Music size={12} />}
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80px' }}>{songData.title}</span>
            </div>
          )}

          <div style={{ position: 'absolute', bottom: '-5px', left: '50%', transform: 'translateX(-50%) rotate(45deg)', width: '10px', height: '10px', background: '#0a0a14', borderRight: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)', zIndex: -1 }} />
        </div>
      );
    }
    if (isOwn) {
      return (
        <div style={{
          position: 'absolute', top: '-10px', left: '50%', transform: 'translate(-50%, -100%)',
          background: 'rgba(10,10,20,0.8)', color: '#fff', padding: '6px 12px', borderRadius: '14px',
          fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.2)',
          cursor: 'pointer', zIndex: 30, backdropFilter: 'blur(5px)'
        }} onClick={e => { e.stopPropagation(); setShowNoteUpload(true); }}>
          + Note
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {songData && <audio ref={audioRef} src={songData.audioUrl} onEnded={() => setPlayingMusic(false)} />}
      
      {renderNoteBubble()}
      <div style={{ ...ringStyle, width: size, height: size, flexShrink: 0, ...style }} onClick={handleClick}>
        <div style={{ 
          width: '100%', height: '100%', borderRadius: '50%', 
          overflow: 'hidden', border: hasStories ? '2px solid #0f0f19' : 'none',
          background: '#1a1a2e'
        }}>
          <img 
            src={user.avatar || '/logo.png'} 
            alt={user.username || 'User'} 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            onError={e => e.target.src = '/logo.png'} 
          />
        </div>
      </div>
      
      {showViewer && hasStories && (
        <StoryViewerModal 
          stories={storiesData.stories} 
          user={user} 
          viewerId={viewerId} 
          onClose={handleViewerClose}          />
      )}
      
      {showNoteUpload && (
        <NoteUploadModal user={user} onClose={handleNoteClose} />
      )}
    </div>
  );
}
