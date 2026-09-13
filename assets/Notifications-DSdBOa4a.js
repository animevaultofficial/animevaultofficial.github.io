import{bc as z,be as S,aF as c,aB as C,ay as e,B as g,X as F,b3 as E,Y as _,al as D,ap as M}from"./index-cvOgdd-d.js";import{u as f}from"./useQuery-CCgsVqKx.js";import{u as h}from"./useMutation-PsAcq7r0.js";import{C as R}from"./clock-DlpBdnk3.js";import{C as T}from"./chevron-left-D6mibVb4.js";import{C as q}from"./chevron-right-smyV3ccp.js";import{P as W}from"./play-CZvQskDQ.js";function P(){const p=z(),{user:d,reminders:n,removeReminder:x}=S(),{data:a=[]}=f({queryKey:["notifications"],queryFn:D}),{data:A={}}=f({queryKey:["settings"],queryFn:M});h({mutationFn:({key:t,value:i})=>E(t,i),onSuccess:()=>{p.invalidateQueries({queryKey:["settings"]})}});const u=h({mutationFn:t=>_(t),onSuccess:()=>{p.invalidateQueries({queryKey:["notifications"]})}}),[o,b]=c.useState("All"),s=c.useMemo(()=>{const t=Date.now()/1e3;return n.filter(i=>i.airing_at>t).sort((i,r)=>i.airing_at-r.airing_at)},[n]),[y,j]=c.useState({});C.useEffect(()=>{const t=setInterval(()=>{const i=Date.now()/1e3,r={};s.forEach(m=>{const l=m.airing_at-i;if(l>0){const w=Math.floor(l/3600),N=Math.floor(l%3600/60),k=Math.floor(l%60);r[m.schedule_id]=`${String(w).padStart(2,"0")}:${String(N).padStart(2,"0")}:${String(k).padStart(2,"0")}`}else r[m.schedule_id]="Airing Now!"}),j(r)},1e3);return()=>clearInterval(t)},[s]);const v=c.useMemo(()=>o==="All"?a:a.filter(t=>t.type===o),[a,o]);return e.jsxs("div",{className:"notifications-page",style:{padding:"1rem"},children:[e.jsxs("div",{className:"notifications-container",style:{maxWidth:"100%",width:"100%"},children:[e.jsx("div",{className:"notifications-header",children:e.jsxs("div",{className:"header-left",style:{gap:"0.75rem"},children:[e.jsx(g,{size:28,color:"#ff1a75"}),e.jsxs("h1",{style:{fontSize:"1.75rem"},children:["Welcome back, ",e.jsx("span",{className:"highlight",children:(d==null?void 0:d.username)||"User"})]})]})}),e.jsxs("div",{className:"stats-bar",style:{gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))"},children:[e.jsxs("div",{className:"stat-card",children:[e.jsx("div",{className:"stat-icon",children:e.jsx(g,{size:22})}),e.jsxs("div",{className:"stat-text",children:[e.jsx("span",{className:"stat-label",children:"Unread Notifications:"}),e.jsx("span",{className:"stat-value",children:a.filter(t=>!t.read).length})]})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("div",{className:"stat-icon",children:e.jsx(R,{size:22})}),e.jsxs("div",{className:"stat-text",children:[e.jsx("span",{className:"stat-label",children:"Episodes Released Today:"}),e.jsx("span",{className:"stat-value",children:n.filter(t=>{const i=new Date().toDateString();return new Date(t.airing_at*1e3).toDateString()===i}).length})]})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("div",{className:"stat-icon",children:e.jsx(g,{size:22})}),e.jsxs("div",{className:"stat-text",children:[e.jsx("span",{className:"stat-label",children:"Following:"}),e.jsx("span",{className:"stat-value",children:n.length})]})]})]}),e.jsx("div",{className:"notifications-main",style:{gridTemplateColumns:"1fr"},children:e.jsxs("div",{className:"notifications-list",children:[e.jsxs("div",{className:"filter-tabs",style:{overflowX:"auto"},children:[["All","Episodes","Announcements","Following"].map(t=>e.jsx("button",{className:`filter-tab ${o===t?"active":""}`,onClick:()=>b(t),children:t},t)),e.jsxs("div",{className:"filter-nav",style:{marginLeft:"auto"},children:[e.jsx("button",{className:"nav-btn",children:e.jsx(T,{size:16})}),e.jsx("button",{className:"nav-btn",children:e.jsx(q,{size:16})})]})]}),e.jsxs("div",{className:"notifications-feed",children:[s.length>0&&e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"section-divider",children:e.jsx("h3",{children:"Upcoming Releases"})}),s.map(t=>e.jsxs("div",{className:"upcoming-card",children:[e.jsxs("p",{className:"upcoming-countdown",children:[y[t.schedule_id]||"Calculating..."," until ",t.title," Episode ",t.episode]}),e.jsx("button",{className:"cancel-reminder-btn",onClick:()=>x(t.schedule_id),children:"Cancel Reminder"})]},t.schedule_id))]}),a.length>0&&e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"section-divider",children:e.jsx("h3",{children:"Your Notifications"})}),v.map(t=>e.jsxs("div",{className:`notification-card ${t.read?"read":"unread"}`,style:{position:"relative"},children:[t.type==="Episodes"&&t.image&&e.jsx("img",{src:t.image,alt:t.title,className:"notification-image",style:{width:"80px",height:"112px",flexShrink:0}}),e.jsx("button",{onClick:()=>u.mutate(t.id),style:{position:"absolute",top:"10px",right:"10px",background:"rgba(255,255,255,0.05)",border:"none",color:"#64748b",cursor:"pointer",borderRadius:"50%",width:"28px",height:"28px",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s",zIndex:2},onMouseEnter:i=>{i.currentTarget.style.background="rgba(255,26,117,0.2)",i.currentTarget.style.color="#ff1a75"},onMouseLeave:i=>{i.currentTarget.style.background="rgba(255,255,255,0.05)",i.currentTarget.style.color="#64748b"},title:"Dismiss notification",children:e.jsx(F,{size:14})}),e.jsxs("div",{className:"notification-content",style:{minWidth:0,paddingRight:"30px"},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"0.5rem"},children:[e.jsx("h4",{style:{fontSize:"1rem",overflowWrap:"anywhere"},children:t.title}),e.jsx("span",{className:"notification-time-desktop",children:t.time})]}),e.jsx("p",{className:"notification-desc",style:{fontSize:"0.875rem",overflowWrap:"anywhere"},children:t.description}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:"0.5rem",flexWrap:"wrap",gap:"0.5rem"},children:[t.type==="Episodes"&&e.jsxs("button",{className:"watch-now-btn",style:{margin:0},children:[e.jsx(W,{size:14,fill:"white"})," Watch Now"]}),e.jsx("span",{className:"notification-time-mobile",children:t.time})]})]})]},t.id))]}),s.length===0&&a.length===0&&e.jsx("div",{className:"empty-state",style:{padding:"3rem 1rem"},children:e.jsx("p",{children:"No notifications yet! Set a reminder to get notified!"})})]})]})})]}),e.jsx("style",{jsx:!0,children:`
        .notifications-page {
          width: 100%;
          min-height: 100vh;
          background-color: #0b0f19;
          box-sizing: border-box;
        }
        .notifications-container {
          margin: 0 auto;
        }
        .notifications-header {
          margin-bottom: 1.5rem;
        }
        .header-left {
          display: flex;
          align-items: center;
        }
        .notifications-header h1 {
          font-family: 'Sora', sans-serif;
          color: white;
          margin: 0;
        }
        .highlight {
          color: #ff1a75;
        }
        .stats-bar {
          display: grid;
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .stat-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem;
          background: rgba(255, 26, 117, 0.08);
          border: 1px solid rgba(255, 26, 117, 0.3);
          border-radius: 12px;
        }
        .stat-icon {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          background: rgba(255, 26, 117, 0.15);
          border: 1px solid rgba(255, 26, 117, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ff1a75;
        }
        .stat-text {
          display: flex;
          flex-direction: column;
        }
        .stat-label {
          font-size: 0.85rem;
          color: #94a3b8;
        }
        .stat-value {
          font-family: 'Sora', sans-serif;
          font-size: 1.35rem;
          font-weight: 800;
          color: white;
        }
        .notifications-main {
          display: grid;
          gap: 2rem;
        }
        .filter-tabs {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1.25rem;
          padding-bottom: 0.25rem;
        }
        .filter-tab {
          padding: 0.6rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          color: #94a3b8;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
          font-size: 0.875rem;
        }
        .filter-tab:hover {
          border-color: rgba(255, 26, 117, 0.4);
          color: #ff1a75;
        }
        .filter-tab.active {
          background: #ff1a75;
          color: white;
          border-color: #ff1a75;
        }
        .filter-nav {
          display: flex;
          gap: 0.5rem;
        }
        .nav-btn {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #94a3b8;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .nav-btn:hover {
          border-color: rgba(255, 26, 117, 0.3);
          color: #ff1a75;
        }
        .notifications-feed {
          display: flex;
          flex-direction: column;
          gap: 0.875rem;
        }
        .notification-card {
          display: flex;
          align-items: center;
          gap: 0.875rem;
          padding: 1.25rem;
          background: linear-gradient(135deg, rgba(255, 26, 117, 0.1) 0%, rgba(15, 23, 42, 0.6) 100%);
          border: 1px solid rgba(255, 26, 117, 0.3);
          border-radius: 12px;
          transition: all 0.3s ease;
        }
        .notification-card.unread {
          background: linear-gradient(135deg, rgba(255, 26, 117, 0.15) 0%, rgba(15, 23, 42, 0.7) 100%);
          border-left: 4px solid #ff1a75;
        }
        .notification-card.read {
          opacity: 0.7;
          border-color: rgba(255, 255, 255, 0.08);
          background: rgba(15, 23, 42, 0.5);
        }
        .notification-image {
          object-fit: cover;
          border-radius: 10px;
        }
        .notification-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .notification-content h4 {
          color: white;
          margin: 0;
        }
        .notification-desc {
          color: #94a3b8;
          margin: 0;
        }
        .notification-time-mobile {
          display: none;
          color: #64748b;
          font-size: 0.75rem;
        }
        .notification-time-desktop {
          color: #64748b;
          font-size: 0.75rem;
          white-space: nowrap;
        }
        .watch-now-btn {
          margin-top: 0.5rem;
          padding: 0.5rem 1rem;
          background: #ff1a75;
          border: none;
          border-radius: 20px;
          color: white;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          width: fit-content;
          transition: all 0.2s;
        }
        .watch-now-btn:hover {
          background: #ff0055;
        }
        .section-divider {
          margin-top: 1.75rem;
          margin-bottom: 0.875rem;
        }
        .section-divider h3 {
          color: white;
          font-size: 1.15rem;
          margin: 0;
        }
        .upcoming-card {
          background: rgba(255, 255, 255, 0.06);
          padding: 1.25rem;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          gap: 0.875rem;
        }
        .upcoming-countdown {
          color: white;
          font-size: 1.05rem;
          font-weight: 700;
        }
        .cancel-reminder-btn {
          width: fit-content;
          padding: 0.5rem 1.25rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          color: #94a3b8;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.875rem;
        }
        .cancel-reminder-btn:hover {
          background: rgba(255, 26, 117, 0.1);
          border-color: rgba(255, 26, 117, 0.3);
          color: #ff1a75;
        }
        .empty-state {
          color: #64748b;
          text-align: center;
        }
        @media (min-width: 1024px) {
          .notifications-main {
            grid-template-columns: 1fr 320px;
          }
        }
        @media (max-width: 600px) {
          .stats-bar {
            grid-template-columns: 1fr !important;
          }
          .notifications-header h1 {
            font-size: 1.3rem !important;
          }
          .filter-tab {
            padding: 0.5rem 0.75rem;
            font-size: 0.8rem;
          }
          .notification-time-desktop {
            display: none !important;
          }
          .notification-time-mobile {
            display: inline-block !important;
          }
          .notification-image {
            width: 65px !important;
            height: 90px !important;
          }
          .notification-card {
            padding: 1rem !important;
            gap: 0.75rem !important;
          }
        }
      `})]})}export{P as default};
