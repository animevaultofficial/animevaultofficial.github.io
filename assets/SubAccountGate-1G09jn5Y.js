import{z as ze,b9 as Re,aA as l,g as z,M as re,at as t,u as oe,X as ie,S as We,x as se,Q as Ee,aJ as O,_ as Te,aH as Ue,aM as ce}from"./index-Cj0-KyH0.js";import{w as le}from"./withTimeout-DK9vXRbr.js";import{P as _e}from"./pen-line-BnJZI3lk.js";import{T as Be}from"./trash-2-CVISp9B2.js";import{P as He}from"./plus-AGHrtmqN.js";import{S as Le}from"./shield-check-DHnbfL3U.js";import{U as Me}from"./user-plus-D4oKnUIv.js";/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const De=[["circle",{cx:"12",cy:"16",r:"1",key:"1au0dj"}],["rect",{x:"3",y:"10",width:"18",height:"12",rx:"2",key:"6s8ecr"}],["path",{d:"M7 10V7a5 5 0 0 1 10 0v3",key:"1pqi11"}]],Ve=ze("lock-keyhole",De),Ye=31e4,Fe=6;function T(i){return new RegExp(`^\\d{${Fe},12}$`).test(String(i||""))}function de(i){return btoa(String.fromCharCode(...i))}function ue(i){return Uint8Array.from(atob(i),a=>a.charCodeAt(0))}async function ge(i,a){var f;if(!((f=globalThis.crypto)!=null&&f.subtle))throw new Error("Secure PIN storage is not available in this browser.");const g=await crypto.subtle.importKey("raw",new TextEncoder().encode(i),"PBKDF2",!1,["deriveBits"]),d=await crypto.subtle.deriveBits({name:"PBKDF2",salt:a,iterations:Ye,hash:"SHA-256"},g,256);return new Uint8Array(d)}async function Oe(i){if(!T(i))throw new Error("Use a PIN with 6 to 12 digits.");const a=crypto.getRandomValues(new Uint8Array(16)),g=await ge(i,a);return{salt:de(a),hash:de(g)}}async function $e(i,a){if(!T(i)||!(a!=null&&a.salt)||!(a!=null&&a.hash))return!1;const g=await ge(i,ue(a.salt)),d=ue(a.hash);if(g.length!==d.length)return!1;let f=0;for(let w=0;w<g.length;w+=1)f|=g[w]^d[w];return f===0}function fe({profile:i,size:a=132}){return t.jsx("div",{className:"sub-account-avatar",style:{width:a,height:a,borderRadius:"50%",background:i.avatar?"#111827":i.color,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:a*.34,fontWeight:900,boxShadow:"0 24px 55px rgba(255,26,117,.20)",border:"4px solid rgba(255,26,117,.35)",overflow:"hidden"},children:i.avatar?t.jsx("img",{src:i.avatar,alt:"",style:{width:"100%",height:"100%",objectFit:"cover"}}):i.name.charAt(0).toUpperCase()})}function pe(){return t.jsx("style",{children:`
      .sub-account-gate {
        position: relative;
        isolation: isolate;
      }
      .sub-account-gate::before,
      .sub-account-gate::after {
        content: "";
        position: fixed;
        z-index: -1;
        width: min(58vw, 620px);
        aspect-ratio: 1;
        border-radius: 50%;
        pointer-events: none;
        filter: blur(85px);
        opacity: .2;
        background: #ff1a75;
        animation: profile-glow 9s ease-in-out infinite alternate;
      }
      .sub-account-gate::before { top: -35%; left: -20%; }
      .sub-account-gate::after {
        right: -24%;
        bottom: -48%;
        background: #8b5cf6;
        animation-delay: -4s;
      }
      .sub-account-gate-content {
        position: relative;
        z-index: 1;
        animation: profile-screen-in .65s cubic-bezier(.2,.75,.25,1) both;
      }
      .sub-account-brand {
        animation: profile-brand-in .7s cubic-bezier(.2,.75,.25,1) both;
      }
      .sub-account-card {
        animation: profile-card-in .55s cubic-bezier(.2,.75,.25,1) both;
        animation-delay: var(--profile-delay, 0ms);
      }
      .sub-account-select {
        display: grid;
        justify-items: center;
        gap: 14px;
        width: 100%;
        padding: 8px;
        border: 0;
        border-radius: 22px;
        background: transparent;
        color: #fff;
        font: inherit;
        cursor: pointer;
        touch-action: manipulation;
        transition: transform .22s ease, background-color .22s ease, box-shadow .22s ease;
      }
      .sub-account-select:hover,
      .sub-account-select:focus-visible {
        transform: translateY(-7px);
        outline: none;
        background: rgba(255,255,255,.045);
        box-shadow: 0 14px 40px rgba(255,26,117,.12);
      }
      .sub-account-avatar {
        transition: transform .28s ease, box-shadow .28s ease, border-color .28s ease;
      }
      .sub-account-select:hover .sub-account-avatar,
      .sub-account-select:focus-visible .sub-account-avatar {
        transform: scale(1.06);
        border-color: rgba(255,26,117,.8) !important;
        box-shadow: 0 0 0 7px rgba(255,26,117,.1), 0 24px 55px rgba(255,26,117,.3) !important;
      }
      .sub-account-select:disabled {
        cursor: default;
      }
      .sub-account-select.profile-opening {
        pointer-events: none;
        animation: profile-open .42s cubic-bezier(.2,.75,.25,1) both;
      }
      .sub-account-select.profile-opening .sub-account-avatar {
        animation: profile-avatar-open .42s cubic-bezier(.2,.75,.25,1) both;
      }
      .sub-account-add {
        transition: transform .22s ease, filter .22s ease;
      }
      .sub-account-add:hover,
      .sub-account-add:focus-visible {
        transform: translateY(-7px) scale(1.035);
        filter: brightness(1.2);
        outline: none;
      }
      .sub-account-add > div {
        transition: border-color .22s ease, box-shadow .22s ease, background-color .22s ease;
      }
      .sub-account-add:hover > div,
      .sub-account-add:focus-visible > div {
        border-color: rgba(255,26,117,.75) !important;
        box-shadow: 0 0 0 7px rgba(255,26,117,.09), 0 24px 55px rgba(255,26,117,.25) !important;
        background: rgba(255,26,117,.12) !important;
      }
      .sub-account-action {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        min-height: 36px;
        padding: 8px 12px;
        border: 0;
        border-radius: 999px;
        background: rgba(255,255,255,.08);
        color: #fff;
        font-size: .72rem;
        font-weight: 900;
        cursor: pointer;
        touch-action: manipulation;
        transition: background-color .18s ease, transform .18s ease;
      }
      .sub-account-action:hover,
      .sub-account-action:focus-visible {
        transform: translateY(-2px);
        background: rgba(255,255,255,.16);
        outline: 2px solid rgba(255,255,255,.55);
        outline-offset: 2px;
      }
      .sub-account-action-remove {
        background: rgba(239,68,68,.16);
        color: #fecaca;
      }
      .sub-account-action-remove:hover,
      .sub-account-action-remove:focus-visible {
        background: rgba(239,68,68,.3);
      }
      .sub-account-modal-backdrop {
        animation: profile-backdrop-in .2s ease both;
      }
      .sub-account-modal {
        animation: profile-modal-in .28s cubic-bezier(.2,.75,.25,1) both;
      }
      @keyframes profile-glow {
        from { transform: translate3d(-3%, -2%, 0) scale(.92); }
        to { transform: translate3d(8%, 7%, 0) scale(1.08); }
      }
      @keyframes profile-screen-in {
        from { opacity: 0; transform: translateY(14px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes profile-brand-in {
        from { opacity: 0; transform: scale(.94); }
        to { opacity: 1; transform: scale(1); }
      }
      @keyframes profile-card-in {
        from { opacity: 0; transform: translateY(22px) scale(.94); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes profile-open {
        35% { opacity: 1; transform: scale(1.04); }
        100% { opacity: 0; transform: scale(1.18); }
      }
      @keyframes profile-avatar-open {
        100% { box-shadow: 0 0 0 18px rgba(255,26,117,0), 0 24px 55px rgba(255,26,117,.45); }
      }
      @keyframes profile-backdrop-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes profile-modal-in {
        from { opacity: 0; transform: translateY(14px) scale(.97); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      @media (prefers-reduced-motion: reduce) {
        .sub-account-gate::before,
        .sub-account-gate::after {
          animation-duration: 1ms;
        }
        .sub-account-gate-content,
        .sub-account-brand,
        .sub-account-card,
        .sub-account-select.profile-opening,
        .sub-account-select.profile-opening .sub-account-avatar,
        .sub-account-modal-backdrop,
        .sub-account-modal {
          animation-duration: 1ms;
          animation-delay: 0ms;
        }
        .sub-account-select,
        .sub-account-avatar,
        .sub-account-add,
        .sub-account-add > div,
        .sub-account-action {
          transition-duration: 1ms;
        }
      }
    `})}function et({children:i}){const{user:a,authLoading:g,activeSubAccount:d,setActiveSubAccountState:f,fetchSubAccounts:w,ensureMainSubAccount:be,createSubAccount:me,updateSubAccount:he,deleteSubAccount:xe}=Re(),[u,C]=l.useState([]),[ye,U]=l.useState(!0),[we,$]=l.useState(null),[c,v]=l.useState(null),[P,h]=l.useState(""),[K,j]=l.useState(""),[G,m]=l.useState(""),[N,k]=l.useState(!1),[ve,q]=l.useState(0),[R,p]=l.useState(""),[Pe,A]=l.useState(!1),[s,X]=l.useState(null),[x,_]=l.useState(""),[B,H]=l.useState(""),[L,J]=l.useState(!1),[M,D]=l.useState("adults"),[W,V]=l.useState(z[0]);l.useEffect(()=>{let e=!1;async function o(){if($(null),!(a!=null&&a.id)){C([]),U(!1),se(),f(null);return}U(!0),f(null);const r=Ee(a);C(r);let n=[];try{await le(be(),5e3,"Profile setup timed out."),n=await le(w(),5e3,"Profile loading timed out.")}catch{n=r}e||(n.length||(n=r),C(n),O(a.id,n),U(!1))}return o(),()=>{e=!0}},[a==null?void 0:a.id,f]);const Y=u.length<re,y=l.useMemo(()=>x.trim()?x.trim().length>18?"Use 18 characters or less.":u.some(e=>e.id!==(s==null?void 0:s.id)&&e.name.toLowerCase()===x.trim().toLowerCase())?"That profile name already exists.":"":"Enter a profile name.",[x,u,s]);function E(){X(null),_(""),H(""),D("adults"),V(z[u.length%z.length]),p("")}function je(){E(),A(!0)}function ke(e){if(e.ageRating==="kids"){I(()=>Q(e));return}Q(e)}function Q(e){X(e),_(e.name||""),H(e.avatar||""),D(e.ageRating||"adults"),V(e.color||z[0]),p(""),A(!0)}async function Z(e){if(u.length<=1){p("Keep at least one profile.");return}if(!window.confirm(`Remove ${e.name}? Watch history stays on the main account, but this profile will be deleted.`))return;const o=await xe(e.id);if(!o.success){p(o.message||"Could not delete profile.");return}const r=O(a.id,u.filter(n=>n.id!==e.id));if(C(r),(d==null?void 0:d.id)===e.id){const n=r[0]||null;n?(ce(a.id,n),f(n)):(se(),f(null))}}function Se(e){if(e.ageRating==="kids"){I(()=>Z(e));return}Z(e)}function ee(e){const o=()=>{ce(a.id,e),f(e),$(a.id)};if(e.ageRating!=="kids"&&u.some(r=>r.ageRating==="kids")){I(o);return}o()}function Ce(e){ee(e)}async function I(e,{changePin:o=!1}={}){if(!o&&ve>Date.now()){await e();return}m(""),h(""),j(""),k(!0);try{const r=await Te(a.id);if(!r.success){p(r.message||"Could not check parent controls.");return}const n=r.credential;v({mode:o?n?"change-verify":"setup":n?"verify":"setup",credential:n,action:e})}catch(r){p(r.message||"Could not check parent controls.")}finally{k(!1)}}async function Ne(e){var o,r;if(e.preventDefault(),!(!c||N)){if(c.mode==="setup"){if(!T(P)){m("Use a PIN with 6 to 12 digits.");return}if(P!==K){m("The PIN entries do not match.");return}k(!0);try{const n=await Oe(P),b=await Ue(a.id,n);if(!b.success)throw new Error(b.message||"Could not save parent PIN.");q(Date.now()+5*60*1e3),v(null),h(""),j(""),await((o=c.action)==null?void 0:o.call(c))}catch(n){m(n.message||"Could not save parent PIN.")}finally{k(!1)}return}if(!T(P)){m("Enter your 6 to 12 digit parent PIN.");return}k(!0);try{if(!await $e(P,c.credential)){m("That parent PIN is incorrect.");return}if(c.mode==="change-verify"){v({...c,mode:"setup"}),h(""),j(""),m("Enter and confirm your new parent PIN.");return}q(Date.now()+5*60*1e3),v(null),h(""),await((r=c.action)==null?void 0:r.call(c))}catch(n){m(n.message||"Could not verify parent PIN.")}finally{k(!1)}}}async function Ae(e){if(e.preventDefault(),!(!s&&!Y||y)){if(M==="kids"||(s==null?void 0:s.ageRating)==="kids"){await I(()=>te());return}await te()}}async function te(){if(!s&&!Y||y)return;p("");const e={id:`${a.id}-profile-${Date.now()}`,name:x.trim(),color:W,avatar:B.trim()||null,ageRating:M,isMain:(s==null?void 0:s.isMain)||u.length===0,createdAt:new Date().toISOString()},o=s?await he(s.id,{...e,id:s.id}):await me(e);if(!o.success){p(o.message||"Could not save profile to the database.");return}const r=o.profile||e,n=s?u.map(b=>b.id===s.id?r:b):[...u,r];O(a.id,n),C(n),A(!1),E(),(!s||(d==null?void 0:d.id)===s.id)&&ee(r)}async function Ie(e){var b,ae;const o=(b=e.target.files)==null?void 0:b[0];if(!o)return;if(o.size>5*1024*1024){p("Profile picture must be under 5MB.");return}const r="dmljhhe1l",n="animevault";J(!0),p("");try{const S=new FormData;S.append("file",o),S.append("upload_preset",n),S.append("folder","animevault_profiles");const ne=await fetch(`https://api.cloudinary.com/v1_1/${r}/image/upload`,{method:"POST",body:S}),F=await ne.json();if(!ne.ok||!F.secure_url)throw new Error(((ae=F.error)==null?void 0:ae.message)||"Upload failed.");H(F.secure_url)}catch(S){p(S.message||"Could not upload profile picture.")}finally{J(!1),e.target.value=""}}return g?t.jsx("div",{style:{minHeight:"100vh",display:"grid",placeItems:"center",padding:32,background:"radial-gradient(circle at top, rgba(255,26,117,.20), transparent 32%),linear-gradient(135deg,#050505,#16030c 55%,#09090f)",color:"#fff",textAlign:"center"},children:t.jsxs("div",{style:{display:"grid",gap:14,justifyItems:"center"},children:[t.jsx("img",{src:oe("logo.png"),alt:"AnimeVault",style:{height:70}}),t.jsxs("h1",{style:{margin:0,fontSize:"clamp(2rem,6vw,4rem)",fontWeight:950},children:[t.jsx("span",{style:{color:"#ff1a75"},children:"Anime"}),"Vault"]}),t.jsx("p",{style:{margin:0,color:"#fda4af",fontWeight:800},children:"Loading your watching profiles..."})]})}):!a||a.is_guest||we===a.id&&(d!=null&&d.id)?i:ye?t.jsxs(t.Fragment,{children:[t.jsx(pe,{}),t.jsx("div",{className:"sub-account-gate sub-account-gate-loading",role:"status","aria-live":"polite",style:{minHeight:"100vh",display:"grid",placeItems:"center",padding:24,background:"radial-gradient(circle at top, rgba(255,26,117,.20), transparent 32%),linear-gradient(135deg,#050505,#16030c 55%,#09090f)",color:"#fff",textAlign:"center"},children:t.jsxs("div",{className:"sub-account-gate-content",style:{display:"grid",gap:12,justifyItems:"center"},children:[t.jsx("img",{src:oe("logo.png"),alt:"AnimeVault",style:{height:56}}),t.jsxs("h1",{style:{margin:0,fontSize:"clamp(1.9rem,9vw,3.5rem)",fontWeight:950},children:[t.jsx("span",{style:{color:"#ff1a75"},children:"Anime"}),"Vault"]}),t.jsx("p",{style:{margin:0,color:"#fda4af",fontWeight:800},children:"Loading your watching profile..."})]})})]}):t.jsxs(t.Fragment,{children:[t.jsx(pe,{}),t.jsxs("div",{className:"sub-account-gate",style:{minHeight:"100vh",background:"radial-gradient(circle at top, rgba(255,26,117,.20), transparent 32%),linear-gradient(135deg,#050505,#16030c 55%,#09090f)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",padding:"clamp(24px,6vw,36px) 16px"},children:[t.jsxs("div",{className:"sub-account-gate-content",style:{width:"min(980px,100%)",textAlign:"center"},children:[t.jsxs("h1",{className:"sub-account-brand",style:{fontSize:"clamp(2.5rem,7vw,4.5rem)",margin:"0 0 12px",fontWeight:950},children:[t.jsx("span",{style:{color:"#ff1a75"},children:"Anime"}),"Vault"]}),t.jsx("p",{style:{color:"#f8fafc",fontSize:"clamp(1.1rem,4vw,1.45rem)",margin:"0 0 clamp(34px,8vw,70px)"},children:"Who's watching?"}),t.jsxs("div",{style:{display:"flex",justifyContent:"center",alignItems:"flex-start",gap:"clamp(20px,5vw,54px)",flexWrap:"wrap"},children:[u.map((e,o)=>{const r=typeof window<"u"&&window.innerWidth<520?104:132;return t.jsxs("div",{className:"sub-account-card",style:{width:152,"--profile-delay":`${o*85}ms`},children:[t.jsxs("button",{type:"button",className:"sub-account-select",onClick:()=>Ce(e),"aria-label":`Open ${e.name}'s profile`,children:[t.jsx(fe,{profile:e,size:r}),t.jsx("span",{style:{fontSize:"1.15rem",fontWeight:800,overflowWrap:"anywhere"},children:e.name}),e.ageRating==="kids"&&t.jsx("span",{style:{marginTop:-10,color:"#fbbf24",fontSize:".78rem",fontWeight:900},children:"Kids 0-12"})]}),t.jsxs("div",{style:{display:"flex",gap:8,marginTop:6,flexWrap:"wrap",justifyContent:"center"},children:[t.jsxs("button",{type:"button",className:"sub-account-action",onClick:()=>ke(e),children:[t.jsx(_e,{size:12})," Edit"]}),u.length>1&&t.jsxs("button",{type:"button",className:"sub-account-action sub-account-action-remove",onClick:()=>Se(e),children:[t.jsx(Be,{size:12})," Remove"]})]})]},e.id)}),Y&&t.jsxs("button",{type:"button",className:"sub-account-add",onClick:je,style:{width:152,background:"transparent",border:"none",cursor:"pointer",color:"#fff",display:"grid",gap:14,justifyItems:"center",padding:8,font:"inherit",touchAction:"manipulation"},children:[t.jsx("div",{style:{width:typeof window<"u"&&window.innerWidth<520?104:132,height:typeof window<"u"&&window.innerWidth<520?104:132,borderRadius:"50%",background:"rgba(17,24,39,.82)",display:"grid",placeItems:"center",boxShadow:"0 24px 55px rgba(255,26,117,.16)",border:"4px solid rgba(255,26,117,.2)"},children:t.jsx(He,{size:44})}),t.jsx("span",{style:{fontSize:"1.15rem",fontWeight:800},children:"Add Profile"})]})]}),t.jsxs("p",{style:{marginTop:42,color:"#fda4af",fontSize:".95rem",overflowWrap:"anywhere"},children:[u.length,"/",re," profiles linked to ",a.username]}),R&&t.jsx("p",{role:"alert",style:{color:"#fca5a5"},children:R}),t.jsxs("button",{type:"button",onClick:()=>{I(()=>{},{changePin:!0})},disabled:N,style:{marginTop:8,display:"inline-flex",alignItems:"center",gap:8,minHeight:44,padding:"10px 14px",borderRadius:10,border:"1px solid rgba(255,255,255,.16)",background:"rgba(255,255,255,.06)",color:"#fff",fontWeight:800,cursor:"pointer"},children:[t.jsx(Le,{size:16})," Set or change parent PIN"]})]}),c&&t.jsx("div",{className:"sub-account-modal-backdrop",role:"dialog","aria-modal":"true","aria-labelledby":"parent-pin-title",onClick:()=>{v(null),h(""),j("")},style:{position:"fixed",inset:0,zIndex:20,background:"rgba(0,0,0,.78)",display:"grid",placeItems:"center",padding:20},children:t.jsxs("form",{className:"sub-account-modal",onSubmit:Ne,onClick:e=>e.stopPropagation(),style:{width:"min(420px,100%)",background:"#09090f",border:"1px solid rgba(255,26,117,.3)",borderRadius:18,padding:24,color:"#fff",boxShadow:"0 30px 80px rgba(0,0,0,.55)"},children:[t.jsx("button",{type:"button",onClick:()=>{v(null),h(""),j("")},"aria-label":"Close parent PIN dialog",style:{float:"right",background:"transparent",color:"#fda4af",border:0,cursor:"pointer"},children:t.jsx(ie,{size:18})}),t.jsxs("h2",{id:"parent-pin-title",style:{display:"flex",alignItems:"center",gap:10,marginTop:0},children:[t.jsx(Ve,{size:22}),c.mode==="verify"?"Parent approval":c.mode==="change-verify"?"Verify parent PIN":"Set parent PIN"]}),t.jsx("p",{style:{color:"#cbd5e1",lineHeight:1.5},children:c.mode==="verify"?"Enter the parent PIN to open an adult profile or manage a kids profile.":c.mode==="change-verify"?"Verify the current PIN before changing parent controls.":"Create a 6–12 digit PIN. Parent approval is required to open adult profiles when kids profiles are enabled."}),t.jsxs("label",{style:{display:"grid",gap:7,margin:"16px 0",fontWeight:750},children:[c.mode==="setup"?"New parent PIN":"Parent PIN",t.jsx("input",{autoFocus:!0,inputMode:"numeric",autoComplete:"new-password",type:"password",pattern:"[0-9]{6,12}",maxLength:12,value:P,onChange:e=>h(e.target.value.replace(/\D/g,"").slice(0,12)),"aria-label":"Parent PIN",style:{width:"100%",minHeight:46,boxSizing:"border-box",padding:"12px 14px",borderRadius:10,border:"1px solid rgba(255,255,255,.18)",background:"#111827",color:"#fff",fontSize:18,letterSpacing:4}})]}),c.mode==="setup"&&t.jsxs("label",{style:{display:"grid",gap:7,margin:"16px 0",fontWeight:750},children:["Confirm parent PIN",t.jsx("input",{inputMode:"numeric",autoComplete:"new-password",type:"password",pattern:"[0-9]{6,12}",maxLength:12,value:K,onChange:e=>j(e.target.value.replace(/\D/g,"").slice(0,12)),"aria-label":"Confirm parent PIN",style:{width:"100%",minHeight:46,boxSizing:"border-box",padding:"12px 14px",borderRadius:10,border:"1px solid rgba(255,255,255,.18)",background:"#111827",color:"#fff",fontSize:18,letterSpacing:4}})]}),G&&t.jsx("p",{role:"alert",style:{color:"#fca5a5"},children:G}),t.jsx("button",{type:"submit",disabled:N,style:{width:"100%",minHeight:46,border:0,borderRadius:10,background:"linear-gradient(135deg,#ff1a75,#ef4444)",color:"#000",fontWeight:900,cursor:N?"wait":"pointer"},children:N?"Checking…":c.mode==="setup"?"Save PIN":"Continue"})]})}),Pe&&t.jsx("div",{className:"sub-account-modal-backdrop",onClick:()=>{A(!1),E()},style:{position:"fixed",inset:0,zIndex:10,background:"rgba(0,0,0,.72)",display:"grid",placeItems:"center",padding:20},children:t.jsxs("form",{className:"sub-account-modal",onSubmit:Ae,onClick:e=>e.stopPropagation(),style:{width:"min(430px,100%)",maxHeight:"calc(100vh - 40px)",overflowY:"auto",background:"#09090f",border:"1px solid rgba(255,26,117,.28)",borderRadius:20,padding:24,textAlign:"left",boxShadow:"0 30px 80px rgba(255,26,117,.18)"},children:[t.jsx("button",{type:"button",onClick:()=>{A(!1),E()},"aria-label":"Close profile form",style:{float:"right",background:"transparent",color:"#fda4af",border:"none",cursor:"pointer",minWidth:40,minHeight:40},children:t.jsx(ie,{size:18})}),t.jsxs("h2",{style:{marginTop:0,display:"flex",gap:10,alignItems:"center"},children:[t.jsx(Me,{size:22})," ",s?"Edit Profile":"Add Profile"]}),t.jsx("input",{autoFocus:!0,maxLength:18,value:x,onChange:e=>_(e.target.value),placeholder:"Profile name","aria-label":"Profile name",style:{width:"100%",padding:"13px 14px",borderRadius:12,border:"1px solid rgba(255,26,117,.24)",background:"rgba(255,255,255,.06)",color:"#fff",marginBottom:12,boxSizing:"border-box"}}),t.jsxs("label",{style:{display:"grid",gap:8,marginBottom:16,color:"#f8fafc",fontWeight:800},children:["Profile picture",B&&t.jsx(fe,{profile:{name:x||"Profile",avatar:B,color:W},size:72}),t.jsx("input",{type:"file",accept:"image/*",onChange:Ie,disabled:L,style:{width:"100%",color:"#fff"}}),L&&t.jsx("span",{style:{color:"#fda4af",fontSize:".85rem"},children:"Uploading profile picture..."})]}),t.jsxs("label",{style:{display:"grid",gap:8,marginBottom:16,color:"#f8fafc",fontWeight:800},children:["Age rating",t.jsx("select",{value:M,onChange:e=>D(e.target.value),style:{width:"100%",padding:"13px 14px",borderRadius:12,border:"1px solid rgba(255,26,117,.24)",background:"#111827",color:"#fff",boxSizing:"border-box"},children:We.map(e=>t.jsx("option",{value:e.id,children:e.label},e.id))})]}),t.jsx("div",{style:{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"},children:z.map(e=>t.jsx("button",{type:"button",onClick:()=>V(e),"aria-label":`Use ${e}`,"aria-pressed":W===e,style:{width:40,height:40,flex:"0 0 40px",borderRadius:"50%",background:e,border:W===e?"3px solid #fff":"3px solid transparent",cursor:"pointer",touchAction:"manipulation"}},e))}),(y||R)&&t.jsx("p",{role:"alert",style:{color:"#fca5a5",fontSize:".85rem"},children:y||R}),t.jsx("button",{disabled:!!y||L,style:{width:"100%",padding:"13px 16px",minHeight:46,borderRadius:12,border:"none",background:y?"#475569":"linear-gradient(135deg,#ff1a75,#ef4444)",color:"#000",fontWeight:900,cursor:y?"not-allowed":"pointer",touchAction:"manipulation"},children:s?"Save Profile":"Create Profile"})]})})]})]})}export{et as default};
