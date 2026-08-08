// test-allanime.js
// Node.js script to test AllAnime GraphQL search, show ID lookup, and stream source retrieval

const ALLANIME_GRAPHQL_ENDPOINT = 'https://api.allanime.day/api';

const REQUIRED_HEADERS = {
  'Content-Type': 'application/json',
  'Referer': 'https://allmanga.to',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
};

async function queryAllAnime(query, variables = {}) {
  let activeQuery = query || '';
  if (activeQuery.includes('TranslationType!') && !activeQuery.includes('VaildTranslationTypeEnumType!')) {
    activeQuery = activeQuery.replace('TranslationType!', 'VaildTranslationTypeEnumType!');
  }

  const res = await fetch(ALLANIME_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: REQUIRED_HEADERS,
    body: JSON.stringify({ query: activeQuery, variables }),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  const json = await res.json();
  if (json.errors) {
    throw new Error(`GraphQL Error: ${JSON.stringify(json.errors)}`);
  }
  return json.data;
}

async function testShowSearch(title) {
  console.log(`\n🔍 Searching AllAnime for: "${title}"...`);
  const query = `
    query ($search: SearchInput, $limit: Int, $page: Int) {
      shows(search: $search, limit: $limit, page: $page) {
        edges {
          _id
          name
          englishName
          availableEpisodesDetail
        }
      }
    }
  `;

  const data = await queryAllAnime(query, {
    search: { query: title },
    limit: 5,
    page: 1,
  });

  const shows = data?.shows?.edges || [];
  console.log(`✅ Found ${shows.length} show(s):`);
  shows.forEach((s, idx) => {
    console.log(`  [${idx + 1}] ID: ${s._id} | Name: ${s.name} | English: ${s.englishName || 'N/A'}`);
  });
  return shows[0]?._id || null;
}

async function testEpisodeSources(showId, episodeNum = '1') {
  console.log(`\n📺 Fetching stream sources for Show ID "${showId}", Episode ${episodeNum}...`);
  const query = `
    query ($showId: String!, $translationType: VaildTranslationTypeEnumType!, $episodeString: String!) {
      episode(showId: $showId, translationType: $translationType, episodeString: $episodeString) {
        sourceUrls
      }
    }
  `;

  const data = await queryAllAnime(query, {
    showId: String(showId),
    translationType: 'sub',
    episodeString: String(episodeNum),
  });

  const sourceUrls = data?.episode?.sourceUrls || [];
  console.log(`✅ Received ${sourceUrls.length} source URL(s):`);
  sourceUrls.forEach((src, idx) => {
    const name = src.sourceName || `Server ${idx + 1}`;
    const url = src.sourceUrl || src;
    console.log(`  [${idx + 1}] ${name}: ${url.substring(0, 80)}...`);
  });
  return sourceUrls;
}

async function main() {
  try {
    const testTitles = ['One Piece', 'Naruto', 'Jujutsu Kaisen'];
    for (const title of testTitles) {
      const showId = await testShowSearch(title);
      if (showId) {
        await testEpisodeSources(showId, '1');
      }
    }
    console.log('\n🎉 AllAnime API integration tests completed successfully!');
  } catch (err) {
    console.error('❌ Test failed with error:', err.message);
  }
}

main();
