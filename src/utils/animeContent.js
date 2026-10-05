export function isHentai(item) {
  const values = [
    item?.genres,
    item?.genre,
    item?.tags,
    item?.type,
    item?.format,
    item?.rating,
    item?.contentRating,
    item?.content_rating,
    item?.classification,
    item?.ratingLabel,
    item?.rating_label,
    item?.metadata?.genres,
    item?.metadata?.tags,
    item?.metadata?.contentRating,
    item?.metadata?.content_rating,
  ];

  const hasMarker = value => {
    if (Array.isArray(value)) return value.some(entry => hasMarker(entry));
    if (value && typeof value === 'object') {
      return Object.values(value).some(entry => hasMarker(entry));
    }
    const normalized = String(value ?? '').trim().toLowerCase();
    return normalized === 'hentai' || normalized === 'rx' || normalized === '18+'
      || normalized === 'r18' || normalized === 'r-18' || normalized === 'adult only';
  };

  return item?.isHentai === true
    || item?.is_hentai === true
    || item?.adult === true
    || item?.isAdult === true
    || item?.is_adult === true
    || values.some(hasMarker);
}
