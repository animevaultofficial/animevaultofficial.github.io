const MANGADEX_BASE = 'https://api.mangadex.org';
const ANILIST_API = 'https://graphql.anilist.co';

const MANGA_API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_MANGA_API_URL) 
  ? import.meta.env.VITE_MANGA_API_URL 
  : '/api/manga';

const MANGADEX_CORS_PROXIES = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_MANGADEX_CORS_PROXY)
  ? [import.meta.env.VITE_MANGADEX_CORS_PROXY]
  : [
      'https://corsproxy.io/?url=',
      'https://api.codetabs.com/v1/proxy?quest=',
    ];

function buildMangaDexUrl(path) {
  return `${MANGADEX_BASE}${path}`;
}

function buildMangaDexProxyUrls(path) {
  const url = buildMangaDexUrl(path);
  return MANGADEX_CORS_PROXIES.map((proxy) => `${proxy}${encodeURIComponent(url)}`);
}

function shouldTryMangaDexDirectFetch() {
  if (typeof window === 'undefined') return true;
  const hostname = window.location?.hostname || '';
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '';
}

function cleanString(str) {
  return str ? str.toLowerCase().replace(/[^a-z0-9]/g, '').trim() : '';
}

/**
 * Helper to fetch from MangaKakalot API backend
 */
