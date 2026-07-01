const MANGADEX_PROXY = 'https://api.allorigins.win/raw?url=';
const MANGADEX_BASE = 'https://api.mangadex.org';

function buildMangaDexUrl(path) {
  return `${MANGADEX_PROXY}${encodeURIComponent(`${MANGADEX_BASE}${path}`)}`;
}

function cleanString(str) {
  return str ? str.toLowerCase().replace(/[^a-z0-9]/g, '').trim() : '';
}

/**
 * Searches MangaDex for a manga by its title.
 * Ranks search results to find the most accurate primary series match,
 * skipping sequels, spin-offs, or doujinshis unless they are the only match.
 */
export async function searchMangaDex(titles) {
  const titleList = Array.isArray(titles) ? titles : [titles];
  for (const t of titleList) {
    if (!t) continue;
    try {
      const res = await fetch(buildMangaDexUrl(`/manga?title=${encodeURIComponent(t)}&limit=10&includes[]=cover_art`));
      const data = await res.json();
      if (data.data && data.data.length > 0) {
        const cleanedQuery = cleanString(t);
        
        // 1. Look for an exact title match first (primary or alt)
        for (const manga of data.data) {
          const primaryTitles = Object.values(manga.attributes.title || {});
          const exactPrimary = primaryTitles.some(pt => cleanString(pt) === cleanedQuery);
          if (exactPrimary) return manga;
          
          const altTitles = (manga.attributes.altTitles || []).flatMap(altObj => Object.values(altObj));
          const exactAlt = altTitles.some(at => cleanString(at) === cleanedQuery);
          if (exactAlt) return manga;
        }
        
        // 2. Look for a substring match if no exact match is found
        for (const manga of data.data) {
          const primaryTitles = Object.values(manga.attributes.title || {});
          const subPrimary = primaryTitles.some(pt => cleanString(pt).includes(cleanedQuery));
          if (subPrimary) return manga;
          
          const altTitles = (manga.attributes.altTitles || []).flatMap(altObj => Object.values(altObj));
          const subAlt = altTitles.some(at => cleanString(at).includes(cleanedQuery));
          if (subAlt) return manga;
        }
        
        // 3. Fallback to the very first search result
        return data.data[0];
      }
    } catch (err) {
      console.error('MangaDex search failed for title:', t, err);
    }
  }
  return null;
}

/**
 * Fetches chapters for a given MangaDex manga ID.
 * Defaults to English chapters, supporting both native pages and official external links.
 */
export async function fetchMangaChapters(mangaId, offset = 0, limit = 100) {
  try {
    const res = await fetch(
      buildMangaDexUrl(`/manga/${mangaId}/feed?translatedLanguage[]=en&limit=${limit}&offset=${offset}&order[chapter]=asc&includes[]=scanlation_group`)
    );
    const data = await res.json();
    if (data.data) {
      return data.data
        .filter(chapter => chapter.attributes.pages > 0 || chapter.attributes.externalUrl)
        .map(chapter => ({
          id: chapter.id,
          chapter: chapter.attributes.chapter,
          title: chapter.attributes.title,
          pages: chapter.attributes.pages,
          externalUrl: chapter.attributes.externalUrl,
          group: chapter.relationships.find(r => r.type === 'scanlation_group')?.attributes?.name || 'Unknown',
          volume: chapter.attributes.volume
        }));
    }
    return [];
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
    const res = await fetch(buildMangaDexUrl(`/at-home/server/${chapterId}`));
    const data = await res.json();
    
    if (data.baseUrl) {
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
