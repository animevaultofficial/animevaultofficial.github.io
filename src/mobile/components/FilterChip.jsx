import React from 'react';

export default function FilterChip({ label, selected = false, onClick }) {
  return <button type="button" className={`av-filter-chip ${selected ? 'is-selected' : ''}`} aria-pressed={selected} onClick={onClick}>{label}</button>;
}
