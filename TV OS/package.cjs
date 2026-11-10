const { execFileSync } = require('node:child_process');
const { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } = require('node:fs');
const path = require('node:path');

const appDir = __dirname;
const repoDir = path.resolve(appDir, '..');
const outDir = path.join(appDir, 'dist');
const packageDir = path.join(appDir, 'dist-ipk');
const packageJson = JSON.parse(readFileSync(path.join(appDir, 'package.json'), 'utf8'));
const appInfoPath = path.join(appDir, 'appinfo.json');
const appInfo = JSON.parse(readFileSync(appInfoPath, 'utf8'));
appInfo.version = packageJson.version;

const viteCli = path.join(repoDir, 'node_modules', 'vite', 'bin', 'vite.js');
const packager = path.join(repoDir, 'node_modules', '@webos-tools', 'cli', 'bin', 'ares-package.js');
if (!existsSync(viteCli) || !existsSync(packager)) throw new Error('Install the repository dependencies before building the TV OS app.');

for (const target of [outDir, packageDir]) if (existsSync(target)) rmSync(target, { recursive: true, force: true });
execFileSync(process.execPath, [viteCli, 'build', '--config', path.join(appDir, 'vite.config.js')], { cwd: repoDir, stdio: 'inherit' });
if (!existsSync(path.join(outDir, 'index.html')) || !existsSync(path.join(outDir, 'logo.png'))) throw new Error('TV OS build output is missing required app files.');
writeFileSync(path.join(outDir, 'appinfo.json'), `${JSON.stringify(appInfo, null, 2)}\n`, 'utf8');
mkdirSync(packageDir, { recursive: true });
execFileSync(process.execPath, [packager, '--no-minify', '-o', packageDir, outDir], { cwd: repoDir, stdio: 'inherit' });
console.log(`TV OS IPK: ${packageDir}`);
