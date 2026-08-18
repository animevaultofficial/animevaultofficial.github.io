// Player sources for AnimeVault (inspired by Streambert)
export const PLAYER_SOURCES = [
  {
    id: "videasy",
    label: "Videasy",
    tag: null,
    note: null,
    supportsProgress: true,
    colorParam: "color", // hex without # → e.g. "e50914"
    langParam: null, // no subtitle lang param
    params: {
      overlay: "true",
    },
    movieUrl: (id) => `https://player.videasy.net/movie/${id}`,
    tvUrl: (id, season, ep) =>
      `https://player.videasy.net/tv/${id}/${season}/${ep}`,
  },
  {
    id: "vidsrc",
    label: "VidSrc",
    tag: null,
    note: null,
    supportsProgress: true,
    progressViaFrames: true, // video is in a nested iframe, needs main-process frame query
    colorParam: null, // vidsrc doesn't support color param
    langParam: "ds_lang", // ISO 639-1 language code
    params: {},
    movieUrl: (id) => `https://vidsrc.sbs/embed/movie/${id}`,
    tvUrl: (id, season, ep) =>
      `https://vidsrc.sbs/embed/tv/${id}/${season}/${ep}`,
  },
  {
    id: "vidking",
    label: "Vidking",
    tag: null,
    note: null,
    supportsProgress: true,
    colorParam: "color", // hex without # → e.g. "e50914"
    langParam: null,
    params: {
      autoPlay: "true",
    },
    movieUrl: (id) => `https://www.vidking.net/embed/movie/${id}`,
    tvUrl: (id, season, ep) =>
      `https://www.vidking.net/embed/tv/${id}/${season}/${ep}`,
  },
  {
    id: "vidnest",
    label: "Vidnest",
    tag: null,
    note: null,
    supportsProgress: true,
    colorParam: null,
    langParam: null,
    params: {},
    movieUrl: (id) => `https://vidnest.fun/movie/${id}`,
    tvUrl: (id, season, ep) => `https://vidnest.fun/tv/${id}/${season}/${ep}`,
  },
  // We'll add AllManga later if needed
];

export const getSourceUrl = (
  sourceId,
  type,
  id,
  season,
  ep,
  extraParams = {},
  // Optional: accent hex (with or without #) and subtitle ISO lang code
  accentColor = null,
  subtitleLang = null,
) => {
  const src =
    PLAYER_SOURCES.find((s) => s.id === sourceId) ?? PLAYER_SOURCES[0];
  const baseUrl =
    type === "movie" ? src.movieUrl(id) : src.tvUrl(id, season, ep);
  const url = new URL(baseUrl);

  Object.entries(src.params || {}).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  // Inject accent color into the player if the source supports it
  if (accentColor && src.colorParam) {
    url.searchParams.set(src.colorParam, accentColor.replace(/^#/, ""));
  }

  if (subtitleLang && src.langParam) {
    url.searchParams.set(src.langParam, subtitleLang);
  }

  Object.entries(extraParams).forEach(([key, value]) => {
    if (value != null) {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
};

export const sourceSupportsProgress = (sourceId) =>
  PLAYER_SOURCES.find((s) => s.id === sourceId)?.supportsProgress ?? false;

export const sourceProgressViaFrames = (sourceId) =>
  PLAYER_SOURCES.find((s) => s.id === sourceId)?.progressViaFrames ?? false;
