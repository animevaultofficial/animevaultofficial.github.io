const API_URL = 'https://graphql.anilist.co';

const TRENDING_QUERY = `
  query ($page: Int, $perPage: Int) {
    trending: Page(page: $page, perPage: $perPage) {
      media(sort: TRENDING_DESC, type: ANIME, isAdult: false) {
        id
        title { romaji english }
        coverImage { large extraLarge }
        episodes
        format
        averageScore
        seasonYear
        status
        genres
        description
        nextAiringEpisode { episode airingAt }
      }
    }
    popular: Page(page: 1, perPage: 20) {
      media(sort: POPULARITY_DESC, type: ANIME, isAdult: false) {
        id
        title { romaji english }
        coverImage { large }
        episodes
        format
        averageScore
        seasonYear
      }
    }
    upcoming: Page(page: 1, perPage: 20) {
      media(sort: POPULARITY_DESC, type: ANIME, status: NOT_YET_RELEASED, isAdult: false) {
        id
        title { romaji english }
        coverImage { large }
        format
        seasonYear
      }
    }
  }
`;

const DETAIL_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      title { romaji english native }
      coverImage { large extraLarge }
      bannerImage
      description
      episodes
      duration
      status
      format
      genres
      averageScore
      seasonYear
      season
      studios { nodes { name } }
      nextAiringEpisode { episode airingAt timeUntilAiring }
      externalLinks { site url }
      recommendations(page: 1, perPage: 10) {
        nodes {
          mediaRecommendation {
            id
            title { romaji english }
            coverImage { large }
            averageScore
          }
        }
      }
    }
  }
`;

const SEARCH_QUERY = `
  query ($search: String, $page: Int) {
    Page(page: $page, perPage: 20) {
      media(search: $search, type: ANIME, isAdult: false) {
        id
        title { romaji english }
        coverImage { large }
        format
        episodes
        averageScore
        seasonYear
        genres
      }
    }
  }
`;

async function fetchGraphQL(query, variables = {}) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ query, variables })
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message || 'GraphQL error');
  return json.data;
}

export async function fetchHomeData() {
  return fetchGraphQL(TRENDING_QUERY, { page: 1, perPage: 15 });
}

export async function fetchAnimeDetail(id) {
  return fetchGraphQL(DETAIL_QUERY, { id: parseInt(id) });
}

export async function searchAnime(query, page = 1) {
  return fetchGraphQL(SEARCH_QUERY, { search: query, page });
}

export function getTitle(media) {
  return media?.title?.english || media?.title?.romaji || 'Unknown';
}

export function getImage(media, size = 'large') {
  return media?.coverImage?.[size === 'large' ? 'extraLarge' : 'large'] || media?.coverImage?.large || null;
}

export function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"').replace(/&#039;/g, "'");
}