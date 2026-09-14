import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AnimeCard from "../components/AnimeCard";
import { fetchTrendingMedia, fetchAnimeBySeason, fetchAnimeByIds } from "../api/anilist";
import { getTrendingBoard } from "../api/db";
import LatestSection from "../components/LatestSection";
import { useUser } from "../api/UserContext";
import { Play, Calendar, Star, Info, Sparkles } from "lucide-react";

const SEASONS = ["WINTER", "SPRING", "SUMMER", "FALL"];
const YEARS = [2026, 2025, 2024, 2023, 2022];
const GENRES = ["Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror", "Mystery", "Psychological", "Romance", "Sci-Fi", "Slice of Life", "Sports", "Supernatural"];
const KIDS_GENRES = ["Adventure", "Comedy", "Fantasy", "Slice of Life", "Sports"];
const CLASSROOM_OF_THE_ELITE_BANNER = "https://occ-0-8407-2219.1.nflxso.net/dnm/api/v6/MgXQGyNr1xbI8tJSYiMWv5kXg5g/AAAABbu2mrfgMEMATRppz3WvutNHbUSBM3rWWq3nIBWGk3n1DgG9GVI1yX5gkfdDK73a0_L0SVQnfKp2HEIMdC9KeAXdmZB7VjTqO8EI0Pyv3C8DvfJtXEYE1mXA9g.jpg?r=6ae";

