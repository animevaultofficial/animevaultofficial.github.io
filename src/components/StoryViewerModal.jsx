import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { markStoryViewed } from '../api/db';

export default function StoryViewerModal({ stories, user, viewerId, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const currentStory = stories[currentIndex];
  
  const videoRef = useRef(null);

  useEffect(() => {
    // Mark as viewed
    if (viewerId && currentStory) {
      markStoryViewed(currentStory.id, viewerId);
    }
  }, [currentIndex, viewerId, currentStory]);

  useEffect(() => {
    if (isPaused || !currentStory) return;

    let timer;
    if (currentStory.media_type === 'image') {
      const duration = 5000; // 5 seconds
      const interval = 50; // update every 50ms
      const step = (interval / duration) * 100;
      
      timer = setInterval(() => {
        setProgress(p => {
          if (p + step >= 100) {
            handleNext();
            return 0;
          }
          return p + step;
        });
      }, interval);
    }

    return () => clearInterval(timer);
  }, [currentIndex, isPaused, currentStory]);

  // Handle video progress via onTimeUpdate
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(p);
    }
  };

  const handleVideoEnded = () => {
    handleNext();
  };

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(i => i + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
      setProgress(0);
    } else {
      setProgress(0);
    }
  };

  const handleTap = (e) => {
    const width = window.innerWidth;
    const x = e.clientX;
    if (x < width * 0.3) {
      handlePrev();
    } else {
      handleNext();
    }
  };

  if (!currentStory) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999, background: '#000',
      display: 'flex', flexDirection: 'column', touchAction: 'none'
    }}>
      {/* Progress Bars */}
      <div style={{ display: 'flex', gap: '4px', padding: '10px', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
        {stories.map((s, i) => (
          <div key={i} style={{ flex: 1, height: '3px', background: 'rgba(255,255,255,0.3)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', background: '#fff',
              width: i < currentIndex ? '100%' : i === currentIndex ? `${progress}%` : '0%',
              transition: currentStory.media_type === 'image' && !isPaused ? 'width 50ms linear' : 'none'
            }} />
          </div>
        ))}
      </div>

      {/* Header Info */}
      <div style={{ position: 'absolute', top: '20px', left: '10px', right: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src={user.avatar || '/logo.png'} style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid #fff' }} />
          <span style={{ color: '#fff', fontWeight: 'bold', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>{user.username}</span>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
            {Math.round((Date.now() - new Date(currentStory.created_at)) / (1000 * 60 * 60))}h
          </span>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '10px' }}>
          <X size={28} style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }} />
        </button>
      </div>

      {/* Media Content */}
      <div 
        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
        onPointerDown={(e) => { setIsPaused(true); if(videoRef.current) videoRef.current.pause(); }}
        onPointerUp={(e) => { setIsPaused(false); if(videoRef.current) videoRef.current.play(); handleTap(e); }}
        onPointerCancel={() => { setIsPaused(false); if(videoRef.current) videoRef.current.play(); }}
      >
        {currentStory.media_type === 'image' ? (
          <img src={currentStory.media_url} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} draggable="false" />
        ) : (
          <video 
            ref={videoRef} src={currentStory.media_url} autoPlay playsInline 
            onTimeUpdate={handleTimeUpdate} onEnded={handleVideoEnded}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        )}
        
        {currentStory.caption && (
          <div style={{
            position: 'absolute', bottom: '10%', left: '5%', right: '5%',
            background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '15px', borderRadius: '16px',
            textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold', backdropFilter: 'blur(10px)',
            pointerEvents: 'none', textShadow: '0 2px 4px rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
          }}>
            {currentStory.caption}
          </div>
        )}
      </div>
    </div>
  );
}
