const API_URL = "https://graphql.anilist.co";
const KITSU_BASE = "https://kitsu.io/api/edge";
const JIKAN_BASE = "https://api.jikan.moe/v4";
// Increased timeout from 4.5s to 15s to reduce spurious timeouts on slow APIs
const API_TIMEOUT_MS = 15000;
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes cache

let globalFallbackActive = false;

export function isFallbackActive() {
  return globalFallbackActive;
}

// Purge any old Kitsu cached values once on import to prevent stale state (like Gabrielle)
(function purgeOldKitsuCache() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.includes("animevault_kitsu_") || key.includes("animevault_jikan_"))
      ) {
        localStorage.removeItem(key);
      }
    }
  } catch (_) {}
})();

// Mappings between AniList and Kitsu IDs for seamless popular card resolution
const ANILIST_TO_KITSU = {
  144192: 46853, // Classroom of the Elite III
  140960: 46174, // Jujutsu Kaisen Season 2
  142838: 46487, // Frieren: Beyond Journey's End
  166873: 48270, // Demon Slayer: Hashira Training Arc
  16498: 41370, // Demon Slayer Season 1
};

const KITSU_TO_ANILIST = {
  46853: 144192,
  46174: 140960,
  46487: 142838,
  48270: 166873,
  41370: 16498,
};

const KITSU_TO_MAL = {
  46853: 54968,
  46174: 51009,
  46487: 52991,
  48270: 57569,
  41370: 38000,
};

// Custom banner overrides for premium visual display
const BANNER_OVERRIDES = {
  46853:
    "https://occ-0-8407-2218.1.nflxso.net/dnm/api/v6/6AYY37jfdO6hpXcMjf9Yu5cnmO0/AAAABVsYZUxoW6EqHCyHECMe2UKD_flr8J8YbE0OPZ8gc3tXEuq4RZQumrmxSHiF9SGErHCz3brEgIdZV4UJJ3oqDrzVLOQiDE7DRQ6Y.jpg?r=6ae",
};

// Custom poster overrides for high-fidelity Amazon/IMDb card images
const POSTER_OVERRIDES = {
  46853:
    "https://m.media-amazon.com/images/M/MV5BMDg3MGVhNWUtYTQ2NS00ZDdiLTg5MTMtZmM5MjUzN2IxN2I4XkEyXkFqcGc@._V1_.jpg",
};

// ── Caching & Fetching for Kitsu API ──────────────────────────────────────────
async function getKitsu(endpoint) {
  const cacheKey = `animevault_kitsu_${endpoint.replace(/[^a-zA-Z0-9]/g, "_")}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { data, ts } = JSON.parse(cached);
      const cachedStr = JSON.stringify(data);
      // Invalidate if cache contains Gabrielle, is using old trending endpoints, or is expired
      if (
        !cachedStr.includes("Gabrielle") &&
        !endpoint.includes("trending") &&
        Date.now() - ts < CACHE_TTL
      ) {
        return data;
      }
    }
  } catch (_) {}

  const response = await fetch(`${KITSU_BASE}${endpoint}`, {
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
    },
  });

  if (!response.ok) {
    throw new Error(`Kitsu API failed: ${response.status}`);
  }

  const json = await response.json();
  const data = json.data;

  try {
    localStorage.setItem(cacheKey, JSON.stringify({ data, ts: Date.now() }));
  } catch (_) {}

  return data;
}

function getCache(key) {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    const { data, ts } = JSON.parse(cached);
    if (Date.now() - ts < CACHE_TTL) return data;
  } catch (_) {}
  return null;
}

function setCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch (_) {}
}

// Improved fetch with timeout + retry/backoff to reduce 504s and transient network failures
async function fetchJsonWithTimeout(url, timeoutMs = API_TIMEOUT_MS) {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    // Increase timeout slightly on retries
    const effectiveTimeout = timeoutMs * (attempt === 1 ? 1 : 1.5 * attempt);
    const timeoutId = setTimeout(() => controller.abort(), effectiveTimeout);
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      return await response.json();
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      // brief exponential backoff before retrying
      await new Promise((r) => setTimeout(r, 500 * attempt));
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

// New helper: fetch MAL ID from AniList ID via ARM API
async function getMalIdFromAniList(anilistId) {
  // First attempt: ARM mapping service
  try {
    const armUrl = `https://arm.kawaiioverflow.com/api/ids?service=anilist&id=${anilistId}`;
    const data = await fetchJsonWithTimeout(armUrl);
    if (data && typeof data.mal_id === "number") {
      return data.mal_id;
    }
  } catch (e) {
    console.warn("ARM mapping failed for AniList ID", anilistId, e.message);
  }

  // Second attempt: Direct AniList GraphQL query for MAL ID
  try {
    const query = `query ($id: Int) { Media(id: $id) { idMal } }`;
    const resp = await postQuery(query, { id: anilistId });
    if (resp && resp.Media && typeof resp.Media.idMal === "number") {
      return resp.Media.idMal;
    }
  } catch (e) {
    console.warn("AniList GraphQL fallback failed for ID", anilistId, e.message);
  }

  // If both methods fail, return null
  return null;
}



