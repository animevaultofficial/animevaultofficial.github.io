import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const logoPath = path.join(root, 'public', 'logo.png');
const outputPath = path.join(root, 'android', 'app', 'src', 'main', 'res', 'drawable-nodpi', 'animevault_tv_banner.png');

if (!fs.existsSync(logoPath)) throw new Error(`TV banner logo is missing: ${logoPath}`);

const background = Buffer.from(`
  <svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
    <rect width="640" height="360" fill="#080b0e" />
    <rect y="350" width="640" height="10" fill="#e50914" />
    <text x="214" y="174" fill="#ffffff" font-family="Arial, sans-serif" font-size="46" font-weight="700">AnimeVault</text>
    <text x="218" y="222" fill="#aeb6c0" font-family="Arial, sans-serif" font-size="20" letter-spacing="3">ANIME · MOVIES · SERIES</text>
  </svg>
`);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
const logo = await sharp(logoPath)
  .resize(112, 112, { fit: 'contain' })
  .png()
  .toBuffer();

await sharp(background)
  .composite([{ input: logo, left: 64, top: 124 }])
  .png()
  .toFile(outputPath);

console.log(`Android TV banner created: ${outputPath}`);