async function fetchMangaApi(endpoint) {
  try {
    const url = `${MANGA_API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Manga API error ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.warn(`MangaKakalot API endpoint (${endpoint}) unavailable, falling back:`, err.message);
    return null;
  }
}

async function fetchJsonWithTimeout(url, timeoutMs = 2500) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const text = await res.text();
    return JSON.parse(text);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchMangaDexApi(endpoint) {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const requestUrls = shouldTryMangaDexDirectFetch()
    ? [buildMangaDexUrl(path), ...buildMangaDexProxyUrls(path)]
    : buildMangaDexProxyUrls(path);

  const attempts = requestUrls.map(async (requestUrl) => {
    try {
      const result = await fetchJsonWithTimeout(requestUrl);
      if (result && (result.data !== undefined || result.result === 'ok')) return result;
      throw new Error('Unexpected MangaDex response');
    } catch (err) {
      console.warn(`MangaDex API request failed for endpoint (${endpoint}):`, err.message);
      throw err;
    }
  });

  try {
    return await Promise.any(attempts);
  } catch {
    return null;
  }
}

function getPrimaryTitle(titleObj, altTitles = []) {
  if (!titleObj) titleObj = {};

  const englishTitle = titleObj.en || titleObj.en_us || titleObj.en_jp;
  if (englishTitle) return englishTitle;

  const romanizedTitle = titleObj.romaji || titleObj.ja_ro;
  if (romanizedTitle) return romanizedTitle;

  const altTitle = altTitles
    .flatMap((altObj) => Object.entries(altObj || {}))
    .find(([key, value]) => ['en', 'en_us', 'romaji', 'ja_ro'].includes(key) && value);
  if (altTitle) return altTitle[1];

  return Object.values(titleObj)[0] || 'Manga';
}

function getMangaDexCoverUrl(manga) {
  const coverRel = (manga.relationships || []).find((r) => r.type === 'cover_art');
  const filename = coverRel && coverRel.attributes ? coverRel.attributes.fileName : '';
  return filename ? `https://uploads.mangadex.org/covers/${manga.id}/${filename}` : '';
}

function normalizeMangaDexManga(manga) {
  const title = getPrimaryTitle(manga.attributes.title, manga.attributes.altTitles);
  const coverUrl = getMangaDexCoverUrl(manga);
  const authorRel = (manga.relationships || []).find((r) => r.type === 'author' || r.type === 'artist');
  const author = authorRel?.attributes?.name || '';
  const genres = (manga.attributes.tags || []).map((tag) => tag.attributes?.name?.en || Object.values(tag.attributes?.name || {})[0]).filter(Boolean);

  return {
    id: manga.id,
    title,
    image: coverUrl,
    poster: coverUrl,
    latestChapter: manga.attributes.lastChapter ? `Vol ${manga.attributes.lastVolume || ''} Ch ${manga.attributes.lastChapter}`.trim() : manga.attributes.status || 'Ongoing',
    views: manga.attributes.followedCount || 0,
    status: manga.attributes.status || 'Ongoing',
    author,
    genres,
    coverImage: { large: coverUrl },
    bannerImage: coverUrl,
    description: manga.attributes.description?.en || '',
  };
}

async function fetchMangaDexList({ query = '', page = 1, limit = 24, orderBy = 'followedCount', status = [], contentRatings = ['safe', 'suggestive', 'erotica'], includes = ['cover_art', 'author', 'artist', 'tag'] } = {}) {
  const offset = (page - 1) * limit;
  const params = new URLSearchParams();
  params.set('limit', limit);
  params.set('offset', offset);
  params.set(`order[${orderBy}]`, 'desc');
  if (query) params.set('title', query);
  status.forEach((statusValue) => params.append('status[]', statusValue));
  contentRatings.forEach((rating) => params.append('contentRating[]', rating));
  includes.forEach((include) => params.append('includes[]', include));

  const res = await fetchMangaDexApi(`/manga?${params.toString()}`);
  if (!res || !res.data) return { mangas: [], hasNextPage: false, totalPages: 1 };

  const mangas = res.data.map(normalizeMangaDexManga);
  const totalPages = res.total ? Math.ceil(res.total / limit) : 1;
  return {
    mangas,
    hasNextPage: page < totalPages,
    totalPages,
  };
}

export async function fetchMangaDexDetails(mangaId) {
  if (!mangaId) return null;
  const res = await fetchMangaDexApi(`/manga/${encodeURIComponent(mangaId)}?includes[]=cover_art&includes[]=author&includes[]=artist&includes[]=tag`);
  if (!res || !res.data) return null;

  const manga = res.data;
  const title = getPrimaryTitle(manga.attributes.title, manga.attributes.altTitles);
  const coverUrl = getMangaDexCoverUrl(manga);
  const authorRel = (manga.relationships || []).find((r) => r.type === 'author' || r.type === 'artist');
  const author = authorRel?.attributes?.name || '';
  const genres = (manga.attributes.tags || []).map((tag) => tag.attributes?.name?.en || Object.values(tag.attributes?.name || {})[0]).filter(Boolean);

  return {
    id: manga.id,
    title,
    description: manga.attributes.description?.en || '',
    coverImage: { large: coverUrl },
    bannerImage: coverUrl,
    averageScore: 0,
    status: manga.attributes.status || 'Ongoing',
    format: 'MANGA',
    genres,
    author,
    altTitles: manga.attributes.altTitles || [],
  };
}

/**
 * Fallback to AniList GraphQL for high-quality manga listings when MangaKakalot is blocked/unavailable
 */
async function fetchAniListMangaList(sort = 'POPULARITY_DESC', page = 1, perPage = 24) {
  const query = `
    query ($page: Int, $perPage: Int, $sort: [MediaSort]) {
      Page(page: $page, perPage: $perPage) {
        pageInfo {
          hasNextPage
          total
        }
        media(type: MANGA, sort: $sort) {
          id
          title {
            english
            romaji
            userPreferred
          }
          coverImage {
            extraLarge
            large
          }
          averageScore
          status
          chapters
          genres
        }
      }
    }
  `;
  try {
    const res = await fetch(ANILIST_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ query, variables: { page, perPage, sort: [sort] } })
    });
    const data = await res.json();
    const mediaList = data?.data?.Page?.media || [];
    const hasNextPage = data?.data?.Page?.pageInfo?.hasNextPage || false;
    return {
      mangas: mediaList.map(item => ({
        id: item.id,
        title: item.title?.english || item.title?.romaji || item.title?.userPreferred || 'Manga',
        image: item.coverImage?.extraLarge || item.coverImage?.large,
        poster: item.coverImage?.large,
        latestChapter: item.chapters ? `Vol / ${item.chapters} Ch` : item.status || 'Ongoing',
        views: item.averageScore ? item.averageScore * 100 : 8500
      })),
      hasNextPage,
      totalPages: 50
    };
  } catch (err) {
    console.error('AniList manga fallback error:', err);
    return { mangas: [], hasNextPage: false, totalPages: 1 };
  }
}

