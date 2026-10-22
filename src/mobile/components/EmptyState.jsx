import React from 'react';
import { Search } from 'lucide-react';

export default function EmptyState({ icon: Icon = Search, title, message, action, actionText = 'Try again' }) {
  return (
    <div className="av-empty-state" role="status">
      <div className="av-empty-icon" aria-hidden="true"><Icon size={24} strokeWidth={1.8} /></div>
      <h2>{title}</h2>
      {message && <p>{message}</p>}
      {action && <button type="button" className="av-primary-button" onClick={action}>{actionText}</button>}
    </div>
  );
}
