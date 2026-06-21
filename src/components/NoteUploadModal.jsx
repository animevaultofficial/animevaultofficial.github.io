import React, { useState, useRef } from 'react';
import { X, MessageSquare, Loader, Music, Search, Play, Pause } from 'lucide-react';
import { addNote } from '../api/db';

export default function NoteUploadModal({ user, onClose }) {
  const [content, setContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showMusicSearch, setShowMusicSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);
  
  const [playingPreview, setPlayingPreview] = useState(null);
  const audioRef = useRef(null);

  const searchMusic = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchQuery)}&media=music&limit=5`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (err) {
      console.error(err);
    }
    setIsSearching(false);
  };

  const handlePlayPreview = (url) => {
    if (playingPreview === url) {
      audioRef.current?.pause();
      setPlayingPreview(null);
    } else {
      setPlayingPreview(url);
      setTimeout(() => audioRef.current?.play(), 0);
    }
  };

  const handleUpload = async () => {
    if (!content.trim() && !selectedSong) return;
    setUploading(true);
    
    const songData = selectedSong ? {
      title: selectedSong.trackName,
      artist: selectedSong.artistName,
      coverUrl: selectedSong.artworkUrl100,
      audioUrl: selectedSong.previewUrl
    } : null;

    const success = await addNote(user.id, content.trim(), 24, songData);
    if (success) onClose(true);
    else { alert('Failed to add note'); setUploading(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}>
      {/* Invisible Audio for previews */}
      <audio ref={audioRef} src={playingPreview} onEnded={() => setPlayingPreview(null)} />
      
      <div style={{ background: '#121220', borderRadius: '24px', border: '1px solid rgba(255,26,117,0.3)', width: '90%', maxWidth: '350px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, color: '#fff', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}><MessageSquare size={18} /> New Note</h3>
          <button onClick={() => onClose(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ position: 'relative' }}>
            <textarea 
              value={content}
              onChange={e => setContent(e.target.value)}
              maxLength={60}
              placeholder="Share a thought..."
              style={{
                width: '100%', height: '80px', padding: '15px', borderRadius: '12px', resize: 'none',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff', outline: 'none', fontSize: '1.1rem', fontFamily: 'inherit', boxSizing: 'border-box'
              }}
              autoFocus
            />
            <span style={{ position: 'absolute', bottom: '10px', right: '10px', fontSize: '0.8rem', color: content.length >= 60 ? '#ff1a75' : 'var(--text-secondary)' }}>
              {content.length}/60
            </span>
          </div>

          {/* Music Selection UI */}
          {selectedSong ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,26,117,0.1)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,26,117,0.3)' }}>
              <img src={selectedSong.artworkUrl100} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} />
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 'bold', color: '#fff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{selectedSong.trackName}</p>
                <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{selectedSong.artistName}</p>
              </div>
              <button onClick={() => handlePlayPreview(selectedSong.previewUrl)} style={{ background: 'none', border: 'none', color: '#ff1a75', cursor: 'pointer' }}>
                {playingPreview === selectedSong.previewUrl ? <Pause size={20} /> : <Play size={20} />}
              </button>
              <button onClick={() => { setSelectedSong(null); setPlayingPreview(null); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '5px' }}><X size={16} /></button>
            </div>
          ) : showMusicSearch ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <form onSubmit={searchMusic} style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  placeholder="Search songs..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none', fontSize: '0.9rem' }}
                />
                <button type="submit" disabled={isSearching} style={{ background: 'var(--brand-color)', border: 'none', borderRadius: '8px', padding: '0 12px', color: '#000', cursor: 'pointer' }}>
                  {isSearching ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={16} />}
                </button>
              </form>
              
              {searchResults.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                  {searchResults.map((song) => (
                    <div key={song.trackId} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}
                         onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                         onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <img src={song.artworkUrl100} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} onClick={() => setSelectedSong(song)} />
                      <div style={{ flex: 1, overflow: 'hidden' }} onClick={() => setSelectedSong(song)}>
                        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 'bold', color: '#fff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{song.trackName}</p>
                        <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{song.artistName}</p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handlePlayPreview(song.previewUrl); }} style={{ background: 'none', border: 'none', color: '#ff1a75', cursor: 'pointer' }}>
                        {playingPreview === song.previewUrl ? <Pause size={18} /> : <Play size={18} />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <button 
              onClick={() => setShowMusicSearch(true)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              <Music size={16} /> Add Music
            </button>
          )}

          <button 
            onClick={handleUpload}
            disabled={(!content.trim() && !selectedSong) || uploading}
            style={{ 
              padding: '14px', borderRadius: '12px', background: 'var(--brand-color)', color: '#000', 
              fontWeight: '900', border: 'none', cursor: ((!content.trim() && !selectedSong) || uploading) ? 'not-allowed' : 'pointer',
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', opacity: ((!content.trim() && !selectedSong) || uploading) ? 0.6 : 1
            }}
          >
            {uploading ? <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} /> : 'Share Note'}
          </button>
        </div>
      </div>
    </div>
  );
}