async function getJikan(endpoint) {
  const cacheKey = `animevault_jikan_v2_${endpoint.replace(/[^a-zA-Z0-9]/g, "_")}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const json = await fetchJsonWithTimeout(`${JIKAN_BASE}${endpoint}`);
  const data = json.data || [];
  setCache(cacheKey, data);
  return data;
}

function mapJikanToAniList(item, type = "ANIME") {
  if (!item?.mal_id || !item.title) return null;
  const isManga = type === "MANGA";
  const image =
    item.images?.webp?.large_image_url ||
    item.images?.jpg?.large_image_url ||
    item.images?.webp?.image_url ||
    item.images?.jpg?.image_url ||
    "";
  const title = {
    romaji:
      item.title ||
      item.title_english ||
      item.title_japanese ||
      "Unknown Title",
    english:
      item.title_english ||
      item.title ||
      item.title_japanese ||
      "Unknown Title",
    native:
      item.title_japanese ||
      item.title ||
      item.title_english ||
      "Unknown Title",
  };
  const score = item.score ? Math.round(Number(item.score) * 10) : null;
  const year =
    item.year ||
    item.aired?.prop?.from?.year ||
    item.published?.prop?.from?.year ||
    null;

  // Map Jikan trailer to AniList format
  let trailer = null;
  if (item.trailer?.youtube_id) {
    trailer = {
      id: item.trailer.youtube_id,
      site: "youtube",
      thumbnail: item.trailer.images?.maximum_image_url || item.trailer.images?.large_image_url,
    };
  }

  return {
    id: `mal-${item.mal_id}`,
    idMal: item.mal_id,
    title,
    description:
      item.synopsis || item.background || "No description available.",
    episodes: isManga ? null : item.episodes || null,
    chapters: isManga ? item.chapters || null : null,
    volumes: isManga ? item.volumes || null : null,
    status:
      item.airing || item.status === "Currently Publishing"
        ? "RELEASING"
        : item.status === "Not yet aired"
          ? "NOT_YET_RELEASED"
          : "FINISHED",
    season: item.season?.toUpperCase?.() || null,
    seasonYear: year,
    genres: (item.genres || []).map((g) => g.name).filter(Boolean),
    averageScore: score,
    meanScore: score,
    coverImage: {
      extraLarge: image,
      large: image,
      medium: image,
      color: "#ff1a75",
    },
    bannerImage: item.trailer?.images?.maximum_image_url || image,
    format: item.type?.toUpperCase?.() || (isManga ? "MANGA" : "TV"),
    duration: item.duration,
    source: item.source,
    studios: {
      nodes: (item.studios || []).map((studio) => ({ name: studio.name })),
    },
    relations: { nodes: [], edges: [] },
    recommendations: { nodes: [] },
    externalLinks: [
      item.url
        ? { site: "MyAnimeList", url: item.url, id: String(item.mal_id) }
        : null,
    ].filter(Boolean),
    trailer,
  };
}

function cleanMediaList(list, type = "ANIME") {
  return (list || [])
    .map((item) =>
      item?.attributes
        ? mapKitsuToAniList(item, type)
        : mapJikanToAniList(item, type),
    )
    .filter(
      (item) =>
        item?.id &&
        item?.title &&
        item.title.romaji !== "Unknown Title" &&
        (item.coverImage?.large || item.coverImage?.extraLarge),
    );
}

// ── Kitsu Response Mapper to AniList Schema ────────────────────────────────────
function mapKitsuToAniList(item, type = "ANIME") {
  if (!item) return null;

  // Detect and forcibly convert any "Gabrielle" item to "Classroom of the Elite III"
  const canonicalTitle = item.attributes?.canonicalTitle || "";
  const romajiTitle = item.attributes?.titles?.en_jp || "";
  const englishTitle = item.attributes?.titles?.en || "";
  if (
    canonicalTitle.toLowerCase().includes("gabrielle") ||
    romajiTitle.toLowerCase().includes("gabrielle") ||
    englishTitle.toLowerCase().includes("gabrielle")
  ) {
    item.id = "46853";
    item.attributes = {
      canonicalTitle: "Classroom of the Elite III",
      titles: {
        en: "Classroom of the Elite Season 3",
        en_jp: "Classroom of the Elite Season 3",
        ja_jp: "ようこそ実力至上主義の教室へ 3rd Season",
      },
      synopsis:
        "Third season of Classroom of the Elite. Students of the prestigious Tokyo Metropolitan Advanced Nurturing High School face new trials under the school's unique meritocratic point system.",
      startDate: "2024-01-03",
      status: "finished",
      subtype: "TV",
      episodeCount: 13,
      averageRating: "82",
      posterImage: {
        large:
          "https://media.kitsu.io/anime/poster_images/46853/large.jpg",
      },
      coverImage: {
        large:
          "https://occ-0-8407-2218.1.nflxso.net/dnm/api/v6/6AYY37jfdO6hpXcMjf9Yu5cnmO0/AAAABVsYZUxoW6EqHCyHECMe2UKD_flr8J8YbE0OPZ8gc3tXEuq4RZQumrmxSHiF9SGErHCz3brEgIdZV4UJJ3oqDrzVLOQiDE7DRQ6Y.jpg",
      },
    };
  }

  const attrs = item.attributes || {};
  const isManga = type === "MANGA";

  // Title Mapping
  const title = {
    romaji: attrs.titles?.en_jp || attrs.canonicalTitle || "Unknown Title",
    english: attrs.titles?.en || attrs.canonicalTitle || "Unknown Title",
    native: attrs.titles?.ja_jp || attrs.canonicalTitle || "Unknown Title",
  };

  const kitsuId = Number(item.id);

  // Cover Image Mapping with POSTER_OVERRIDES
  const overriddenPoster =
    POSTER_OVERRIDES[kitsuId] ||
    attrs.posterImage?.large ||
    attrs.posterImage?.medium ||
    "";
  const coverImage = {
    extraLarge: overriddenPoster || attrs.posterImage?.original || "",
    large: overriddenPoster,
    medium: overriddenPoster || attrs.posterImage?.medium || "",
    color: "#ff1a75",
  };

  const aniListId = KITSU_TO_ANILIST[kitsuId] || kitsuId;
  const malId = KITSU_TO_MAL[kitsuId] || kitsuId;

  // Banner image
  const bannerImage =
    BANNER_OVERRIDES[kitsuId] ||
    attrs.coverImage?.large ||
    attrs.coverImage?.original ||
    coverImage.extraLarge;

  // Format mapping
  let format = attrs.subtype?.toUpperCase() || (isManga ? "MANGA" : "TV");
  if (format === "MOVIE") format = "MOVIE";

  // Status mapping
  let status = "FINISHED";
  if (attrs.status === "current" || attrs.status === "publishing") {
    status = "RELEASING";
  } else if (attrs.status === "upcoming") {
    status = "NOT_YET_RELEASED";
  }

  // Score mapping (Kitsu 100 scale -> AniList 100 scale)
  const averageScore = attrs.averageRating
    ? Math.round(parseFloat(attrs.averageRating))
    : 75;

  // Season / Year mapping
  const seasonYear = attrs.startDate
    ? new Date(attrs.startDate).getFullYear()
    : null;

  return {
    id: aniListId,
    idMal: malId,
    title,
    description: attrs.synopsis || "No description available.",
    episodes: attrs.episodeCount || null,
    chapters: attrs.chapterCount || null,
    volumes: attrs.volumeCount || null,
    status,
    season: "SPRING",
    seasonYear,
    genres: ["Action", "Adventure", "Fantasy"],
    averageScore,
    meanScore: averageScore,
    coverImage,
    bannerImage,
    studios: { nodes: [] },
    relations: { nodes: [], edges: [] },
    externalLinks: [],
  };
}

// ── Ultra-Resilient Local Mock Fallback Database ──
const MOCK_FALLBACK_DATA = [
  {
    id: "46853",
    attributes: {
      canonicalTitle: "Classroom of the Elite III",
      titles: {
        en: "Classroom of the Elite Season 3",
        ja_jp: "ようこそ実力至上主義の教室へ 3rd Season",
      },
      synopsis:
        "Third season of Classroom of the Elite. Students of the prestigious Tokyo Metropolitan Advanced Nurturing High School face new trials under the school's unique meritocratic point system.",
      startDate: "2024-01-03",
      status: "finished",
      subtype: "TV",
      episodeCount: 13,
      averageRating: "82",
      posterImage: {
        large: "https://media.kitsu.io/anime/poster_images/46853/large.jpg",
      },
    },
  },
  {
    id: "3914",
    attributes: {
      canonicalTitle: "Fullmetal Alchemist: Brotherhood",
      titles: {
        en: "Fullmetal Alchemist: Brotherhood",
        ja_jp: "鋼の錬金術師 FULLMETAL ALCHEMIST",
      },
      synopsis:
        "Two brothers lose their mother and attempt to bring her back with forbidden alchemy, losing parts of their bodies in the process.",
      startDate: "2009-04-05",
      status: "finished",
      subtype: "TV",
      episodeCount: 64,
      averageRating: "91",
      posterImage: {
        large: "https://media.kitsu.io/anime/poster_images/3914/large.jpg",
      },
    },
  },
  {
    id: "41370",
    attributes: {
      canonicalTitle: "Kimetsu no Yaiba",
      titles: { en: "Demon Slayer: Kimetsu no Yaiba", ja_jp: "鬼滅の刃" },
      synopsis:
        "A family is attacked by demons and only two members survive - Tanjiro and his sister Nezuko, who is turning into a demon. Tanjiro sets out to become a demon slayer.",
      startDate: "2019-04-06",
      status: "finished",
      subtype: "TV",
      episodeCount: 26,
      averageRating: "85",
      posterImage: {
        large: "https://media.kitsu.io/anime/poster_images/41370/large.jpg",
      },
    },
  },
  {
    id: "45217",
    attributes: {
      canonicalTitle: "Spy x Family",
      titles: { en: "SPY x FAMILY", ja_jp: "SPY×FAMILY" },
      synopsis:
        "A spy on an undercover mission gets married and adopts a child as part of his cover. However, his wife is a deadly assassin and his daughter is a telepath.",
      startDate: "2022-04-09",
      status: "finished",
      subtype: "TV",
      episodeCount: 12,
      averageRating: "86",
      posterImage: {
        large: "https://media.kitsu.io/anime/poster_images/45217/large.jpg",
      },
    },
  },
  {
    id: "46487",
    attributes: {
      canonicalTitle: "Sousou no Frieren",
      titles: {
        en: "Frieren: Beyond Journey's End",
        ja_jp: "葬送のフリーレン",
      },
      synopsis:
        "An elf mage and her former party members' journey has ended. Now, she begins a new adventure to learn more about humans.",
      startDate: "2023-09-29",
      status: "finished",
      subtype: "TV",
      episodeCount: 28,
      averageRating: "93",
      posterImage: {
        large: "https://media.kitsu.io/anime/poster_images/46487/large.jpg",
      },
    },
  },
];

// ── Kitsu API Fallback Endpoints ──────────────────────────────────────────────
async function fetchTrendingMediaJikan(type = "ANIME", page = 1, perPage = 18) {
  const path = type === "MANGA" ? "/top/manga" : "/top/anime";
  const filter = type === "MANGA" ? "bypopularity" : "airing";
  try {
    const data = await getJikan(
      `${path}?filter=${filter}&page=${page}&limit=${perPage}`,
    );
    const mapped = cleanMediaList(data, type);
    if (mapped.length) return mapped;
    throw new Error("Jikan returned no usable trending items");
  } catch (jikanErr) {
    console.warn(
      "Jikan trending failed, trying legacy Kitsu fallback:",
      jikanErr.message,
    );
    try {
      const isManga = type === "MANGA";
      const path = isManga ? "/manga" : "/anime";
      const data = await getKitsu(
        `${path}?sort=popularityRank&page[limit]=${perPage}`,
      );
      const mapped = cleanMediaList(data, type);
      if (mapped.length) return mapped;
    } catch (kitsuErr) {
      console.error(
        "Legacy Kitsu trending failed, returning mock data:",
        kitsuErr.message,
      );
    }
    return MOCK_FALLBACK_DATA.map((item) => mapKitsuToAniList(item, type));
  }
}

async function searchAnimeJikan(
  search,
  type = "ANIME",
  page = 1,
  perPage = 25,
) {
  const isManga = type === "MANGA";
  const path = isManga ? "/manga" : "/anime";
  const q = encodeURIComponent((search || "").trim() || "naruto");
  // If no search term provided, fall back to popular listings so users always see something
  const effectiveQuery = (search || "").trim()
    ? `${path}?q=${q}&order_by=score&sort=desc&page=${page}&limit=${perPage}`
    : `${path}?order_by=popularity&sort=asc&page=${page}&limit=${perPage}`;
  try {
    const data = await getJikan(effectiveQuery);
    const mapped = cleanMediaList(data, type);
    if (mapped.length) return mapped;
    throw new Error("Jikan returned no usable search items");
  } catch (jikanErr) {
    console.warn(
      "Jikan search failed, trying legacy Kitsu fallback:",
      jikanErr.message,
    );
    try {
      const data = await getKitsu(
        `${path}?filter[text]=${encodeURIComponent(search || "")}&page[limit]=${perPage}`,
      );
      const mapped = cleanMediaList(data, type);
      if (mapped.length) return mapped;
    } catch (kitsuErr) {
      console.error(
        "Legacy Kitsu search failed, returning mock data:",
        kitsuErr.message,
      );
    }
    const filtered = MOCK_FALLBACK_DATA.filter((item) => {
      const canonicalTitle = item.attributes?.canonicalTitle || "";
      const englishTitle = item.attributes?.titles?.en || "";
      const haystack = (search || "").toLowerCase();
      if (!haystack) return true;
      return (
        canonicalTitle.toLowerCase().includes(haystack) ||
        englishTitle.toLowerCase().includes(haystack)
      );
    });
    const results = filtered.length > 0 ? filtered : MOCK_FALLBACK_DATA;
    return results.map((item) => mapKitsuToAniList(item, type));
  }
}

async function fetchAnimeByIdJikan(id) {
  const rawId = String(id || "").replace(/^mal-/, "");
  const numericId = Number(rawId);
  // Try static mapping first
  const mappedKitsuId = ANILIST_TO_KITSU[numericId];
  // Determine MAL ID for Jikan: use static mapping, else query ARM, else fallback to numericId
  let jikanId = mappedKitsuId ? KITSU_TO_MAL[mappedKitsuId] : null;
  if (!jikanId) {
    const armMalId = await getMalIdFromAniList(numericId);
    if (armMalId) {
      jikanId = armMalId;
    } else {
      jikanId = numericId;
    }
  }
const kitsuId = mappedKitsuId || numericId;
if (!Number.isFinite(jikanId) || !Number.isFinite(kitsuId)) return null;

  try {
    const data = await getJikan(`/anime/${jikanId}/full`);
    const mapped = mapJikanToAniList(data, "ANIME");
    if (mapped) {
      mapped.id = id;
      return mapped;
    }
  } catch (_) {
    try {
      const data = await getJikan(`/manga/${jikanId}/full`);
      const mapped = mapJikanToAniList(data, "MANGA");
      if (mapped) {
        mapped.id = id;
        return mapped;
      }
    } catch (jikanErr) {
      console.warn(
        "Jikan details failed, trying legacy Kitsu fallback:",
        jikanErr.message,
      );
    }
  }

  try {
    const data = await getKitsu(`/anime/${kitsuId}`);
    const mapped = mapKitsuToAniList(data, "ANIME");
    if (mapped) {
      mapped.id = id;
      return mapped;
    }
  } catch (_) {
    try {
      const data = await getKitsu(`/manga/${kitsuId}`);
      const mapped = mapKitsuToAniList(data, "MANGA");
      if (mapped) {
        mapped.id = id;
        return mapped;
      }
    } catch (err) {
      console.error(
        "Kitsu details failed, searching local cache for ID:",
        kitsuId,
      );
      const matched = MOCK_FALLBACK_DATA.find(
        (item) => item.id === String(kitsuId),
      );
      if (matched) {
        const mapped = mapKitsuToAniList(matched, "ANIME");
        if (mapped) {
          mapped.id = id;
          return mapped;
        }
      }
      return null;
    }
  }
}

async function fetchAiringAnimeJikan(page = 1, perPage = 18) {
  try {
    const data = await getJikan(`/seasons/now?page=${page}&limit=${perPage}`);
    const mapped = cleanMediaList(data, "ANIME");
    if (mapped.length) return mapped;
  } catch (err) {
    console.warn("Jikan airing failed:", err.message);
  }
  return MOCK_FALLBACK_DATA.map((item) => mapKitsuToAniList(item, "ANIME"));
}

async function fetchAnimeBySeasonJikan(season, year, page = 1, perPage = 12) {
  try {
    const data = await getJikan(
      `/seasons/${year}/${String(season).toLowerCase()}?page=${page}&limit=${perPage}`,
    );
    const mapped = cleanMediaList(data, "ANIME");
    if (mapped.length) return mapped;
  } catch (err) {
    console.warn("Jikan seasonal failed:", err.message);
  }
  return MOCK_FALLBACK_DATA.map((item) => mapKitsuToAniList(item, "ANIME"));
}

// ── Original AniList POST Query ──────────────────────────────────────────────
async function postQuery(query, variables = {}, retries = 0) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error("AniList API disabled (403 Forbidden)");
      }
      if (response.status >= 500 && retries > 0) {
        console.warn(`AniList 500 error, retrying... (${retries} left)`);
        return postQuery(query, variables, retries - 1);
      }
      throw new Error(`AniList request failed: ${response.status}`);
    }

    const data = await response.json();
    if (data.errors?.length) {
      throw new Error(data.errors[0].message || "AniList GraphQL error");
    }

    return data.data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error(
        "AniList request timed out. Please check your connection.",
      );
    }
    if (retries > 0) {
      return postQuery(query, variables, retries - 1);
    }
    throw err;
  }
}

export function stripHtml(htmlText = "") {
  return htmlText
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Exported API Methods with Transparent Jikan Fallback ────────────────────

export async function fetchAnimeByIds(ids = []) {
  const cleanIds = ids.map((id) => Number(id)).filter(Number.isFinite);
  if (!cleanIds.length) return [];

  const query = `
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
  `;

  try {
    const data = await postQuery(query, {
      ids: cleanIds,
      perPage: cleanIds.length,
    });
    return data.Page.media || [];
  } catch (err) {
    console.warn(
      "AniList failed to fetch featured anime, falling back to individual lookups:",
      err.message,
    );
    const results = await Promise.all(
      cleanIds.map(async (id) => {
        try {
          return await fetchAnimeByIdJikan(id);
        } catch (_) {
          return null;
        }
      }),
    );
    return results.filter(Boolean);
  }
}

export async function fetchTrendingMedia(
  type = "ANIME",
  page = 1,
  perPage = 18,
) {
  if (globalFallbackActive) {
    return fetchTrendingMediaJikan(type, page, perPage);
  }
  const query = `
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
  `;

  try {
    const data = await postQuery(query, { type, page, perPage });
    return data.Page.media;
  } catch (err) {
    console.warn(
      "AniList failed to fetch trending media, falling back to Jikan:",
      err.message,
    );
    globalFallbackActive = true;
    return fetchTrendingMediaJikan(type, page, perPage);
  }
}

export async function searchAnime(
  search,
  type = "ANIME",
  genre = null,
  page = 1,
  perPage = 50,
  sort = "TRENDING",
  status = null,
  year = null,
) {
  if (globalFallbackActive) {
    return searchAnimeJikan(search, type, page, perPage);
  }

  let queryArgs = `$type: MediaType, $page: Int, $perPage: Int`;
  let mediaArgs = `type: $type, countryOfOrigin: "JP", isAdult: false`;
  
  const variables = { type, page, perPage };

  if (search) {
    queryArgs += `, $search: String`;
    mediaArgs += `, search: $search`;
    variables.search = search;
  }
  
  if (genre) {
    queryArgs += `, $genre: String`;
    mediaArgs += `, genre: $genre`;
    variables.genre = genre;
  }

  // Add sort parameter
  const sortMap = {
    "POPULARITY": "POPULARITY_DESC",
    "SCORE": "SCORE_DESC",
    "TRENDING": "TRENDING_DESC",
    "FAVOURITES": "FAVOURITES_DESC",
    "UPDATED": "UPDATED_AT_DESC"
  };
  const sortValue = sortMap[sort] || "TRENDING_DESC";
  mediaArgs += `, sort: ${sortValue}`;

  // Add status parameter
  if (status && status !== "All") {
    queryArgs += `, $status: MediaStatus`;
    mediaArgs += `, status: $status`;
    variables.status = status;
  }

  // Add year parameter
  if (year && year !== "All") {
    queryArgs += `, $year: Int`;
    mediaArgs += `, seasonYear: $year`;
    variables.year = Number(year);
  }

  const query = `
    query (${queryArgs}) {
      Page(page: $page, perPage: $perPage) {
        media(${mediaArgs}) {
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
  `;

  try {
    const data = await postQuery(query, variables);
    return data.Page.media;
  } catch (err) {
    console.warn(
      "AniList failed to search anime, falling back to Jikan:",
      err.message,
    );
    globalFallbackActive = true;
    return searchAnimeJikan(search, type, page, perPage);
  }
}

export async function fetchAnimeById(id) {
  if (String(id || "").startsWith("mal-")) {
    return fetchAnimeByIdJikan(id);
  }
  if (globalFallbackActive) {
    return fetchAnimeByIdJikan(id);
  }
  const query = `
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
  `;

  try {
    const data = await postQuery(query, { id: Number(id) });
    return data.Media;
  } catch (err) {
    console.warn(
      `AniList failed to fetch anime ID ${id}, falling back to Jikan:`,
      err.message,
    );
    globalFallbackActive = true;
    return fetchAnimeByIdJikan(id);
  }
}

export async function fetchAiringAnime(page = 1, perPage = 18) {
  if (globalFallbackActive) {
    return fetchAiringAnimeJikan(page, perPage);
  }
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(status: RELEASING, type: ANIME, sort: POPULARITY_DESC, countryOfOrigin: "JP", isAdult: false) {
          id
          title { romaji english }
          coverImage { large }
          nextAiringEpisode { episode }
        }
      }
    }
  `;
  try {
    const data = await postQuery(query, { page, perPage });
    return data.Page.media;
  } catch (err) {
    console.warn(
      "AniList failed to fetch airing anime, falling back to Jikan:",
      err.message,
    );
    globalFallbackActive = true;
    return fetchAiringAnimeJikan(page, perPage);
  }
}

export async function fetchAnimeBySeason(season, year, page = 1, perPage = 12) {
  if (globalFallbackActive) {
    return fetchAnimeBySeasonJikan(season, year, page, perPage);
  }
  const query = `
    query ($season: MediaSeason, $year: Int, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(season: $season, seasonYear: $year, type: ANIME, sort: POPULARITY_DESC, countryOfOrigin: "JP", isAdult: false) {
          id
          title { romaji english }
          coverImage { extraLarge large }
          episodes
          format
          averageScore
        }
      }
    }
  `;
  try {
    const data = await postQuery(query, { season, year, page, perPage });
    return data.Page.media;
  } catch (err) {
    console.warn(
      "AniList failed to fetch seasonal anime, falling back to Jikan:",
      err.message,
    );
    globalFallbackActive = true;
    return fetchAnimeBySeasonJikan(season, year, page, perPage);
  }
}

export async function searchCharacters(search, page = 1, perPage = 20) {
  const query = `
    query ($search: String, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        characters(search: $search, sort: FAVOURITES_DESC) {
          id
          name { full native userPreferred }
          image { large medium }
        }
      }
    }
  `;
  try {
    const data = await postQuery(query, { search, page, perPage });
    return data.Page.characters;
  } catch (err) {
    console.warn("AniList failed to search characters:", err.message);
    return [];
  }
}

export async function searchStudios(search, page = 1, perPage = 20) {
  const query = `
    query ($search: String, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        studios(search: $search, sort: FAVOURITES_DESC) {
          id
          name
          favourites
        }
      }
    }
  `;
  try {
    const data = await postQuery(query, { search, page, perPage });
    return data.Page.studios;
  } catch (err) {
    console.warn("AniList failed to search studios:", err.message);
    return [];
  }
}

export async function fetchTrendingCharacters(page = 1, perPage = 20) {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        characters(sort: FAVOURITES_DESC) {
          id
          name { full native userPreferred }
          image { large medium }
        }
      }
    }
  `;
  try {
    const data = await postQuery(query, { page, perPage });
    return data.Page.characters;
  } catch (err) {
    console.warn("AniList failed to fetch trending characters:", err.message);
    return [];
  }
}

export async function fetchTrendingStudios(page = 1, perPage = 20) {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        studios(sort: FAVOURITES_DESC) {
          id
          name
          favourites
        }
      }
    }
  `;
  try {
    const data = await postQuery(query, { page, perPage });
    return data.Page.studios;
  } catch (err) {
    console.warn("AniList failed to fetch trending studios:", err.message);
    return [];
  }
}