const FEATURED_SLIDE_FALLBACKS = [
  { id: 180745, title: { english: "Classroom of the Elite Season 3" }, description: "Class D returns to a brutal merit-based school system where alliances, betrayals, and psychological tests decide who can climb to the top.", seasonYear: 2024, averageScore: 82, format: "TV", bannerImage: CLASSROOM_OF_THE_ELITE_BANNER },
  { id: 5114, title: { english: "Fullmetal Alchemist: Brotherhood" }, description: "Two brothers search for the Philosopher's Stone after a forbidden ritual changes their lives forever.", seasonYear: 2009, averageScore: 91, format: "TV", bannerImage: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRSo32Teh6AEGe5IwXO3EFDefYi89gXy9z50Q&s" },
  { id: 1535, title: { english: "Death Note" }, description: "A genius student discovers a notebook with deadly power and begins a cat-and-mouse war against the world's greatest detective.", seasonYear: 2006, averageScore: 84, format: "TV", bannerImage: "https://occ-0-8407-444.1.nflxso.net/dnm/api/v6/MgXQGyNr1xbI8tJSYiMWv5kXg5g/AAAABfx1O1beK9b2mjMEQXxmAB3EGCOt-T7B4X1OfSvSvPZzNQ2dSbe77KUr2PCPYBMRBmIojLoOj1GykcqDRZp3G8cOXQjqCYOoyVBC5hysqmyE6jzKAZ5I8oH5KFYw.jpg?r=3bd" },
  { id: 1735, title: { english: "Naruto: Shippuden" }, description: "Naruto continues his journey home with bigger battles, stronger rivals, and the dream of becoming Hokage still burning bright.", seasonYear: 2007, averageScore: 82, format: "TV", bannerImage: "https://static0.colliderimages.com/wordpress/wp-content/uploads/2025/02/naruto-header.jpg?w=1200&h=675&fit=crop" },
  { id: 1, title: { english: "Cowboy Bebop" }, description: "A crew of bounty hunters chases criminals across space while their pasts slowly catch up with them.", seasonYear: 1998, averageScore: 86, format: "TV", bannerImage: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTFKyfoTGfnUGfst-p3uNe3DzlnCBKoEDY37A&s" }
];

const KIDS_ANIME_HOME = [
  { id: 21, title: { english: "One Piece" }, description: "A bright pirate adventure about friendship, courage, and chasing big dreams across the seas.", seasonYear: 1999, averageScore: 89, format: "TV", bannerImage: "https://static1.cbrimages.com/wordpress/wp-content/uploads/2024/01/one-piece-anime-straw-hats.jpg", coverImage: { extraLarge: "https://cdn.myanimelist.net/images/anime/6/73245.jpg" } },
  { id: 20, title: { english: "Naruto" }, description: "Naruto trains with friends, faces rivals, and works toward becoming the best ninja in his village.", seasonYear: 2002, averageScore: 79, format: "TV", bannerImage: "https://static0.gamerantimages.com/wordpress/wp-content/uploads/2024/05/naruto-main-characters.jpg", coverImage: { extraLarge: "https://cdn.myanimelist.net/images/anime/13/17405.jpg" } },
  { id: 527, title: { english: "Pokémon" }, description: "Ash and Pikachu travel, meet new friends, and discover amazing creatures in every region.", seasonYear: 1997, averageScore: 72, format: "TV", bannerImage: "https://assets.pokemon.com/assets/cms2/img/watch-pokemon-tv/seasons/season01/season01_ep01_ss01.jpg", coverImage: { extraLarge: "https://cdn.myanimelist.net/images/anime/13/73834.jpg" } }
];

function getTitle(a) { return a?.title?.english || a?.title?.romaji || a?.title?.native || "Unknown Title"; }
function getImage(a) { return a?.coverImage?.extraLarge || a?.coverImage?.large || a?.coverImage?.medium || "/logo.png"; }
function getDescription(a) { return a?.description?.replace(/<[^>]+>/g, "") || "No description available."; }
function mergeFeatured(fallback, fetched) {
  return { ...fallback, ...fetched, title: fetched?.title || fallback.title, description: fetched?.description || fallback.description, bannerImage: fallback.bannerImage || fetched?.bannerImage, coverImage: fetched?.coverImage || fallback.coverImage, seasonYear: fetched?.seasonYear || fallback.seasonYear, averageScore: fetched?.averageScore || fallback.averageScore, format: fetched?.format || fallback.format };
}

function Home() {
  const [animeList, setAnimeList] = useState([]);
  const [featuredSlides, setFeaturedSlides] = useState(FEATURED_SLIDE_FALLBACKS);
  const [seasonalList, setSeasonalList] = useState([]);
  const [seasonalLoading, setSeasonalLoading] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState("SPRING");
  const [selectedYear, setSelectedYear] = useState(2026);
  const [activeSlide, setActiveSlide] = useState(0);
  const navigate = useNavigate();
  const { activeSubAccount } = useUser();
  const isKidsProfile = activeSubAccount?.ageRating === "kids";

  const [favoritesData, setFavoritesData] = useState(() => {
    try {
      const x = JSON.parse(localStorage.getItem("animevault_favorites") || "{}");
      return { animes: Array.isArray(x.animes) ? x.animes : [], studios: Array.isArray(x.studios) ? x.studios : [], characters: Array.isArray(x.characters) ? x.characters : [] };
    } catch {
      return { animes: [], studios: [], characters: [] };
    }
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (isKidsProfile) {
        setAnimeList(KIDS_ANIME_HOME);
        setFeaturedSlides(KIDS_ANIME_HOME);
        return;
      }
      try {
        setFeaturedSlides(FEATURED_SLIDE_FALLBACKS);
        const [data, dbFeatured] = await Promise.all([
          fetchTrendingMedia("ANIME", 1, 12).catch(() => []),
          getTrendingBoard("anime").catch(() => [])
        ]);
        if (cancelled) return;
        setAnimeList(Array.isArray(data) ? data : []);
        const base = Array.isArray(dbFeatured) && dbFeatured.length
          ? dbFeatured.slice(0, 5).map(item => ({ id: item.media_id, title: { english: item.title }, description: item.description || "No description available.", bannerImage: item.banner_url, coverImage: { extraLarge: item.image_url }, seasonYear: new Date().getFullYear(), averageScore: 80, format: "TV" }))
          : FEATURED_SLIDE_FALLBACKS;
        const ids = base.map(x => x.id).filter(Boolean);
        const enriched = await fetchAnimeByIds(ids).catch(() => []);
        if (cancelled) return;
        setFeaturedSlides(base.map(f => mergeFeatured(f, (enriched || []).find(a => Number(a.id) === Number(f.id)))).slice(0, 5));
      } catch (e) {
        if (!cancelled) console.warn("Homepage data load failed:", e);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [isKidsProfile]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (isKidsProfile) {
        setSeasonalList(KIDS_ANIME_HOME.slice().reverse());
        setSeasonalLoading(false);
        return;
      }
      setSeasonalLoading(true);
      const data = await fetchAnimeBySeason(selectedSeason, selectedYear).catch(() => []);
      if (!cancelled) setSeasonalList(Array.isArray(data) ? data : []);
      if (!cancelled) setSeasonalLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [selectedSeason, selectedYear, isKidsProfile]);

  useEffect(() => {
    if (featuredSlides.length < 2) return;
    const id = setInterval(() => setActiveSlide(p => (p + 1) % Math.min(5, featuredSlides.length)), 6000);
    return () => clearInterval(id);
  }, [featuredSlides.length]);

  const trending = animeList.slice(0, 12);
  const genresToShow = isKidsProfile ? KIDS_GENRES : GENRES;

  function toggleFavorite(anime) {
    setFavoritesData(cur => {
      const a = Array.isArray(cur.animes) ? cur.animes : [];
      const exists = a.some(x => x?.id === anime.id);
      const next = { ...cur, animes: exists ? a.filter(x => x?.id !== anime.id) : [...a, { id: anime.id, title: getTitle(anime), image: getImage(anime) }] };
      try { localStorage.setItem("animevault_favorites", JSON.stringify(next)); } catch {}
      return next;
    });
  }

  return (
    <section className="home-v2 animevault-home-redesign">
      <style>{`
        .animevault-home-redesign{width:100%;padding:1.1rem 0 4rem;gap:1.5rem!important}
        .animevault-home-redesign .animevault-featured{width:min(1180px,calc(100% - 2rem));height:300px;margin:0 auto;position:relative;overflow:hidden;border:1px solid rgba(255,255,255,.08);border-radius:18px;background:#07131b;box-shadow:0 18px 55px rgba(0,0,0,.25)}
        .animevault-home-redesign .featured-slide{position:absolute;inset:0;opacity:0;visibility:hidden;transition:opacity .55s ease;pointer-events:none}
        .animevault-home-redesign .featured-slide.active{opacity:1;visibility:visible;pointer-events:auto}
        .animevault-home-redesign .featured-art{position:absolute;right:0;top:0;width:67%;height:100%;object-fit:cover;object-position:center;mask-image:linear-gradient(90deg,transparent 0%,#000 22%,#000 100%);-webkit-mask-image:linear-gradient(90deg,transparent 0%,#000 22%,#000 100%);filter:saturate(1.05) contrast(1.03)}
        .animevault-home-redesign .featured-shade{position:absolute;inset:0;background:linear-gradient(90deg,#07131b 0%,rgba(7,19,27,.98) 24%,rgba(7,19,27,.72) 48%,rgba(7,19,27,.12) 78%,rgba(7,19,27,.2) 100%)}
        .animevault-home-redesign .featured-content{position:relative;z-index:3;width:min(54%,570px);height:100%;display:flex;justify-content:center;flex-direction:column;padding:1.75rem 2rem}
        .animevault-home-redesign .featured-kicker{display:flex;align-items:center;gap:.45rem;color:#ff1a75;font-size:.7rem;font-weight:850;text-transform:uppercase;letter-spacing:.1em;margin-bottom:.55rem}
        .animevault-home-redesign .featured-title{font-size:clamp(1.7rem,3vw,2.55rem);line-height:1.05;margin:0 0 .65rem;font-weight:900;letter-spacing:-.035em}
        .animevault-home-redesign .featured-meta{display:flex;align-items:center;gap:.9rem;color:#cfc2d6;font-size:.75rem;margin-bottom:.65rem}
        .animevault-home-redesign .featured-meta span{display:inline-flex;align-items:center;gap:.3rem}
        .animevault-home-redesign .featured-desc{font-size:.8rem;line-height:1.55;color:#b7c5c9;max-width:510px;margin:0 0 1rem;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .animevault-home-redesign .featured-actions{display:flex;gap:.55rem}
        .animevault-home-redesign .featured-actions button{display:inline-flex;align-items:center;justify-content:center;gap:.45rem;border-radius:9px;padding:.55rem .85rem;font-size:.75rem;font-weight:800;cursor:pointer;transition:transform .2s ease,background .2s ease}
        .animevault-home-redesign .featured-actions button:hover{transform:translateY(-1px)}
        .animevault-home-redesign .featured-play{border:0;background:#ff1a75;color:#fff;box-shadow:0 8px 22px rgba(255,26,117,.22)}
        .animevault-home-redesign .featured-info{background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.1);color:#fff}
        .animevault-home-redesign .featured-dots{position:absolute;z-index:5;right:1.1rem;bottom:1rem;display:flex;gap:.35rem}
        .animevault-home-redesign .featured-dots button{width:6px;height:6px;padding:0;border:0;border-radius:99px;background:rgba(255,255,255,.3);cursor:pointer;transition:width .2s ease,background .2s ease}
        .animevault-home-redesign .featured-dots button.active{width:20px;background:#ff1a75}
        .animevault-home-redesign .home-main-v2{width:min(1180px,calc(100% - 2rem));margin:0 auto;padding:0!important}
        .animevault-home-redesign .home-main-v2{display:flex;flex-direction:column;gap:2rem}
        .animevault-home-redesign .home-section-v2{margin:0!important}
        .animevault-home-redesign .section-header-v2{margin-bottom:.8rem!important}
        .animevault-home-redesign .section-header-v2 h2{font-size:1.25rem!important;letter-spacing:-.02em}
        .animevault-home-redesign .anime-grid-v2{gap:1rem!important}
        @media(max-width:760px){
          .animevault-home-redesign{padding-top:.75rem}
          .animevault-home-redesign .animevault-featured{width:calc(100% - 1rem);height:245px;border-radius:15px}
          .animevault-home-redesign .featured-art{width:100%;mask-image:none;-webkit-mask-image:none;opacity:.52}
          .animevault-home-redesign .featured-shade{background:linear-gradient(90deg,rgba(7,19,27,.98) 0%,rgba(7,19,27,.78) 58%,rgba(7,19,27,.4) 100%)}
          .animevault-home-redesign .featured-content{width:100%;padding:1.2rem 1.15rem;justify-content:flex-end;padding-bottom:2rem}
          .animevault-home-redesign .featured-title{font-size:1.55rem}
          .animevault-home-redesign .featured-desc{font-size:.72rem;-webkit-line-clamp:2;margin-bottom:.7rem}
          .animevault-home-redesign .featured-meta{font-size:.68rem;margin-bottom:.45rem}
          .animevault-home-redesign .featured-actions button{padding:.48rem .7rem;font-size:.7rem}
          .animevault-home-redesign .home-main-v2{width:calc(100% - 1rem)}
        }
      `}</style>

      {featuredSlides.length > 0 && (
        <div className="animevault-featured" aria-label="Featured anime">
          {featuredSlides.slice(0, 5).map((anime, index) => {
            const active = index === activeSlide;
            return (
              <div key={anime.id} className={`featured-slide ${active ? "active" : ""}`}>
                <img className="featured-art" src={anime.bannerImage || getImage(anime)} alt="" loading={index === 0 ? "eager" : "lazy"} decoding="async" />
                <div className="featured-shade" />
                <div className="featured-content">
                  <span className="featured-kicker"><Sparkles size={12} /> {isKidsProfile ? "Kids Pick" : "Featured on AnimeVault"}</span>
                  <h1 className="featured-title">{getTitle(anime)}</h1>
                  <div className="featured-meta">
                    <span><Calendar size={13} /> {anime?.seasonYear || "—"}</span>
                    <span><Star size={13} /> {anime?.averageScore || "—"}%</span>
                    <span>{anime?.format || "TV"}</span>
                  </div>
                  <p className="featured-desc">{getDescription(anime)}</p>
                  <div className="featured-actions">
                    <button className="featured-play" onClick={() => navigate(`/anime/${anime.id}`)}><Play size={14} fill="currentColor" /> Watch Now</button>
                    <button className="featured-info" onClick={() => navigate(`/anime/${anime.id}`)}><Info size={14} /> Details</button>
                  </div>
                </div>
              </div>
            );
          })}
          <div className="featured-dots">
            {featuredSlides.slice(0, 5).map((_, i) => <button key={i} aria-label={`Slide ${i + 1}`} onClick={() => setActiveSlide(i)} className={i === activeSlide ? "active" : ""} />)}
          </div>
        </div>
      )}

      <div className="home-main-v2">
        {!isKidsProfile && <LatestSection />}

        <section className="home-section-v2">
          <div className="section-header-v2">
            <div style={{ display: "flex", alignItems: "center", gap: ".8rem", flexWrap: "wrap" }}>
              <h2>{isKidsProfile ? "Kids Anime Adventures" : "Seasonal Browser"}</h2>
              <div className="seasonal-controls-v2">
                <select value={selectedSeason} onChange={e => setSelectedSeason(e.target.value)} className="server-dropdown-v2">{SEASONS.map(s => <option key={s}>{s}</option>)}</select>
                <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="server-dropdown-v2">{YEARS.map(y => <option key={y}>{y}</option>)}</select>
              </div>
            </div>
          </div>
          {seasonalLoading ? <div className="section-loading">Loading seasonal anime…</div> : <div className="anime-grid-v2">{seasonalList.slice(0, 12).map(a => <AnimeCard key={a.id} anime={a} isFavorite={(favoritesData.animes || []).some(x => x?.id === a.id)} onToggleFavorite={() => toggleFavorite(a)} />)}</div>}
        </section>

        <section className="home-section-v2">
          <div className="section-header-v2"><h2>Trending Now</h2></div>
          <div className="anime-grid-v2">{trending.map(a => <AnimeCard key={a.id} anime={a} isFavorite={(favoritesData.animes || []).some(x => x?.id === a.id)} onToggleFavorite={() => toggleFavorite(a)} />)}</div>
        </section>

        <section className="home-section-v2">
          <div className="section-header-v2"><h2>Explore Genres</h2></div>
          <div className="genre-grid-v2">{genresToShow.map(g => <button key={g} onClick={() => navigate(`/search?genre=${encodeURIComponent(g)}&type=ANIME`)}>{g}</button>)}</div>
        </section>
      </div>
    </section>
  );
}

export default Home;
