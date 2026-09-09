const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve('dist-mobile');
const indexPath = path.join(root, 'index.html');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(indexPath)) fail('dist-mobile/index.html was not produced.');

const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else files.push(file);
  }
}
walk(root);

const assets = files.filter(file => /\.(js|css|html)$/i.test(file));
if (assets.length === 0) fail('No mobile web assets were produced.');

const html = fs.readFileSync(indexPath, 'utf8');
if (!/<script[^>]+type=["']module["']/i.test(html)) fail('Mobile index is missing its module entry script.');

let iframeCount = 0;
for (const file of assets) {
  const text = fs.readFileSync(file, 'utf8');
  if (/<iframe\b/i.test(text)) iframeCount += 1;
}
if (iframeCount > 0) fail(`Mobile build contains iframe markup in ${iframeCount} asset(s).`);

console.log(`Mobile build verified: ${files.length} files, ${assets.length} web assets, no iframe markup.`);
