import React from 'react';

/**
 * SettingsSelect – a reusable styled <select> component for the Settings page.
 * Props:
 *   - value: current selected value
 *   - onChange: event handler (receives the original event)
 *   - options: array of { value: string|number, label: string }
 *   - className: optional additional class names
 */
export default function SettingsSelect({ value, onChange, options, children, className = '' }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className={`discord-select ${className}`.trim()}
    >
      {options ? (
        options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))
      ) : (
        children
      )}
    </select>
  );
}