/** MangaKakalot API Methods with AniList Fallbacks */

export async function fetchMangaKakalotHome() {
  const popular = await fetchMangaDexList({ page: 1, limit: 12, orderBy: 'followedCount', contentRatings: ['safe', 'suggestive', 'erotica'] });
  const latest = await fetchMangaDexList({ page: 1, limit: 24, orderBy: 'updatedAt', contentRatings: ['safe', 'suggestive', 'erotica'] });
  if ((popular.mangas && popular.mangas.length > 0) || (latest.mangas && latest.mangas.length > 0)) {
    return {
      popularNow: popular.mangas,
      popularSlider: popular.mangas,
      mangas: latest.mangas,
      hasNextPage: latest.hasNextPage,
      totalPages: latest.totalPages
    };
  }

  const res = await fetchMangaApi('/home');
  if (res && !res.error && ((res.mangas && res.mangas.length > 0) || res.popularNow || res.popularSlider)) {
    return res;
  }
  const popularFallback = await fetchAniListMangaList('POPULARITY_DESC', 1, 10);
  const latestFallback = await fetchAniListMangaList('UPDATED_AT_DESC', 1, 24);
  return {
    popularNow: popularFallback.mangas,
    popularSlider: popularFallback.mangas,
    mangas: latestFallback.mangas
  };
}

export async function fetchMangaKakalotPopularNow() {
  const res = await fetchMangaDexList({ page: 1, limit: 20, orderBy: 'followedCount', contentRatings: ['safe', 'suggestive', 'erotica'] });
  if (res && res.mangas && res.mangas.length > 0) return res.mangas;
  const fallback = await fetchAniListMangaList('POPULARITY_DESC', 1, 10);
  return fallback.mangas;
}

export async function fetchMangaKakalotLatest(page = 1) {
  const res = await fetchMangaDexList({ page, limit: 24, orderBy: 'updatedAt', contentRatings: ['safe', 'suggestive', 'erotica'] });
  if (res && res.mangas && res.mangas.length > 0) return res;
  return await fetchAniListMangaList('UPDATED_AT_DESC', page);
}

export async function fetchMangaKakalotPopular(page = 1) {
  const res = await fetchMangaDexList({ page, limit: 24, orderBy: 'followedCount', contentRatings: ['safe', 'suggestive', 'erotica'] });
  if (res && res.mangas && res.mangas.length > 0) return res;
  return await fetchAniListMangaList('POPULARITY_DESC', page);
}

export async function fetchMangaKakalotNewest(page = 1) {
  const res = await fetchMangaDexList({ page, limit: 24, orderBy: 'createdAt', contentRatings: ['safe', 'suggestive', 'erotica'] });
  if (res && res.mangas && res.mangas.length > 0) return res;
  return await fetchAniListMangaList('START_DATE_DESC', page);
}

export async function fetchMangaKakalotCompleted(page = 1) {
  const res = await fetchMangaDexList({ page, limit: 24, orderBy: 'followedCount', status: ['completed'], contentRatings: ['safe', 'suggestive', 'erotica'] });
  if (res && res.mangas && res.mangas.length > 0) return res;
  return await fetchAniListMangaList('FAVOURITES_DESC', page);
}

