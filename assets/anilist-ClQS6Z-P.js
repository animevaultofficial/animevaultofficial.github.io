const V="https://graphql.anilist.co",K="https://kitsu.io/api/edge",H="https://api.jikan.moe/v4";let S=!1;(function(){try{for(let t=localStorage.length-1;t>=0;t--){const a=localStorage.key(t);a&&(a.includes("animevault_kitsu_")||a.includes("animevault_jikan_"))&&localStorage.removeItem(a)}}catch{}})();const B={144192:46853,140960:46174,142838:46487,166873:48270,16498:41370},Z={46853:144192,46174:140960,46487:142838,48270:166873,41370:16498},x={46853:54968,46174:51009,46487:52991,48270:57569,41370:38e3},Q={46853:"https://occ-0-8407-2218.1.nflxso.net/dnm/api/v6/6AYY37jfdO6hpXcMjf9Yu5cnmO0/AAAABVsYZUxoW6EqHCyHECMe2UKD_flr8J8YbE0OPZ8gc3tXEuq4RZQumrmxSHiF9SGErHCz3brEgIdZV4UJJ3oqDrzVLOQiDE7DRQ6Y.jpg?r=6ae"},z={46853:"https://m.media-amazon.com/images/M/MV5BMDg3MGVhNWUtYTQ2NS00ZDdiLTg5MTMtZmM5MjUzN2IxN2I4XkEyXkFqcGc@._V1_.jpg"};async function R(e){const t=`animevault_kitsu_${e.replace(/[^a-zA-Z0-9]/g,"_")}`;try{const r=localStorage.getItem(t);if(r){const{data:i,ts:o}=JSON.parse(r);if(!JSON.stringify(i).includes("Gabrielle")&&!e.includes("trending")&&Date.now()-o<18e5)return i}}catch{}const a=await fetch(`${K}${e}`,{headers:{Accept:"application/vnd.api+json","Content-Type":"application/vnd.api+json"}});if(!a.ok)throw new Error(`Kitsu API failed: ${a.status}`);const s=(await a.json()).data;try{localStorage.setItem(t,JSON.stringify({data:s,ts:Date.now()}))}catch{}return s}function X(e){try{const t=localStorage.getItem(e);if(!t)return null;const{data:a,ts:n}=JSON.parse(t);if(Date.now()-n<18e5)return a}catch{}return null}function W(e,t){try{localStorage.setItem(e,JSON.stringify({data:t,ts:Date.now()}))}catch{}}async function G(e,t=15e3){for(let n=1;n<=3;n++){const s=new AbortController,r=t*(n===1?1:1.5*n),i=setTimeout(()=>s.abort(),r);try{const o=await fetch(e,{headers:{Accept:"application/json"},signal:s.signal});if(!o.ok)throw new Error(`Request failed: ${o.status}`);return await o.json()}catch(o){if(n===3)throw o;await new Promise(l=>setTimeout(l,500*n))}finally{clearTimeout(i)}}}async function ee(e){try{const t=`https://arm.kawaiioverflow.com/api/ids?service=anilist&id=${e}`,a=await G(t);if(a&&typeof a.mal_id=="number")return a.mal_id}catch(t){console.warn("ARM mapping failed for AniList ID",e,t.message)}try{const a=await p("query ($id: Int) { Media(id: $id) { idMal } }",{id:e});if(a&&a.Media&&typeof a.Media.idMal=="number")return a.Media.idMal}catch(t){console.warn("AniList GraphQL fallback failed for ID",e,t.message)}return null}async function O(e){const t=`animevault_jikan_v2_${e.replace(/[^a-zA-Z0-9]/g,"_")}`,a=X(t);if(a)return a;const s=(await G(`${H}${e}`)).data||[];return W(t,s),s}function Y(e,t="ANIME"){var l,c,g,u,m,h,d,f,A,y,b,w,M,$,k,v,N,I,j,C,L,T,D;if(!(e!=null&&e.mal_id)||!e.title)return null;const a=t==="MANGA",n=((c=(l=e.images)==null?void 0:l.webp)==null?void 0:c.large_image_url)||((u=(g=e.images)==null?void 0:g.jpg)==null?void 0:u.large_image_url)||((h=(m=e.images)==null?void 0:m.webp)==null?void 0:h.image_url)||((f=(d=e.images)==null?void 0:d.jpg)==null?void 0:f.image_url)||"",s={romaji:e.title||e.title_english||e.title_japanese||"Unknown Title",english:e.title_english||e.title||e.title_japanese||"Unknown Title",native:e.title_japanese||e.title||e.title_english||"Unknown Title"},r=e.score?Math.round(Number(e.score)*10):null,i=e.year||((b=(y=(A=e.aired)==null?void 0:A.prop)==null?void 0:y.from)==null?void 0:b.year)||(($=(M=(w=e.published)==null?void 0:w.prop)==null?void 0:M.from)==null?void 0:$.year)||null;let o=null;return(k=e.trailer)!=null&&k.youtube_id&&(o={id:e.trailer.youtube_id,site:"youtube",thumbnail:((v=e.trailer.images)==null?void 0:v.maximum_image_url)||((N=e.trailer.images)==null?void 0:N.large_image_url)}),{id:`mal-${e.mal_id}`,idMal:e.mal_id,title:s,description:e.synopsis||e.background||"No description available.",episodes:a?null:e.episodes||null,chapters:a&&e.chapters||null,volumes:a&&e.volumes||null,status:e.airing||e.status==="Currently Publishing"?"RELEASING":e.status==="Not yet aired"?"NOT_YET_RELEASED":"FINISHED",season:((j=(I=e.season)==null?void 0:I.toUpperCase)==null?void 0:j.call(I))||null,seasonYear:i,genres:(e.genres||[]).map(_=>_.name).filter(Boolean),averageScore:r,meanScore:r,coverImage:{extraLarge:n,large:n,medium:n,color:"#ff1a75"},bannerImage:((L=(C=e.trailer)==null?void 0:C.images)==null?void 0:L.maximum_image_url)||n,format:((D=(T=e.type)==null?void 0:T.toUpperCase)==null?void 0:D.call(T))||(a?"MANGA":"TV"),duration:e.duration,source:e.source,studios:{nodes:(e.studios||[]).map(_=>({name:_.name}))},relations:{nodes:[],edges:[]},recommendations:{nodes:[]},externalLinks:[e.url?{site:"MyAnimeList",url:e.url,id:String(e.mal_id)}:null].filter(Boolean),trailer:o}}function U(e,t="ANIME"){return(e||[]).map(a=>a!=null&&a.attributes?E(a,t):Y(a,t)).filter(a=>{var n,s;return(a==null?void 0:a.id)&&(a==null?void 0:a.title)&&a.title.romaji!=="Unknown Title"&&(((n=a.coverImage)==null?void 0:n.large)||((s=a.coverImage)==null?void 0:s.extraLarge))})}function E(e,t="ANIME"){var y,b,w,M,$,k,v,N,I,j,C,L,T,D,_;if(!e)return null;const a=((y=e.attributes)==null?void 0:y.canonicalTitle)||"",n=((w=(b=e.attributes)==null?void 0:b.titles)==null?void 0:w.en_jp)||"",s=(($=(M=e.attributes)==null?void 0:M.titles)==null?void 0:$.en)||"";(a.toLowerCase().includes("gabrielle")||n.toLowerCase().includes("gabrielle")||s.toLowerCase().includes("gabrielle"))&&(e.id="46853",e.attributes={canonicalTitle:"Classroom of the Elite III",titles:{en:"Classroom of the Elite Season 3",en_jp:"Classroom of the Elite Season 3",ja_jp:"ようこそ実力至上主義の教室へ 3rd Season"},synopsis:"Third season of Classroom of the Elite. Students of the prestigious Tokyo Metropolitan Advanced Nurturing High School face new trials under the school's unique meritocratic point system.",startDate:"2024-01-03",status:"finished",subtype:"TV",episodeCount:13,averageRating:"82",posterImage:{large:"https://media.kitsu.io/anime/poster_images/46853/large.jpg"},coverImage:{large:"https://occ-0-8407-2218.1.nflxso.net/dnm/api/v6/6AYY37jfdO6hpXcMjf9Yu5cnmO0/AAAABVsYZUxoW6EqHCyHECMe2UKD_flr8J8YbE0OPZ8gc3tXEuq4RZQumrmxSHiF9SGErHCz3brEgIdZV4UJJ3oqDrzVLOQiDE7DRQ6Y.jpg"}});const r=e.attributes||{},i=t==="MANGA",o={romaji:((k=r.titles)==null?void 0:k.en_jp)||r.canonicalTitle||"Unknown Title",english:((v=r.titles)==null?void 0:v.en)||r.canonicalTitle||"Unknown Title",native:((N=r.titles)==null?void 0:N.ja_jp)||r.canonicalTitle||"Unknown Title"},l=Number(e.id),c=z[l]||((I=r.posterImage)==null?void 0:I.large)||((j=r.posterImage)==null?void 0:j.medium)||"",g={extraLarge:c||((C=r.posterImage)==null?void 0:C.original)||"",large:c,medium:c||((L=r.posterImage)==null?void 0:L.medium)||"",color:"#ff1a75"},u=Z[l]||l,m=x[l]||l,h=Q[l]||((T=r.coverImage)==null?void 0:T.large)||((D=r.coverImage)==null?void 0:D.original)||g.extraLarge;(_=r.subtype)!=null&&_.toUpperCase();let d="FINISHED";r.status==="current"||r.status==="publishing"?d="RELEASING":r.status==="upcoming"&&(d="NOT_YET_RELEASED");const f=r.averageRating?Math.round(parseFloat(r.averageRating)):75,A=r.startDate?new Date(r.startDate).getFullYear():null;return{id:u,idMal:m,title:o,description:r.synopsis||"No description available.",episodes:r.episodeCount||null,chapters:r.chapterCount||null,volumes:r.volumeCount||null,status:d,season:"SPRING",seasonYear:A,genres:["Action","Adventure","Fantasy"],averageScore:f,meanScore:f,coverImage:g,bannerImage:h,studios:{nodes:[]},relations:{nodes:[],edges:[]},externalLinks:[]}}const q=[{id:"46853",attributes:{canonicalTitle:"Classroom of the Elite III",titles:{en:"Classroom of the Elite Season 3",ja_jp:"ようこそ実力至上主義の教室へ 3rd Season"},synopsis:"Third season of Classroom of the Elite. Students of the prestigious Tokyo Metropolitan Advanced Nurturing High School face new trials under the school's unique meritocratic point system.",startDate:"2024-01-03",status:"finished",subtype:"TV",episodeCount:13,averageRating:"82",posterImage:{large:"https://media.kitsu.io/anime/poster_images/46853/large.jpg"}}},{id:"3914",attributes:{canonicalTitle:"Fullmetal Alchemist: Brotherhood",titles:{en:"Fullmetal Alchemist: Brotherhood",ja_jp:"鋼の錬金術師 FULLMETAL ALCHEMIST"},synopsis:"Two brothers lose their mother and attempt to bring her back with forbidden alchemy, losing parts of their bodies in the process.",startDate:"2009-04-05",status:"finished",subtype:"TV",episodeCount:64,averageRating:"91",posterImage:{large:"https://media.kitsu.io/anime/poster_images/3914/large.jpg"}}},{id:"41370",attributes:{canonicalTitle:"Kimetsu no Yaiba",titles:{en:"Demon Slayer: Kimetsu no Yaiba",ja_jp:"鬼滅の刃"},synopsis:"A family is attacked by demons and only two members survive - Tanjiro and his sister Nezuko, who is turning into a demon. Tanjiro sets out to become a demon slayer.",startDate:"2019-04-06",status:"finished",subtype:"TV",episodeCount:26,averageRating:"85",posterImage:{large:"https://media.kitsu.io/anime/poster_images/41370/large.jpg"}}},{id:"45217",attributes:{canonicalTitle:"Spy x Family",titles:{en:"SPY x FAMILY",ja_jp:"SPY×FAMILY"},synopsis:"A spy on an undercover mission gets married and adopts a child as part of his cover. However, his wife is a deadly assassin and his daughter is a telepath.",startDate:"2022-04-09",status:"finished",subtype:"TV",episodeCount:12,averageRating:"86",posterImage:{large:"https://media.kitsu.io/anime/poster_images/45217/large.jpg"}}},{id:"46487",attributes:{canonicalTitle:"Sousou no Frieren",titles:{en:"Frieren: Beyond Journey's End",ja_jp:"葬送のフリーレン"},synopsis:"An elf mage and her former party members' journey has ended. Now, she begins a new adventure to learn more about humans.",startDate:"2023-09-29",status:"finished",subtype:"TV",episodeCount:28,averageRating:"93",posterImage:{large:"https://media.kitsu.io/anime/poster_images/46487/large.jpg"}}}];async function J(e="ANIME",t=1,a=18){const n=e==="MANGA"?"/top/manga":"/top/anime",s=e==="MANGA"?"bypopularity":"airing";try{const r=await O(`${n}?filter=${s}&page=${t}&limit=${a}`),i=U(r,e);if(i.length)return i;throw new Error("Jikan returned no usable trending items")}catch(r){console.warn("Jikan trending failed, trying legacy Kitsu fallback:",r.message);try{const l=await R(`${e==="MANGA"?"/manga":"/anime"}?sort=popularityRank&page[limit]=${a}`),c=U(l,e);if(c.length)return c}catch(i){console.error("Legacy Kitsu trending failed, returning mock data:",i.message)}return q.map(i=>E(i,e))}}async function F(e,t="ANIME",a=1,n=25){const r=t==="MANGA"?"/manga":"/anime",i=encodeURIComponent((e||"").trim()||"naruto"),o=(e||"").trim()?`${r}?q=${i}&order_by=score&sort=desc&page=${a}&limit=${n}`:`${r}?order_by=popularity&sort=asc&page=${a}&limit=${n}`;try{const l=await O(o),c=U(l,t);if(c.length)return c;throw new Error("Jikan returned no usable search items")}catch(l){console.warn("Jikan search failed, trying legacy Kitsu fallback:",l.message);try{const u=await R(`${r}?filter[text]=${encodeURIComponent(e||"")}&page[limit]=${n}`),m=U(u,t);if(m.length)return m}catch(u){console.error("Legacy Kitsu search failed, returning mock data:",u.message)}const c=q.filter(u=>{var f,A,y;const m=((f=u.attributes)==null?void 0:f.canonicalTitle)||"",h=((y=(A=u.attributes)==null?void 0:A.titles)==null?void 0:y.en)||"",d=(e||"").toLowerCase();return d?m.toLowerCase().includes(d)||h.toLowerCase().includes(d):!0});return(c.length>0?c:q).map(u=>E(u,t))}}async function P(e){const t=String(e||"").replace(/^mal-/,""),a=Number(t),n=B[a];let s=n?x[n]:null;if(!s){const i=await ee(a);i?s=i:s=a}const r=n||a;if(!Number.isFinite(s)||!Number.isFinite(r))return null;try{const i=await O(`/anime/${s}/full`),o=Y(i,"ANIME");if(o)return o.id=e,o}catch{try{const o=await O(`/manga/${s}/full`),l=Y(o,"MANGA");if(l)return l.id=e,l}catch(o){console.warn("Jikan details failed, trying legacy Kitsu fallback:",o.message)}}try{const i=await R(`/anime/${r}`),o=E(i,"ANIME");if(o)return o.id=e,o}catch{try{const o=await R(`/manga/${r}`),l=E(o,"MANGA");if(l)return l.id=e,l}catch{console.error("Kitsu details failed, searching local cache for ID:",r);const l=q.find(c=>c.id===String(r));if(l){const c=E(l,"ANIME");if(c)return c.id=e,c}return null}}}async function p(e,t={},a=0){var r;const n=new AbortController,s=setTimeout(()=>n.abort(),15e3);try{const i=await fetch(V,{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({query:e,variables:t}),signal:n.signal});if(clearTimeout(s),!i.ok){if(i.status===403)throw new Error("AniList API disabled (403 Forbidden)");if(i.status>=500&&a>0)return console.warn(`AniList 500 error, retrying... (${a} left)`),p(e,t,a-1);throw new Error(`AniList request failed: ${i.status}`)}const o=await i.json();if((r=o.errors)!=null&&r.length)throw new Error(o.errors[0].message||"AniList GraphQL error");return o.data}catch(i){if(clearTimeout(s),i.name==="AbortError")throw new Error("AniList request timed out. Please check your connection.");if(a>0)return p(e,t,a-1);throw i}}function ae(e=""){return e.replace(/<[^>]+>/g,"").replace(/\s+/g," ").trim()}async function te(e=[]){const t=e.map(n=>Number(n)).filter(Number.isFinite);if(!t.length)return[];const a=`
    query ($ids: [Int], $perPage: Int) {
      Page(page: 1, perPage: $perPage) {
        media(id_in: $ids, type: ANIME) {
          id
          idMal
          title { romaji english native }
          description
          episodes
          status
          season
          seasonYear
          genres
          averageScore
          meanScore
          popularity
          format
          duration
          source
          studios { nodes { name } }
          coverImage { extraLarge large medium color }
          bannerImage
          trailer { id site thumbnail }
        }
      }
    }
  `;try{return(await p(a,{ids:t,perPage:t.length})).Page.media||[]}catch(n){return console.warn("AniList failed to fetch featured anime, falling back to individual lookups:",n.message),(await Promise.all(t.map(async r=>{try{return await P(r)}catch{return null}}))).filter(Boolean)}}async function re(e="ANIME",t=1,a=18){if(S)return J(e,t,a);const n=`
    query ($type: MediaType, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(sort: TRENDING_DESC, type: $type, countryOfOrigin: "JP", isAdult: false) {
          id
          idMal
          title { romaji english }
          description
          episodes
          coverImage { extraLarge large medium }
          bannerImage
          genres
          format
          averageScore
          seasonYear
          trailer { id site thumbnail }
        }
      }
    }
  `;try{return(await p(n,{type:e,page:t,perPage:a})).Page.media}catch(s){return console.warn("AniList failed to fetch trending media, falling back to Jikan:",s.message),S=!0,J(e,t,a)}}async function ne(e,t="ANIME",a=null,n=1,s=50,r="TRENDING",i=null,o=null){if(S)return F(e,t,n,s);let l="$type: MediaType, $page: Int, $perPage: Int",c='type: $type, countryOfOrigin: "JP", isAdult: false';const g={type:t,page:n,perPage:s};e&&(l+=", $search: String",c+=", search: $search",g.search=e),a&&(l+=", $genre: String",c+=", genre: $genre",g.genre=a);const m={POPULARITY:"POPULARITY_DESC",SCORE:"SCORE_DESC",TRENDING:"TRENDING_DESC",FAVOURITES:"FAVOURITES_DESC",UPDATED:"UPDATED_AT_DESC"}[r]||"TRENDING_DESC";c+=`, sort: ${m}`,i&&i!=="All"&&(l+=", $status: MediaStatus",c+=", status: $status",g.status=i),o&&o!=="All"&&(l+=", $year: Int",c+=", seasonYear: $year",g.year=Number(o));const h=`
    query (${l}) {
      Page(page: $page, perPage: $perPage) {
        media(${c}) {
          id
          idMal
          title { romaji english native }
          description
          status
          episodes
          chapters
          volumes
          coverImage { extraLarge large medium color }
          bannerImage
          genres
          format
          averageScore
          meanScore
          seasonYear
          trailer { id site thumbnail }
        }
      }
    }
  `;try{return(await p(h,g)).Page.media}catch(d){return console.warn("AniList failed to search anime, falling back to Jikan:",d.message),S=!0,F(e,t,n,s)}}async function se(e){if(String(e||"").startsWith("mal-")||S)return P(e);const t=`
    query ($id: Int) {
      Media(id: $id) {
        id
        idMal
        title { romaji english native }
        description
        episodes
        status
        season
        seasonYear
        genres
        averageScore
        meanScore
        popularity
        format
        duration
        source
        studios { nodes { name } }
        trailer { id site thumbnail }
        startDate { year month day }
        endDate { year month day }
        coverImage { large extraLarge color }
        bannerImage
        nextAiringEpisode { episode timeUntilAiring }
        externalLinks { site url id }
        relations {
          nodes {
            id
            idMal
            type
            status
            format
            title { romaji english native }
            coverImage { large }
          }
          edges {
            relationType(version: 2)
            node { id }
          }
        }
        recommendations(page: 1, perPage: 6, sort: RATING_DESC) {
          nodes {
            mediaRecommendation {
              id
              idMal
              title { romaji }
              coverImage { large medium }
            }
          }
        }
      }
    }
  `;try{return(await p(t,{id:Number(e)})).Media}catch(a){return console.warn(`AniList failed to fetch anime ID ${e}, falling back to Jikan:`,a.message),S=!0,P(e)}}async function ie(e,t=1,a=20){const n=`
    query ($search: String, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        characters(search: $search, sort: FAVOURITES_DESC) {
          id
          name { full native userPreferred }
          image { large medium }
        }
      }
    }
  `;try{return(await p(n,{search:e,page:t,perPage:a})).Page.characters}catch(s){return console.warn("AniList failed to search characters:",s.message),[]}}async function oe(e,t=1,a=20){const n=`
    query ($search: String, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        studios(search: $search, sort: FAVOURITES_DESC) {
          id
          name
          favourites
        }
      }
    }
  `;try{return(await p(n,{search:e,page:t,perPage:a})).Page.studios}catch(s){return console.warn("AniList failed to search studios:",s.message),[]}}async function le(e=1,t=20){const a=`
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        characters(sort: FAVOURITES_DESC) {
          id
          name { full native userPreferred }
          image { large medium }
        }
      }
    }
  `;try{return(await p(a,{page:e,perPage:t})).Page.characters}catch(n){return console.warn("AniList failed to fetch trending characters:",n.message),[]}}async function ce(e=1,t=20){const a=`
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        studios(sort: FAVOURITES_DESC) {
          id
          name
          favourites
        }
      }
    }
  `;try{return(await p(a,{page:e,perPage:t})).Page.studios}catch(n){return console.warn("AniList failed to fetch trending studios:",n.message),[]}}export{te as a,le as b,re as c,ce as d,ie as e,se as f,oe as g,ae as h,ne as s};
