import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { fetchSiteSettings } from '../api/db';

const SEEN_KEY = 'animevault_seen_announcement';

export default function AnnouncementPopup() {
  const [announcement, setAnnouncement] = useState(null);
  useEffect(() => {
    let cancelled = false;
    fetchSiteSettings().then(settings => {
      if (cancelled || settings?.announcement_popup_enabled !== 'true' || !settings?.announcement?.trim()) return;
      const id = settings.announcement_id || settings.announcement_updated_at || settings.announcement;
      if (localStorage.getItem(SEEN_KEY) === id) return;
      setAnnouncement({ ...settings, id });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  if (!announcement) return null;
  const close = () => { localStorage.setItem(SEEN_KEY, announcement.id); setAnnouncement(null); };
  return <div style={styles.overlay} role="dialog" aria-modal="true" aria-label="AnimeVault announcement">
    <div style={styles.card}>
      <button type="button" onClick={close} aria-label="Close announcement" style={styles.close}><X size={20}/></button>
      <div style={styles.icon}><Bell size={22}/></div>
      <div style={styles.kicker}>ANIMEVAULT ANNOUNCEMENT</div>
      <h2>{announcement.announcement_title || 'Announcement'}</h2>
      <p style={styles.body}>{announcement.announcement}</p>
      <button type="button" onClick={close} style={styles.ok}>Got it</button>
    </div>
  </div>;
}
const styles={overlay:{position:'fixed',inset:0,zIndex:10000,display:'grid',placeItems:'center',padding:18,background:'rgba(0,0,0,.72)',backdropFilter:'blur(7px)'},card:{position:'relative',width:'min(520px,100%)',padding:30,borderRadius:20,background:'linear-gradient(160deg,#111722,#080b11)',border:'1px solid rgba(255,255,255,.1)',boxShadow:'0 30px 100px rgba(0,0,0,.6)',color:'#fff'},close:{position:'absolute',top:12,right:12,width:38,height:38,borderRadius:10,border:'1px solid rgba(255,255,255,.08)',background:'rgba(255,255,255,.04)',color:'#fff',cursor:'pointer'},icon:{width:46,height:46,borderRadius:14,display:'grid',placeItems:'center',background:'rgba(255,26,117,.14)',color:'#ff5b9f',marginBottom:14},kicker:{fontSize:11,fontWeight:900,letterSpacing:1.5,color:'#ff5b9f'},body:{color:'#b8c0cc',lineHeight:1.65,whiteSpace:'pre-wrap'},ok:{marginTop:18,width:'100%',padding:12,border:0,borderRadius:11,background:'#ff1a75',color:'#fff',fontWeight:900,cursor:'pointer'}};