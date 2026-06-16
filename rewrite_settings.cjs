const fs = require('fs');

let content = fs.readFileSync('c:/Anime-Vault/src/pages/Settings.jsx', 'utf8');

// 1. Add imports
if (!content.includes("import '../styles/settings.css'")) {
    content = content.replace("import { useState", "import '../styles/settings.css';\nimport ToggleSwitch from '../components/ToggleSwitch';\nimport { useState");
}

// 2. Replace container
content = content.replace(/<div className="settings-container"[^>]*>([\s\S]*?)<\/div>\s*\}\s*$/m, function(match, inner) {
    // This regex might fail if there are nested divs that aren't matched.
    return match; // fallback
});

// Let's do string replacement instead
content = content.replace(/<div className="settings-container" style={{[\s\S]*?flexWrap: 'wrap',\s*}}>/, '<div className="discord-settings-layout">');

// Sidebar replacement
content = content.replace(/<div style={{\s*width: '240px',\s*flexShrink: 0,\s*display: 'flex',\s*flexDirection: 'column',\s*gap: '8px',\s*}}>/, '<div className="discord-settings-sidebar"><div className="discord-sidebar-content">');
// Add closing div for sidebar-content before Main Content
content = content.replace(/\{\/\* Main Content \*\/\}/, '</div></div>\n      {/* Main Content */}');

// Back to profile link
content = content.replace(/<Link to="\/profile" style={{[\s\S]*?fontWeight: '600',\s*}}>/, '<Link to="/profile" className="discord-sidebar-item" style={{ marginBottom: "16px" }}>');

// Settings Header in sidebar
content = content.replace(/<div style={{\s*fontSize: '1.75rem',\s*fontWeight: '900',[\s\S]*?marginBottom: '24px',\s*}}>\s*<SettingsIcon[^>]*\/>\s*Settings\s*<\/div>/, '<div className="discord-sidebar-category" style={{ marginBottom: "12px", fontSize: "14px", display: "flex", alignItems: "center", gap: "8px", color: "var(--text-primary)" }}><SettingsIcon size={20} /> Settings</div>');

// Tab buttons
content = content.replace(/<button\s*key=\{tab\.id\}[\s\S]*?onClick=\{[\s\S]*?\}[\s\S]*?style=\{\{[\s\S]*?\}\}\s*>\s*<Icon size=\{18\} \/>\s*\{tab\.label\}\s*<\/button>/g, '<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`discord-sidebar-item ${activeTab === tab.id ? "active" : ""}`}> <Icon size={18} /> {tab.label} </button>');

// Main content container
content = content.replace(/<div style={{ flex: 1, minWidth: '0' }}>/, '<div className="discord-settings-main"><div className="discord-main-content">');

// Save/Reset Buttons
content = content.replace(/<div style={{\s*display: 'flex',\s*gap: '12px',\s*justifyContent: 'flex-end',\s*marginBottom: '24px',\s*}}>/, '<div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginBottom: "24px" }}>');
content = content.replace(/<button\s*onClick=\{handleReset\}\s*style=\{\{[\s\S]*?\}\}\s*>\s*<RefreshCw size=\{16\} \/>\s*Reset to Defaults\s*<\/button>/, '<button onClick={handleReset} className="discord-btn-outline" style={{ display: "flex", alignItems: "center", gap: "8px" }}> <RefreshCw size={16} /> Reset to Defaults </button>');
content = content.replace(/<button\s*onClick=\{handleSave\}\s*style=\{\{[\s\S]*?\}\}\s*>\s*<Save size=\{16\} \/>\s*Save Changes\s*<\/button>/, '<button onClick={handleSave} className="discord-btn-primary" style={{ display: "flex", alignItems: "center", gap: "8px" }}> <Save size={16} /> Save Changes </button>');

// Tab Content Wrapper
content = content.replace(/<div style={{\s*background: 'var\(--surface\)',\s*borderRadius: '16px',\s*padding: '28px',\s*border: '1px solid var\(--border\)',\s*}}>/, '<div className="discord-card" style={{ background: "transparent", padding: 0, border: "none" }}>');

// Headers
content = content.replace(/<h2 style={{ fontSize: '1\.5rem', fontWeight: '900', marginBottom: '8px' }}>(.*?)<\/h2>/g, '<h2 className="discord-section-title">$1</h2>');
content = content.replace(/<h3 style={{ fontSize: '1\.1rem', fontWeight: '800', marginBottom: '(?:16|8)px'(?:, color: '#ef4444')? }}>(.*?)<\/h3>/g, '<h3 className="discord-section-subtitle" style={{ color: "$1" === "Danger Zone" ? "var(--danger)" : "var(--text-muted)" }}>$1</h3>');

// Inputs and Selects
content = content.replace(/<input\s*type="text"[\s\S]*?style=\{\{[\s\S]*?\}\}\s*\/>/g, (match) => match.replace(/style=\{\{[\s\S]*?\}\}/, 'className="discord-input"'));
content = content.replace(/<input\s*type="email"[\s\S]*?style=\{\{[\s\S]*?\}\}\s*\/>/g, (match) => match.replace(/style=\{\{[\s\S]*?\}\}/, 'className="discord-input"'));
content = content.replace(/<textarea[\s\S]*?style=\{\{[\s\S]*?\}\}\s*\/>/g, (match) => match.replace(/style=\{\{[\s\S]*?\}\}/, 'className="discord-input"'));
content = content.replace(/<select[\s\S]*?style=\{\{[\s\S]*?\}\}\s*>/g, (match) => match.replace(/style=\{\{[\s\S]*?\}\}/, 'className="discord-select"'));

// Labels (uppercase)
content = content.replace(/<label style={{ display: 'block', fontSize: '0\.85rem', fontWeight: '700', marginBottom: '(?:12|8)px', (textTransform: 'uppercase', )?color: 'var\(--text-secondary\)' }}>/g, '<label className="discord-input-label">');

// Toggle switches replacement
// Finding the pattern:
/*
<label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', width: 'fit-content' }}>
  <input
    type="checkbox"
    checked={settings.autoplay}
    onChange={(e) => setSettings({ ...settings, autoplay: e.target.checked })}
    style={{ cursor: 'pointer', width: '18px', height: '18px' }}
  />
  <span style={{ fontSize: '0.95rem' }}>Autoplay next episode</span>
</label>
*/
content = content.replace(/<label style=\{\{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer'(?:, width: 'fit-content')? \}\}>\s*<input\s*type="checkbox"\s*checked=\{([^}]+)\}\s*onChange=\{\(e\) => ([^}]+)\(e\.target\.checked\)(?:[^}]*)\}\s*style=\{\{[^}]+\}\}\s*\/>\s*<span style=\{\{ fontSize: '0\.95rem' \}\}>([^<]+)<\/span>\s*<\/label>/g, 
  '<ToggleSwitch checked={$1} onChange={(val) => $2(val)} label="$3" />'
);

// Close main containers
const finalDivIndex = content.lastIndexOf('</div>');
// The very last </div> is the layout container. The second to last is flex=1.
// We changed flex=1 to discord-settings-main > discord-main-content
// We need to ensure tags close properly. Let's just write to file.
fs.writeFileSync('c:/Anime-Vault/src/pages/Settings.jsx', content);
