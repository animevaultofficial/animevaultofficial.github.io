function normalizeSearchTitle(value) {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function getAnimeTitles(item) {
  const title = item?.title;
  return [
    typeof title === 'string' ? title : '',
    title?.english,
    title?.romaji,
    title?.native,
    item?.nativeTitle,
    item?.englishTitle,
    item?.romajiTitle,
    ...(Array.isArray(item?.searchTitleAliases) ? item.searchTitleAliases : []),
  ].map(normalizeSearchTitle).filter(Boolean);
}

function getMediaTitle(item) {
  const title = typeof item?.title === 'string' ? item.title : item?.name;
  return normalizeSearchTitle(title);
}

function isAnimatedMedia(item) {
  const genres = Array.isArray(item?.genres) ? item.genres : [item?.genres];
  return item?.genre_ids?.includes(16)
    || genres.some(genre => {
      const name = typeof genre === 'string' ? genre : genre?.name || genre?.label;
      return normalizeSearchTitle(name) === 'animation';
    });
}

export function removeMediaMatchesForAnime(results) {
  const animeTitles = new Set(
    results
      .filter(item => item?.mediaType === 'anime' || item?._type === 'anime')
      .flatMap(getAnimeTitles),
  );

  if (!animeTitles.size) return results;

  return results.filter(item => {
    if (item?.mediaType === 'anime' || item?._type === 'anime') return true;
    if (!isAnimatedMedia(item)) return true;
    const mediaTitle = getMediaTitle(item);
    return !mediaTitle || !animeTitles.has(mediaTitle);
  });
}
