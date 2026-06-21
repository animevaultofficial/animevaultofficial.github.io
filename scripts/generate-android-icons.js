#!/usr/bin/env node

/**
 * Android Icon Generation Script
 * Generates proper Android launcher icons from the logo PNG
 * Requires: Sharp (npm install sharp)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceIcon = path.join(__dirname, '..', 'public', 'logo.png');
const androidResDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');

// Android icon sizes (foreground for adaptive icons)
const ICON_SIZES = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

async function generateIcons() {
  if (!fs.existsSync(sourceIcon)) {
    console.error(`❌ Source icon not found: ${sourceIcon}`);
    process.exit(1);
  }

  console.log('🎨 Generating Android launcher icons...');

  // Generate foreground icons at each density
  for (const [dir, size] of Object.entries(ICON_SIZES)) {
    const outputDir = path.join(androidResDir, dir);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate ic_launcher_foreground.png (the logo on transparent bg)
    await sharp(sourceIcon)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(outputDir, 'ic_launcher_foreground.png'));

    // Generate ic_launcher.png (full icon with background)
    await sharp(sourceIcon)
      .resize(size, size, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 1 } })
      .png()
      .toFile(path.join(outputDir, 'ic_launcher.png'));

    // Generate ic_launcher_round.png (same as launcher for simplicity)
    await sharp(sourceIcon)
      .resize(size, size, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 1 } })
      .png()
      .toFile(path.join(outputDir, 'ic_launcher_round.png'));

    console.log(`  ✅ Generated ${size}x${size} icons in ${dir}`);
  }

  // Generate splash screen
  const splashSize = 1080;
  await sharp(sourceIcon)
    .resize(400, 400, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 1 } })
    .png()
    .toFile(path.join(androidResDir, 'drawable', 'splash.png'));

  console.log('  ✅ Generated splash screen');
  console.log('✅ Android icon generation completed!');
}

generateIcons().catch(err => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});