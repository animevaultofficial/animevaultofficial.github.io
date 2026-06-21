const fs = require('fs');
let css = fs.readFileSync('src/styles.css', 'utf8');

// Remove the one added at the bottom
css = css.replace(/\/\* ── Server Selector ── \*\/\r?\n\.server-selector-v2 \{\r?\n  display: flex;\r?\n  align-items: center;\r?\n  justify-content: flex-end;\r?\n  flex-wrap: wrap;\r?\n  gap: 0\.5rem;\r?\n  padding: 0\.5rem 0;\r?\n\}\r?\n/, '');

// Fix the original one
css = css.replace(
  /\.server-selector-v2 \{[\s\S]*?border-top: 1px solid rgba\(255, 255, 255, 0\.05\);\r?\n\}/,
  \`.server-selector-v2 {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 0.5rem 0;
  background: transparent;
  border: none;
}\`
);

fs.writeFileSync('src/styles.css', css);
console.log('Fixed styles.css!');