export async function searchMangaKakalot(query = '', page = 1) {
  if (!query) return await fetchMangaKakalotHome();
  const isExplicitSearch = /hentai|ecchi|ero|adult/i.test(query);
  const ratings = isExplicitSearch ? ['safe', 'suggestive', 'erotica', 'pornographic'] : ['safe', 'suggestive', 'erotica'];
  const res = await fetchMangaDexList({ query, page, limit: 20, orderBy: 'followedCount', contentRatings: ratings });
  if (res && res.mangas && res.mangas.length > 0) return res;

  const kakalotRes = await fetchMangaApi(`/search/${encodeURIComponent(query)}/${page}`);
  if (kakalotRes && !kakalotRes.error && ((kakalotRes.mangas && kakalotRes.mangas.length > 0) || (Array.isArray(kakalotRes) && kakalotRes.length > 0))) return kakalotRes;
  
  // Search fallback via AniList
  const graphQuery = `
    query ($search: String, $page: Int) {
      Page(page: $page, perPage: 20) {
        pageInfo { hasNextPage }
        media(search: $search, type: MANGA) {
          id
          title { english romaji userPreferred }
          coverImage { extraLarge large }
          chapters
          averageScore
        }
      }
    }
  `;
  try {
    const response = await fetch(ANILIST_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ query: graphQuery, variables: { search: query, page } })
    });
    const data = await response.json();
    const list = data?.data?.Page?.media || [];
    return {
      mangas: list.map(item => ({
        id: item.id,
        title: item.title?.english || item.title?.romaji || item.title?.userPreferred || 'Manga',
        image: item.coverImage?.extraLarge || item.coverImage?.large,
        poster: item.coverImage?.large,
        latestChapter: item.chapters ? `Vol / ${item.chapters} Ch` : 'Ongoing',
        views: item.averageScore ? item.averageScore * 100 : 5000
      })),
      hasNextPage: data?.data?.Page?.pageInfo?.hasNextPage || false,
      totalPages: 10
    };
  } catch (err) {
    return { mangas: [], hasNextPage: false, totalPages: 1 };
  }
}

export async function fetchMangaKakalotDetails(id) {
  if (!id) return null;
  const isMangaDexId = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
  if (isMangaDexId) {
    const mdex = await fetchMangaDexDetails(id);
    if (mdex) return mdex;
  }

  const res = await fetchMangaApi(`/details/${encodeURIComponent(id)}`);
  if (res && !res.error && res.title) return res;
  return null;
}

export async function fetchMangaKakalotRead(mangaId, chapterId) {
  if (!mangaId || !chapterId) return null;
  const res = await fetchMangaApi(`/read/${encodeURIComponent(mangaId)}/${encodeURIComponent(chapterId)}`);
  if (res && !res.error && res.images) return res;
  return null;
}

/**
 * Searches MangaDex for a manga by its title.
 */
export async function searchMangaDex(titles) {
  const titleList = Array.isArray(titles) ? titles : [titles];
  const ratings = 'contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&contentRating[]=pornographic';

  for (const t of titleList) {
    if (!t) continue;
    try {
      const data = await fetchMangaDexApi(`/manga?title=${encodeURIComponent(t)}&limit=10&includes[]=cover_art&${ratings}`);
      if (!data || !data.data || data.data.length === 0) continue;
      const cleanedQuery = cleanString(t);
        
        for (const manga of data.data) {
          const primaryTitles = Object.values(manga.attributes.title || {});
          const exactPrimary = primaryTitles.some(pt => cleanString(pt) === cleanedQuery);
          if (exactPrimary) return manga;
          
          const altTitles = (manga.attributes.altTitles || []).flatMap(altObj => Object.values(altObj));
          const exactAlt = altTitles.some(at => cleanString(at) === cleanedQuery);
          if (exactAlt) return manga;
        }
        
        for (const manga of data.data) {
          const primaryTitles = Object.values(manga.attributes.title || {});
          const subPrimary = primaryTitles.some(pt => cleanString(pt).includes(cleanedQuery));
          if (subPrimary) return manga;
          
          const altTitles = (manga.attributes.altTitles || []).flatMap(altObj => Object.values(altObj));
          const subAlt = altTitles.some(at => cleanString(at).includes(cleanedQuery));
          if (subAlt) return manga;
        }
        
        return data.data[0];
    } catch (err) {
      console.error('MangaDex search failed for title:', t, err);
    }
  }
  return null;
}

