import { useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Eye, Grid3X3, ListFilter, Search, SlidersHorizontal } from 'lucide-react';

function normalizeKind(ep) {
  const raw = String(ep?.fillerType || ep?.episodeType || ep?.type || ep?.classification || '').toLowerCase();
  if (ep?.isFiller || raw.includes('filler')) return 'Filler';
  if (ep?.isCanon || raw.includes('canon')) return 'Canon';
  if (ep?.isMixed || raw.includes('mixed')) return 'Mixed';
  return '';
}

function audioFor(ep) {
  return { sub: Boolean(ep?.available?.sub), dub: Boolean(ep?.available?.dub) };
}

function imageFor(ep) {
  return ep?.image || ep?.thumbnail || ep?.thumbnailUrl || ep?.imageUrl;
}

function duration(value) {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value === 'number') {
    const minutes = Math.floor(value / 60);
    const seconds = value % 60;
    return minutes ? `${minutes}:${String(seconds).padStart(2, '0')}` : `${seconds}s`;
  }
  return String(value);
}

function EpisodeCard({ episode, active, onSelect }) {
  const audio = audioFor(episode);
  const kind = normalizeKind(episode);
  const title = episode?.title || `Episode ${episode.number}`;
  const image = imageFor(episode);
  const summary = episode?.summary || episode?.description || '';
  return (
    <button type="button" className={`reference-episode-card ${active ? 'active' : ''}`} onClick={() => onSelect(episode)}>
      <div className="reference-episode-thumb">
        {image && <img src={image} alt="" loading="lazy" decoding="async" fetchpriority="low" onError={event => { event.currentTarget.hidden = true; }} />}
        {!image && <span className="reference-episode-no-image">Episode {String(episode.number).padStart(2, '0')}</span>}
        <span className="reference-episode-number">{String(episode.number).padStart(2, "0")}</span>
        {duration(episode?.duration) && <span className="reference-episode-duration">{duration(episode.duration)}</span>}
        <span className="reference-episode-audio">
          {audio.sub && <b>SUB</b>}{audio.dub && <b>DUB</b>}
        </span>
      </div>
      <div className="reference-episode-copy">
        <h3>{title}</h3>
        {episode?.airDate && <time>{episode.airDate}</time>}
        {summary && <p>{summary}</p>}
      </div>
      {active && <span className="reference-episode-playing">Playing</span>}
    </button>
  );
}

export default function AnimeEpisodeExplorer({ episodes = [], activeEpisode, onSelect }) {
  const [query, setQuery] = useState('');
  const [audio, setAudio] = useState('all');
  const [kind, setKind] = useState('all');
  const [order, setOrder] = useState('asc');
  const [hideFiller, setHideFiller] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 24;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return episodes
      .filter(ep => {
        const text = [ep?.number, ep?.title, ep?.summary, ep?.description, ep?.airDate].filter(Boolean).join(' ').toLowerCase();
        const audioInfo = audioFor(ep);
        const epKind = normalizeKind(ep);
        if (q && !text.includes(q)) return false;
        if (audio === 'sub' && !audioInfo.sub) return false;
        if (audio === 'dub' && !audioInfo.dub) return false;
        if (kind !== 'all' && epKind !== kind) return false;
        if (hideFiller && epKind === 'Filler') return false;
        return true;
      })
      .sort((a, b) => {
        const diff = Number(a.number || 0) - Number(b.number || 0);
        return order === 'asc' ? diff : -diff;
      });
  }, [episodes, query, audio, kind, order, hideFiller]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const kinds = useMemo(() => new Set(episodes.map(normalizeKind).filter(Boolean)), [episodes]);

  const setFilter = setter => value => {
    setter(value);
    setPage(1);
  };

  return (
    <section className="reference-episodes">
      <div className="reference-episode-topline">
        <div className="reference-arc-select">
          <SlidersHorizontal size={14} />
          <select aria-label="Arc" defaultValue="all">
            <option value="all">All arcs</option>
          </select>
          <ChevronDown size={13} />
        </div>
      </div>

      <div className="reference-search-row">
        <label className="reference-search">
          <Search size={15} />
          <input value={query} onChange={e => setFilter(setQuery)(e.target.value)} placeholder="Search episodes" />
        </label>
      </div>

      <div className="reference-filter-row">
        <button type="button" onClick={() => setFilter(setOrder)(order === 'asc' ? 'desc' : 'asc')}><span>↕</span> {order === 'asc' ? 'Oldest' : 'Newest'}</button>
        <button type="button" className="reference-icon-button" aria-label="Grid view"><Grid3X3 size={14} /></button>
        <button type="button" className={hideFiller ? 'active' : ''} onClick={() => setHideFiller(v => !v)}><Eye size={14} /> {hideFiller ? 'Show filler' : 'Hide filler'} {kinds.has('Filler') && <small>{episodes.filter(ep => normalizeKind(ep) === 'Filler').length}</small>}</button>
        <button type="button" className={audio === 'sub' ? 'active' : ''} onClick={() => setFilter(setAudio)(audio === 'sub' ? 'all' : 'sub')}>Sub only <small>{episodes.filter(ep => audioFor(ep).sub).length}</small></button>
        <button type="button" className={audio === 'dub' ? 'active' : ''} onClick={() => setFilter(setAudio)(audio === 'dub' ? 'all' : 'dub')}>Dub only <small>{episodes.filter(ep => audioFor(ep).dub).length}</small></button>
        {kinds.has('Canon') && <button type="button" className={kind === 'Canon' ? 'active' : ''} onClick={() => setFilter(setKind)(kind === 'Canon' ? 'all' : 'Canon')}>Canon</button>}
        {kinds.has('Mixed') && <button type="button" className={kind === 'Mixed' ? 'active' : ''} onClick={() => setFilter(setKind)(kind === 'Mixed' ? 'all' : 'Mixed')}>Mixed</button>}
      </div>

      <div className="reference-legend">
        <span><i className="canon" /> Canon</span>
        <span><i className="mixed" /> Mixed</span>
        <span><i className="filler" /> Filler</span>
      </div>

      {visible.length ? (
        <div className="reference-episode-grid">
          {visible.map(ep => (
            <EpisodeCard key={ep.number} episode={ep} active={Number(ep.number) === Number(activeEpisode)} onSelect={onSelect} />
          ))}
        </div>
      ) : (
        <div className="reference-empty"><ListFilter size={20} /><strong>No episodes match your filters.</strong><span>Try another search or audio mode.</span></div>
      )}

      {pageCount > 1 && (
        <div className="reference-pagination">
          <button type="button" disabled={safePage === 1} onClick={() => setPage(safePage - 1)}><ChevronLeft size={16} /></button>
          <span>Page {safePage} / {pageCount}</span>
          <button type="button" disabled={safePage === pageCount} onClick={() => setPage(safePage + 1)}><ChevronRight size={16} /></button>
        </div>
      )}
    </section>
  );
}
