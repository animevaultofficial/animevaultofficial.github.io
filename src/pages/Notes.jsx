import React, { useState, useEffect } from 'react';
import { useUser } from '../api/UserContext';
import { useNavigate } from 'react-router-dom';
import { X, Edit2, Trash2, Music, Clock, User } from 'lucide-react';
import { getUserNotes, updateNote, deleteNote } from '../api/db';

export default function Notes() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      setLoading(true);
      // Fetch all recent notes - can be filtered by user later
      const notesData = await getUserNotes();
      setNotes(notesData || []);
    } catch (err) {
      console.error('Failed to load notes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditNote = (note) => {
    setSelectedNote(note);
    setEditText(note.content);
    setIsEditing(true);
  };

  const handleSaveNote = async () => {
    try {
      if (!selectedNote) return;
      const res = await updateNote(selectedNote.id, { content: editText });
      if (res?.success) {
        await loadNotes();
        setIsEditing(false);
        setSelectedNote(null);
      } else {
        alert('Failed to save note');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to save note');
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (window.confirm('Delete this note?')) {
      try {
        const ok = await deleteNote(noteId);
        if (ok) {
          await loadNotes();
        } else alert('Failed to delete');
      } catch (e) {
        console.error(e);
        alert('Failed to delete');
      }
    }
  };

  const closeModal = () => {
    setSelectedNote(null);
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(to br, #0f0f1e, #1a1a2e)' }}>
        <div style={{ color: '#94a3b8' }}>Loading notes...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(to br, #0f0f1e, #1a1a2e)', padding: '2rem' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#fff', margin: 0, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Music size={32} /> My Notes
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>View and manage your saved notes and music clips</p>
        </div>

        {notes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Music size={48} style={{ color: '#475569', marginBottom: '1rem', opacity: 0.5 }} />
            <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>No notes yet</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {notes.map(note => (
              <div
                key={note.id}
                onClick={() => setSelectedNote(note)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  minHeight: '280px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  aspectRatio: '1',
                  hover: {
                    background: 'rgba(255,255,255,0.08)',
                    borderColor: 'rgba(255,26,117,0.3)',
                    transform: 'translateY(-4px)',
                  }
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.borderColor = 'rgba(255,26,117,0.3)';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div>
                  {note.songData && (
                    <div style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <p style={{ margin: 0, color: '#ff1a75', fontWeight: '700', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Music size={14} /> {note.songData.title || 'Unknown Song'}
                      </p>
                      {note.songData.artist && <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '0.8rem' }}>by {note.songData.artist}</p>}
                    </div>
                  )}
                  <p style={{ margin: 0, color: '#e2e8f0', lineHeight: '1.5', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' }}>
                    {note.content}
                  </p>
                </div>

                <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                  <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} /> {new Date(note.created_at).toLocaleDateString()}
                  </span>
                  {user?.id === note.user_id && (
                    <button
                      onClick={e => { e.stopPropagation(); handleEditNote(note); }}
                      style={{
                        background: 'rgba(255,26,117,0.2)',
                        border: 'none',
                        color: '#ff1a75',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,26,117,0.3)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,26,117,0.2)'}
                    >
                      <Edit2 size={12} /> Edit
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal for viewing/editing notes */}
      {selectedNote && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
          onClick={closeModal}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '500px',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, color: '#fff', fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {selectedNote.songData && <Music size={20} color="#ff1a75" />}
                Note
              </h2>
              <button
                onClick={closeModal}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {selectedNote.songData && (
                <div style={{ background: 'rgba(255,26,117,0.1)', border: '1px solid rgba(255,26,117,0.2)', borderRadius: '12px', padding: '1rem' }}>
                  <p style={{ margin: 0, color: '#ff1a75', fontWeight: '700', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Music size={16} /> Music Info
                  </p>
                  <p style={{ margin: '4px 0', color: '#e2e8f0', fontSize: '0.9rem' }}>
                    <strong>Song:</strong> {selectedNote.songData.title}
                  </p>
                  {selectedNote.songData.artist && <p style={{ margin: '4px 0', color: '#e2e8f0', fontSize: '0.9rem' }}>
                    <strong>Artist:</strong> {selectedNote.songData.artist}
                  </p>}
                </div>
              )}

              {isEditing ? (
                <textarea
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    padding: '1rem',
                    fontFamily: 'inherit',
                    fontSize: '0.9rem',
                    minHeight: '200px',
                    outline: 'none',
                    fontFamily: 'monospace',
                    resize: 'none'
                  }}
                />
              ) : (
                <div style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '8px',
                  padding: '1rem',
                  color: '#e2e8f0',
                  lineHeight: '1.6',
                  minHeight: '200px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {selectedNote.content}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.85rem' }}>
                <Clock size={14} />
                Created: {new Date(selectedNote.created_at).toLocaleString()}
              </div>

              {selectedNote.expires_at && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24', fontSize: '0.85rem', background: 'rgba(251,191,36,0.1)', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid rgba(251,191,36,0.2)' }}>
                  <Clock size={14} />
                  Expires: {new Date(selectedNote.expires_at).toLocaleString()}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            {user?.id === selectedNote.user_id && (
              <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '8px' }}>
                {isEditing ? (
                  <>
                    <button
                      onClick={handleSaveNote}
                      style={{
                        flex: 1,
                        background: 'rgba(255,26,117,0.2)',
                        border: '1px solid rgba(255,26,117,0.3)',
                        color: '#ff1a75',
                        padding: '10px 16px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '700',
                        fontSize: '0.9rem',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,26,117,0.3)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,26,117,0.2)'}
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => { setIsEditing(false); setEditText(selectedNote.content); }}
                      style={{
                        flex: 1,
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#94a3b8',
                        padding: '10px 16px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '700',
                        fontSize: '0.9rem'
                      }}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleEditNote(selectedNote)}
                      style={{
                        flex: 1,
                        background: 'rgba(255,26,117,0.2)',
                        border: '1px solid rgba(255,26,117,0.3)',
                        color: '#ff1a75',
                        padding: '10px 16px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '700',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,26,117,0.3)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,26,117,0.2)'}
                    >
                      <Edit2 size={16} /> Edit
                    </button>
                    <button
                      onClick={() => { handleDeleteNote(selectedNote.id); closeModal(); }}
                      style={{
                        flex: 1,
                        background: 'rgba(239,68,68,0.2)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        color: '#ef4444',
                        padding: '10px 16px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '700',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.3)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