/**
 * Fetches chapters for a given MangaDex manga ID with strict English prioritization.
 */
export async function fetchMangaChapters(mangaId, offset = 0, limit = 500) {
  const ratings = 'contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&contentRating[]=pornographic';
  
  try {
    // 1. Fetch English chapters across offsets (limit 500)
    const initialData = await fetchMangaDexApi(`/manga/${mangaId}/feed?translatedLanguage[]=en&translatedLanguage[]=en-us&limit=250&offset=0&order[chapter]=asc&includes[]=scanlation_group&${ratings}`);
    let rawChapters = initialData?.data || [];

    // If more than 250 chapters exist, fetch next offset
    if (initialData?.total > 250) {
      try {
        const nextData = await fetchMangaDexApi(`/manga/${mangaId}/feed?translatedLanguage[]=en&translatedLanguage[]=en-us&limit=250&offset=250&order[chapter]=asc&includes[]=scanlation_group&${ratings}`);
        if (nextData?.data) {
          rawChapters = [...rawChapters, ...nextData.data];
        }
      } catch (e) {
        /* ignore offset 2 error */
      }
    }

    // Filter for English chapters with actual readable image pages
    let validChapters = rawChapters.filter(c => (c.attributes.pages > 0) && (c.attributes.translatedLanguage === 'en' || c.attributes.translatedLanguage === 'en-us'));

    // Deduplicate by chapter number (keep group with most pages or first)
    const chapterMap = new Map();
    validChapters.forEach(chapter => {
      const chNum = chapter.attributes.chapter || '1';
      if (!chapterMap.has(chNum) || (chapter.attributes.pages > chapterMap.get(chNum).attributes.pages)) {
        chapterMap.set(chNum, chapter);
      }
    });

    const uniqueChapters = Array.from(chapterMap.values());

    // Format output
    const parsed = uniqueChapters.map(chapter => ({
      id: chapter.id,
      chapter: chapter.attributes.chapter || '1',
      title: chapter.attributes.title || (chapter.attributes.chapter ? `Chapter ${chapter.attributes.chapter}` : 'Chapter'),
      pages: chapter.attributes.pages || 0,
      language: (chapter.attributes.translatedLanguage || 'en').toUpperCase(),
      group: chapter.relationships?.find(r => r.type === 'scanlation_group')?.attributes?.name || 'Unknown',
      volume: chapter.attributes.volume
    }));

    // Sort numerically by chapter
    parsed.sort((a, b) => {
      const numA = parseFloat(a.chapter) || 0;
      const numB = parseFloat(b.chapter) || 0;
      return numA - numB;
    });

    return parsed;
  } catch (err) {
    console.error('Failed to fetch manga chapters:', err);
    return [];
  }
}

/**
 * Fetches the image URLs for a specific chapter ID.
 */
export async function fetchChapterPages(chapterId) {
  try {
    const data = await fetchMangaDexApi(`/at-home/server/${chapterId}`);
    
    if (data?.baseUrl) {
      if (data.chapter.data && data.chapter.data.length > 0) {
        return data.chapter.data.map(filename => 
          `${data.baseUrl}/data/${data.chapter.hash}/${filename}`
        );
      } else if (data.chapter.dataSaver && data.chapter.dataSaver.length > 0) {
        return data.chapter.dataSaver.map(filename => 
          `${data.baseUrl}/data-saver/${data.chapter.hash}/${filename}`
        );
      }
    }
    return [];
  } catch (err) {
    console.error('Failed to fetch chapter pages:', err);
    return [];
  }
}
