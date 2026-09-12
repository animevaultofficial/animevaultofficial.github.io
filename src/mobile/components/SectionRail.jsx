import React from 'react';
import { ChevronRight } from 'lucide-react';
import LoadingCard from './LoadingCard';

export default function SectionRail({ title, icon: Icon, viewAllHref, onViewAll, children, loading = false, grid = false }) {
  return (
    <section className="av-mobile-section" aria-labelledby={`section-${title.replace(/\s+/g, '-').toLowerCase()}`}>
      <header className="av-mobile-section-header">
        <h2 id={`section-${title.replace(/\s+/g, '-').toLowerCase()}`}>{Icon && <Icon size={15} />} {title}</h2>
        {(viewAllHref || onViewAll) && (
          <button type="button" className="av-mobile-see-all" onClick={onViewAll}>{'See all'} <ChevronRight size={13} /></button>
        )}
      </header>
      {loading ? (
        <div className={grid ? 'av-mobile-card-grid' : 'av-mobile-card-rail'}>
          {Array.from({ length: grid ? 6 : 5 }, (_, index) => <LoadingCard key={index} variant="anime" />)}
        </div>
      ) : (
        <div className={grid ? 'av-mobile-card-grid' : 'av-mobile-card-rail'}>{children}</div>
      )}
    </section>
  );
}
