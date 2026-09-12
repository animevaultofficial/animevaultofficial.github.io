import React from 'react';

export default function EmptyState({ icon = '🔍', title, message, action, actionText = 'Try again' }) {
  return (
    <div className="av-empty-state" role="status">
      <div className="av-empty-icon" aria-hidden="true">{icon}</div>
      <h2>{title}</h2>
      {message && <p>{message}</p>}
      {action && <button type="button" className="av-primary-button" onClick={action}>{actionText}</button>}
    </div>
  );
}
