import React from 'react';

export default function ToggleSwitch({ checked, onChange, label, description }) {
  return (
    <div className="discord-toggle-container">
      <div>
        {label && <div className="discord-toggle-label">{label}</div>}
        {description && <div className="discord-toggle-desc">{description}</div>}
      </div>
      <label className="discord-toggle">
        <input 
          type="checkbox" 
          checked={checked} 
          onChange={(e) => onChange(e.target.checked)} 
        />
        <span className="discord-toggle-slider"></span>
      </label>
    </div>
  );
}
