import React from 'react';

export default function ProgressBar({ current = 0, total = 0, watched, showLabel = false }) {
  const value = watched != null ? watched : (total > 0 ? (current / total) * 100 : 0);
  const percent = Math.max(0, Math.min(100, value));
  return <div className="av-progress-wrap" aria-label={`${Math.round(percent)} percent complete`}>
    {showLabel && <span>{Math.round(percent)}%</span>}
    <div className="av-progress-track"><div className="av-progress-fill" style={{ width: `${percent}%` }} /></div>
  </div>;
}
