// Player sources for AnimeVault
// User-selectable embed providers for movies and TV shows.
// Keep these as iframe providers: they resolve the actual media server themselves.
export const PLAYER_SOURCES = [
  {
    id: "vidsrc",
    label: "VidSrc",
    tag: null,
    note: null,
    supportsProgress: true,
    progressViaFrames: true,
    colorParam: null,
    langParam: null,
    params: {},
    movieUrl: (id) => `https://vidsrc.tw/embed/movie/${id}`,
    tvUrl: (id, season, ep) =>
      `https://vidsrc.tw/embed/tv/${id}/${season}/${ep}`,
  },
  {
    id: "videasy",
    label: "Videasy",
    tag: null,
    note: "Closing September 15, 2026; kept as a temporary provider.",
    supportsProgress: true,
    colorParam: "color",
    langParam: null,
    params: {
      overlay: "true",
    },
    movieUrl: (id) => `https://player.videasy.net/movie/${id}`,
    tvUrl: (id, season, ep) =>
      `https://player.videasy.net/tv/${id}/${season}/${ep}`,
  },
  {
    // Backwards-compatible id used by the movie player UI.
    // The old UI referenced `vidking`; map it to the current Videasy player
    // instead of generating a dead/non-existent provider URL.
    id: "vidking",
    label: "Videasy",
    tag: "Legacy alias",
    note: "Compatibility alias for Videasy.",
    supportsProgress: true,
    colorParam: "color",
    langParam: null,
    params: {
      overlay: "true",
    },
    movieUrl: (id) => `https://player.videasy.net/movie/${id}`,
    tvUrl: (id, season, ep) =>
      `https://player.videasy.net/tv/${id}/${season}/${ep}`,
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
