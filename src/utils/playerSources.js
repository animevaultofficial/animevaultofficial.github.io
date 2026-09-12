// Player sources for AnimeVault
// User-selectable embed providers for movies and TV shows.
// These are iframe providers; they resolve the actual media server themselves.
export const PLAYER_SOURCES = [
  {
    id: "vidsrc",
    label: "VidSrc",
    tag: null,
    note: "Uses IMDb IDs for movies when available and TMDB IDs for TV.",
    supportsProgress: true,
    progressViaFrames: true,
    colorParam: null,
    langParam: null,
    params: {},
    movieUrl: (id) => `https://vidsrc.tw/embed/movie/${id}`,
    tvUrl: (id, season, ep) => `https://vidsrc.tw/embed/tv/${id}/${season}/${ep}`,
  },
  {
    id: "videasy",
    label: "Videasy",
    tag: null,
    note: "Temporary provider; service is scheduled to close September 15, 2026.",
    supportsProgress: true,
    colorParam: "color",
    langParam: null,
    params: { overlay: "true" },
    movieUrl: (id) => `https://player.videasy.net/movie/${id}`,
    tvUrl: (id, season, ep) => `https://player.videasy.net/tv/${id}/${season}/${ep}`,
  },
  {
    id: "vidnest",
    label: "VidNest",
    tag: null,
    note: null,
    supportsProgress: true,
    colorParam: null,
    langParam: null,
    params: {},
    movieUrl: (id) => `https://vidnest.fun/movie/${id}`,
    tvUrl: (id, season, ep) => `https://vidnest.fun/tv/${id}/${season}/${ep}`,
  },
];

export const getSourceUrl = (
  sourceId,
  type,
  id,
  season,
  ep,
  extraParams = {},
  accentColor = null,
  subtitleLang = null,
) => {
  const src = PLAYER_SOURCES.find((s) => s.id === sourceId) ?? PLAYER_SOURCES[0];
  const baseUrl = type === "movie" ? src.movieUrl(id) : src.tvUrl(id, season, ep);
  const url = new URL(baseUrl);
  Object.entries(src.params || {}).forEach(([key, value]) => url.searchParams.set(key, value));
  if (accentColor && src.colorParam) url.searchParams.set(src.colorParam, accentColor.replace(/^#/, ""));
  if (subtitleLang && src.langParam) url.searchParams.set(src.langParam, subtitleLang);
  Object.entries(extraParams).forEach(([key, value]) => {
    if (value != null) url.searchParams.set(key, value);
  });
  return url.toString();
};

export const sourceSupportsProgress = (sourceId) =>
  PLAYER_SOURCES.find((s) => s.id === sourceId)?.supportsProgress ?? false;

export const sourceProgressViaFrames = (sourceId) =>
  PLAYER_SOURCES.find((s) => s.id === sourceId)?.progressViaFrames ?? false;
