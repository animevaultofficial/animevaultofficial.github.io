import { useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ListFilter, Search } from 'lucide-react';

function normalizeKind(ep) {
  const raw = String(ep?.fillerType || ep?.episodeType || ep?.type || ep?.classification || '').toLowerCase();
  if (ep?.isFiller || raw.includes('filler')) return 'Filler';
  if (ep?.isCanon || raw.includes('canon')) return 'Canon';
  if (ep?.isMixed || raw.includes('mixed')) return 'Mixed';
  return '';
}

function availableAudio(ep) {
  return {
    sub: Boolean(ep?.available?.sub),
    dub: Boolean(ep?.available?.dub),
  };
}

function episodeMatches(ep, query, audio, kind) {
  const text = [
    ep?.number,
    ep?.title,
    ep?.summary,
    ep?.description,
    ep?.airDate,
  ].filter(Boolean).join(' ').toLowerCase();

  const audioInfo = availableAudio(ep);
  const type = normalizeKind(ep);
  const audioMatch =
    audio === 'all' ||
    (audio === 'sub' && audioInfo.sub) ||
    (audio === 'dub' && audioInfo.dub);

  const kindMatch = kind === 'all' || type === kind;
  return audioMatch && kindMatch && (!query || text.includes(query.toLowerCase()));
}

function formatDuration(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'number') {
    const minutes = Math.floor(value / 60);
    const seconds = value % 60;
    return minutes ? `${minutes}:${String(seconds).padStart(2, '0')}` : `${seconds}s`;
  }
  return String(value);
}

function EpisodeCard({ episode, active, onSelect }) {
  const audio = availableAudio(episode);
  const kind = normalizeKind(episode);
  const title = episode?.title || `Episode ${episode.number}`;
  const duration = formatDuration(episode?.duration);

  return (
    <button
      type="button"
      className={`anime-episode-card${active ? ' is-active' : ''}`}
      onClick={() => onSelect(episode)}
    >
      <span className="anime-episode-card-number">{String(episode.number).padStart(2, '0')}</span>
      <span className="anime-episode-card-body">
        <span className="anime-episode-card-title">{title}</span>
        <span className="anime-episode-card-meta">
          {audio.sub && <b>SUB</b>}
          {audio.dub && <b>DUB</b>}
          {kind && <em>{kind}</em>}
          {duration && <span>{duration}</span>}
          {episode?.airDate && <span>{episode.airDate}</span>}
        </span>
        {(episode?.summary || episode?.description) && (
          <span className="anime-episode-card-summary">{episode.summary || episode.description}</span>
        )}
      </span>
      {active && <span className="anime-episode-card-active">PLAYING</span>}
    </button>
  );
}

export default function EpisodeExplorer({ episodes = [], activeEpisode, onSelect }) {
  const [query, setQuery] = useState('');
  const [audio, setAudio] = useState('all');
  const [kind, setKind] = useState('all');
  const [order, setOrder] = useState('asc');
  const [page, setPage] = useState(1);
  const pageSize = 24;

  const kindsAvailable = useMemo(
    () => new Set(episodes.map(normalizeKind).filter(Boolean)),
    [episodes]
  );

  const filtered = useMemo(() => {
    const list = episodes.filter(ep => episodeMatches(ep, query.trim(), audio, kind));
    return [...list].sort((a, b) => {
      const diff = Number(a.number || 0) - Number(b.number || 0);
      return order === 'asc' ? diff : -diff;
    });
  }, [episodes, query, audio, kind, order]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const updateFilter = setter => value => {
    setter(value);
    setPage(1);
  };

  return (
    <section className="anime-episode-explorer" aria-label="Episode explorer">
      <div className="anime-episode-explorer-head">
        <div>
          <div className="anime-details-panel-heading">
            <span>EPISODES</span>
            <small>{filtered.length} of {episodes.length}</small>
          </div>
          <h2>Episode Explorer</h2>
        </div>
        <span className="anime-episode-explorer-icon"><ListFilter size={18} /></span>
      </div>

      <div className="anime-episode-toolbar">
        <label className="anime-episode-search">
          <Search size={16} />
          <input
            value={query}
            onChange={event => updateFilter(setQuery)(event.target.value)}
            placeholder="Search episodes..."
            aria-label="Search episodes"
          />
        </label>

        <div className="anime-episode-select">
          <select value={audio} onChange={event => updateFilter(setAudio)(event.target.value)} aria-label="Audio filter">
            <option value="all">All audio</option>
            <option value="sub">Sub only</option>
            <option value="dub">Dub only</option>
          </select>
          <ChevronDown size={14} />
        </div>

        <div className="anime-episode-select">
          <select value={kind} onChange={event => updateFilter(setKind)(event.target.value)} aria-label="Episode type filter">
            <option value="all">All types</option>
            {kindsAvailable.has('Canon') && <option value="Canon">Canon</option>}
            {kindsAvailable.has('Mixed') && <option value="Mixed">Mixed</option>}
            {kindsAvailable.has('Filler') && <option value="Filler">Filler</option>}
          </select>
          <ChevronDown size={14} />
        </div>

        <div className="anime-episode-select">
          <select value={order} onChange={event => updateFilter(setOrder)(event.target.value)} aria-label="Episode order">
            <option value="asc">Oldest first</option>
            <option value="desc">Newest first</option>
          </select>
          <ChevronDown size={14} />
        </div>
      </div>

      {visible.length > 0 ? (
        <div className="anime-episode-grid">
          {visible.map(ep => (
            <EpisodeCard
              key={ep.number}
              episode={ep}
              active={Number(ep.number) === Number(activeEpisode)}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : (
        <div className="anime-episode-empty">
          <Search size={22} />
          <strong>No episodes match those filters.</strong>
          <span>Try another search, audio mode, or episode type.</span>
        </div>
      )}

      {pageCount > 1 && (
        <div className="anime-episode-pagination">
          <button type="button" disabled={safePage === 1} onClick={() => setPage(safePage - 1)} aria-label="Previous page">
            <ChevronLeft size={17} />
          </button>
          <span>Page {safePage} / {pageCount}</span>
          <button type="button" disabled={safePage === pageCount} onClick={() => setPage(safePage + 1)} aria-label="Next page">
            <ChevronRight size={17} />
          </button>
        </div>
      )}
    </section>
  );
}
