#!/usr/bin/env node
/**
 * AnimeVault Doctor — dependency-free terminal test runner.
 * Usage:
 *   node scripts/animevault-doctor.mjs
 *   node scripts/animevault-doctor.mjs --unit
 *   node scripts/animevault-doctor.mjs --build
 *   node scripts/animevault-doctor.mjs --live
 *   node scripts/animevault-doctor.mjs --quick
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const SITE = process.env.ANIMEVAULT_URL || 'https://animevaultofficial.fun';
const args = new Set(process.argv.slice(2));
const known = ['--unit', '--build', '--live', '--quick', '--help'];
const unknown = [...args].filter((arg) => !known.includes(arg));

if (unknown.length) {
  console.error(`Unknown option(s): ${unknown.join(', ')}`);
  console.error('Run with --help to see usage.');
  process.exit(2);
}

if (args.has('--help')) {
  console.log(`
AnimeVault Doctor — local checks + production health check

Run from the AnimeVault repository root:
  node scripts/animevault-doctor.mjs          Run all checks
  node scripts/animevault-doctor.mjs --unit   Run Vitest only
  node scripts/animevault-doctor.mjs --build  Run production build only
  node scripts/animevault-doctor.mjs --live   Check the live website only
  node scripts/animevault-doctor.mjs --quick  Run repository checks + live website
  set ANIMEVAULT_URL to check a different deployment URL

Requirements: Node.js 22.12+ and installed project dependencies for --unit/--build.
`);
  process.exit(0);
}

const results = [];
const color = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  bold: '\x1b[1m',
};
const paint = (code, value) => process.stdout.isTTY ? code + value + color.reset : value;

function section(title) {
  console.log('\n' + paint(color.cyan, `━━ ${title} ━━`));
}
function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${paint(ok ? color.green : color.red, ok ? 'PASS' : 'FAIL')}  ${name}${detail ? ' — ' + detail : ''}`);
}
function warn(name, detail) {
  console.log(`${paint(color.yellow, 'INFO')}  ${name} — ${detail}`);
}
function run(command, commandArgs, label) {
  return new Promise((done) => {
    console.log(paint(color.bold, `\n> ${command} ${commandArgs.join(' ')}`));
    const child = spawn(command, commandArgs, {
      cwd: ROOT,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: process.env,
    });
    child.on('error', (error) => {
      record(label, false, error.message);
      done(false);
    });
    child.on('close', (code) => {
      const ok = code === 0;
      record(label, ok, ok ? 'exit code 0' : `exit code ${code ?? 'unknown'}`);
      done(ok);
    });
  });
}

async function repositoryChecks() {
  section('Repository sanity');
  const packagePath = resolve(ROOT, 'package.json');
  if (!existsSync(packagePath)) {
    record('Run from repository root', false, 'package.json not found in current directory');
    return false;
  }
  record('Run from repository root', true, 'package.json found');

  let pkg;
  try {
    pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
    record('package.json parses', true);
  } catch (error) {
    record('package.json parses', false, error.message);
    return false;
  }

  record('Project identity', pkg.name === 'animevault', `name is "${pkg.name ?? '(missing)'}"`);
  record('Test command exists', Boolean(pkg.scripts?.test), pkg.scripts?.test ? pkg.scripts.test : 'scripts.test missing');
  record('Build command exists', Boolean(pkg.scripts?.build), pkg.scripts?.build ? pkg.scripts.build : 'scripts.build missing');
  record('Vite config exists', existsSync(resolve(ROOT, 'vite.config.js')) || existsSync(resolve(ROOT, 'vite.config.ts')));
  record('Source directory exists', existsSync(resolve(ROOT, 'src')));
  record('Node version', Number(process.versions.node.split('.')[0]) >= 22, `current: v${process.versions.node}`);
  return results.slice(-6).every((item) => item.ok);
}

async function liveCheck() {
  section('Live website');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(SITE, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': 'AnimeVault-Doctor/1.0' },
    });
    const html = await response.text();
    record('Website responds', response.status >= 200 && response.status < 400,
      `HTTP ${response.status} · final URL: ${response.url}`);
    record('HTML document returned', /<html[\s>]/i.test(html) && /<\/html>/i.test(html),
      `${html.length.toLocaleString()} characters`);
    record('AnimeVault branding found', /anime\s*vault/i.test(html) || /<title[^>]*>[^<]+<\/title>/i.test(html),
      'basic HTML branding/title check');
  } catch (error) {
    record('Website responds', false, error.name === 'AbortError' ? 'timed out after 12 seconds' : error.message);
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  console.log(paint(color.bold, 'AnimeVault Doctor'));
  console.log(`Target: ${SITE}`);
  console.log(`Directory: ${ROOT}`);

  const selected = args.has('--unit') || args.has('--build') || args.has('--live') || args.has('--quick');
  const all = !selected;
  const doUnit = all || args.has('--unit');
  const doBuild = all || args.has('--build');
  const doLive = all || args.has('--live') || args.has('--quick');
  const doRepo = all || args.has('--quick') || args.has('--unit') || args.has('--build');

  if (doRepo) await repositoryChecks();
  if (doUnit) {
    if (existsSync(resolve(ROOT, 'node_modules'))) {
      await run('npm', ['test', '--', '--reporter=default'], 'Unit tests (Vitest)');
    } else {
      record('Unit tests (Vitest)', false, 'node_modules missing; run npm install first');
    }
  }
  if (doBuild) {
    if (existsSync(resolve(ROOT, 'node_modules'))) {
      await run('npm', ['run', 'build'], 'Production build');
    } else {
      record('Production build', false, 'node_modules missing; run npm install first');
    }
  }
  if (doLive) await liveCheck();

  section('Summary');
  const passed = results.filter((item) => item.ok).length;
  const failed = results.filter((item) => !item.ok).length;
  console.log(`${paint(color.green, `${passed} passed`)} · ${paint(failed ? color.red : color.green, `${failed} failed`)} · ${results.length} checks`);
  if (failed) {
    console.log('\nSome checks failed. Scroll up to find the first FAIL and fix that issue before rerunning.');
    process.exitCode = 1;
  } else {
    console.log('\nAll selected checks passed.');
  }
}

main().catch((error) => {
  console.error('\nUnexpected doctor error:', error);
  process.exitCode = 1;
});
