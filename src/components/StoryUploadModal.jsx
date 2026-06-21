import React, { useState } from 'react';
import { X, UploadCloud, Loader, Clock } from 'lucide-react';
import { uploadStory } from '../api/db';

export default function StoryUploadModal({ user, onClose }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [mediaType, setMediaType] = useState('');
  const [hoursToExpire, setHoursToExpire] = useState(24);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 15 * 1024 * 1024) {
      alert("File too large. Max 15MB.");
      return;
    }
    setFile(f);
    const isVid = f.type.startsWith('video/');
    setMediaType(isVid ? 'video' : 'image');
    setPreview(URL.createObjectURL(f));
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);
      formData.append("folder", "animevault_stories");
      formData.append("resource_type", "auto"); 

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.secure_url) {
        await uploadStory(user.id, result.secure_url, mediaType, hoursToExpire, caption);
        onClose(true); // pass true to indicate success
      } else {
        alert("Upload failed: " + result.error?.message);
      }
    } catch (e) {
      alert("Error: " + e.message);
    }
    setUploading(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}>
      <div style={{ background: '#121220', borderRadius: '24px', border: '1px solid rgba(255,26,117,0.3)', width: '90%', maxWidth: '400px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, color: '#fff', fontSize: '1.2rem' }}>Add to Story</h3>
          <button onClick={() => onClose(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {!preview ? (
            <label style={{ 
              border: '2px dashed rgba(255,26,117,0.4)', borderRadius: '16px', padding: '40px 20px', 
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
              cursor: 'pointer', background: 'rgba(255,26,117,0.05)', color: '#ff1a75'
            }}>
              <UploadCloud size={40} />
              <span style={{ fontWeight: 'bold' }}>Select Image or Video</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Max 15MB</span>
              <input type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleFileChange} />
            </label>
          ) : (
            <div style={{ borderRadius: '16px', overflow: 'hidden', background: '#000', aspectRatio: '9/16', position: 'relative' }}>
              {mediaType === 'image' ? (
                <img src={preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <video src={preview} autoPlay loop muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
              <button onClick={() => { setFile(null); setPreview(null); }} style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', borderRadius: '50%', padding: '8px', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={14} /> Expiration Time
            </label>
            <select 
              value={hoursToExpire} 
              onChange={e => setHoursToExpire(Number(e.target.value))}
              style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none', cursor: 'pointer' }}
            >
              <option value={12}>12 Hours</option>
              <option value={24}>24 Hours</option>
              <option value={48}>48 Hours</option>
              <option value={168}>1 Week</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Caption (Optional)</label>
            <input 
              type="text" 
              maxLength={100}
              placeholder="Add a caption..."
              value={caption} 
              onChange={e => setCaption(e.target.value)}
              style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none' }}
            />
          </div>

          <button 
            onClick={handleUpload}
            disabled={!file || uploading}
            style={{ 
              padding: '14px', borderRadius: '12px', background: 'var(--brand-color)', color: '#000', 
              fontWeight: '900', border: 'none', cursor: (!file || uploading) ? 'not-allowed' : 'pointer',
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', opacity: (!file || uploading) ? 0.6 : 1
            }}
          >
            {uploading ? <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} /> : 'Share to Story'}
          </button>
        </div>
      </div>
    </div>
  );
}
