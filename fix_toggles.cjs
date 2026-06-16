const fs = require('fs');

let content = fs.readFileSync('c:/Anime-Vault/src/pages/Settings.jsx', 'utf8');

// The remaining checkboxes
content = content.replace(/<label style=\{\{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer'(?:, width: 'fit-content')? \}\}>\s*<input\s*type="checkbox"\s*checked=\{([^}]+)\}\s*onChange=\{\(e\) => ([^}]+)\(e\.target\.checked\)(?:[^}]*)\}\s*style=\{\{[\s\S]*?\}\}\s*\/>\s*<span style=\{\{ fontSize: '0\.95rem' \}\}>([^<]+)<\/span>\s*<\/label>/g, 
  '<ToggleSwitch checked={$1} onChange={(val) => $2(val)} label="$3" />'
);

content = content.replace(/<label style=\{\{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' \}\}>\s*<input\s*type="checkbox"\s*checked=\{([^}]+)\}\s*onChange=\{\(e\) => ([^}]+)\(e\.target\.checked\)(?:[^}]*)\}\s*style=\{\{[\s\S]*?\}\}\s*\/>\s*<span style=\{\{ fontSize: '0\.9rem', color: 'var\(--text-secondary\)' \}\}>([^<]+)<\/span>\s*<\/label>/g, 
  '<ToggleSwitch checked={$1} onChange={(val) => $2(val)} label="$3" />'
);

fs.writeFileSync('c:/Anime-Vault/src/pages/Settings.jsx', content);
