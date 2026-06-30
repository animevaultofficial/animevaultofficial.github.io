const { execFileSync, spawnSync } = require('node:child_process');
const { copyFileSync, existsSync, mkdirSync, rmSync } = require('node:fs');
const { join } = require('node:path');

const root = process.cwd();
const outDir = join(root, 'dist-webos');
const ipkDir = join(root, 'dist-ipk');

execFileSync('npx', ['vite', 'build', '--mode', 'webos'], { stdio: 'inherit', shell: process.platform === 'win32' });
copyFileSync(join(root, 'webos', 'appinfo.json'), join(outDir, 'appinfo.json'));
copyFileSync(join(root, 'public', 'logo.png'), join(outDir, 'logo.png'));
mkdirSync(ipkDir, { recursive: true });

const packager = process.platform === 'win32' ? 'ares-package.cmd' : 'ares-package';
const result = spawnSync(packager, ['-o', ipkDir, outDir], { stdio: 'inherit', shell: process.platform === 'win32' });
if (result.error || result.status !== 0) {
  console.warn('\n[webOS] Built dist-webos with appinfo.json, but ares-package is not available or failed.');
  console.warn('[webOS] Install LG webOS TV CLI, then run: ares-package -o dist-ipk dist-webos');
  process.exitCode = 0;
} else {
  console.log('\n[webOS] IPK created in dist-ipk/');
}
