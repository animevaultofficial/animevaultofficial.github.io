#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, copyFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const ROOT = process.cwd();
const SITE = process.env.ANIMEVAULT_URL || 'https://animevaultofficial.fun';
const LOCAL = process.env.ANIMEVAULT_LOCAL_URL || 'http://localhost:5173';
const rl = createInterface({ input, output });
const C = { reset:'\x1b[0m', pink:'\x1b[38;5;205m', cyan:'\x1b[36m', green:'\x1b[32m', red:'\x1b[31m', yellow:'\x1b[33m', dim:'\x1b[2m', bold:'\x1b[1m' };
const paint = (c,s) => process.stdout.isTTY ? c+s+C.reset : s;
const sleep = ms => new Promise(r=>setTimeout(r,ms));
let server = null;

function banner() {
  console.clear();
  console.log(paint(C.pink, '╔════════════════════════════════════════════════════════════════╗'));
  console.log(paint(C.pink, '║') + paint(C.bold, '                 ANIMEVAULT DEVELOPER WORLD                  ') + paint(C.pink, '║'));
  console.log(paint(C.pink, '║') + '       local control center • diagnostics • API lab           ' + paint(C.pink, '║'));
  console.log(paint(C.pink, '╚════════════════════════════════════════════════════════════════╝'));
  console.log(paint(C.dim, '  Repo: animevaultofficial/animevaultofficial.github.io'));
  console.log('  Folder: ' + ROOT + '\n');
}
function say(type, msg) {
  const color = type === 'PASS' ? C.green : type === 'FAIL' ? C.red : C.yellow;
  console.log('  ' + paint(color, type.padEnd(5)) + msg);
}
async function pause() { await rl.question('\nPress Enter to return to the console...'); }
async function run(command, args, label) {
  return new Promise(resolveDone => {
    console.log('\n' + paint(C.cyan, '> ' + command + ' ' + args.join(' ')) + '\n');
    const child = spawn(command, args, { cwd: ROOT, stdio:'inherit', shell: process.platform === 'win32', env:process.env });
    child.on('error', e => { say('FAIL', label + ': ' + e.message); resolveDone(false); });
    child.on('close', code => { say(code === 0 ? 'PASS':'FAIL', label + ' (exit ' + code + ')'); resolveDone(code === 0); });
  });
}
async function probe(name, url, options = {}, expected = r => r.ok) {
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(), 12000);
  try {
    const response = await fetch(url, { ...options, signal:controller.signal, headers:{'User-Agent':'AnimeVault-Developer-World/1.0', ...(options.headers||{})} });
    const body = await response.text();
    const ok = expected(response, body);
    say(ok?'PASS':'FAIL', name + ' — HTTP ' + response.status + ' (' + url + ')');
    if (!ok && body) console.log(paint(C.dim, '         ' + body.slice(0,180).replace(/\s+/g,' ')));
    return ok;
  } catch(e) {
    say('FAIL', name + ' — ' + (e.name === 'AbortError' ? 'timeout after 12s' : e.message));
    return false;
  } finally { clearTimeout(timer); }
}
function getPackage() {
  try { return JSON.parse(readFileSync(resolve(ROOT,'package.json'),'utf8')); }
  catch { return null; }
}
function envValues() {
  const path = resolve(ROOT,'.env.local');
  if (!existsSync(path)) return { exists:false, values:{} };
  const values = {};
  for (const line of readFileSync(path,'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match && !match[1].startsWith('#')) values[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return { exists:true, values };
}
function envStatus() {
  console.log('\n' + paint(C.cyan,'Environment file (.env.local)'));
  const env = envValues();
  if (!env.exists) {
    say('INFO','.env.local not found. Choose [E] from the menu to create it from .env.example.');
    return;
  }
  say('PASS','.env.local exists; values are hidden for safety.');
  const required = ['VITE_AUTH_PROXY_URL','VITE_NEON_AUTH_URL'];
  for (const key of required) {
    const value = env.values[key] || process.env[key];
    say(value && !/your-|example|placeholder/i.test(value) ? 'PASS':'INFO', key + ': ' + (value ? 'configured (value hidden)' : 'not set'));
  }
  const secretLike = Object.keys(env.values).filter(k => /SECRET|PASSWORD|DATABASE_URL|API_KEY/i.test(k));
  if (secretLike.some(k => k.startsWith('VITE_'))) say('WARN','A VITE_ variable looks like a secret. VITE_ values are bundled into client code; never put private secrets there.');
  if (env.values.VITE_DATABASE_URL) say('WARN','VITE_DATABASE_URL is exposed to frontend builds. Only use it if this project intentionally requires a public value; private DB credentials belong server-side.');
  say('INFO','This console never prints the contents of environment variables.');
}
async function envWizard() {
  console.log('\n' + paint(C.cyan,'ENVIRONMENT SETUP'));
  const target = resolve(ROOT,'.env.local');
  const example = resolve(ROOT,'.env.example');
  if (!existsSync(example)) { say('FAIL','.env.example not found.'); return; }
  if (existsSync(target)) {
    const choice = (await rl.question('.env.local already exists. Keep it (K) or replace with template (R)? ')).trim().toLowerCase();
    if (choice !== 'r') { say('INFO','Kept existing .env.local.'); return; }
    const confirm = (await rl.question('Replacing may remove your local settings. Type REPLACE to confirm: ')).trim();
    if (confirm !== 'REPLACE') { say('INFO','Cancelled.'); return; }
  }
  copyFileSync(example,target);
  say('PASS','Created .env.local from .env.example.');
  console.log('  Open .env.local in a text editor and configure only values you understand.');
  console.log('  Never commit .env.local or share private keys. VITE_* values are public in the browser bundle.');
}
async function repositoryCheck() {
  console.log('\n' + paint(C.cyan,'REPOSITORY & TOOLCHAIN'));
  const pkg = getPackage();
  if (!pkg) { say('FAIL','package.json not found. Run this console from the AnimeVault repository root.'); return; }
  say(pkg.name==='animevault'?'PASS':'FAIL','Project package name: '+(pkg.name||'(missing)'));
  say(existsSync(resolve(ROOT,'src'))?'PASS':'FAIL','src/ directory');
  say(existsSync(resolve(ROOT,'vite.config.js'))?'PASS':'FAIL','vite.config.js');
  say(existsSync(resolve(ROOT,'node_modules'))?'PASS':'INFO','node_modules '+(existsSync(resolve(ROOT,'node_modules'))?'installed':'missing — choose Install dependencies'));
  say(Number(process.versions.node.split('.')[0])>=22?'PASS':'WARN','Node.js '+process.versions.node+' (project recommends Node 22.12+)');
  say(pkg.scripts?.test?'PASS':'FAIL','npm test script');
  say(pkg.scripts?.build?'PASS':'FAIL','npm run build script');
  envStatus();
}
async function apiLab(base) {
  console.log('\n' + paint(C.cyan,'API & SERVICE LAB'));
  console.log('Target base: '+base);
  await probe('Frontend document',base);
  await probe('AniList GraphQL', 'https://graphql.anilist.co', {
    method:'POST', headers:{'Content-Type':'application/json','Accept':'application/json'},
    body:JSON.stringify({query:'query { SiteStatistics { users { total } } }'})
  }, (r,b)=>r.ok && /data|errors/i.test(b));
  await probe('AllAnime upstream reachable','https://api.allanime.day/api',{
    method:'POST', headers:{'Content-Type':'application/json','Referer':'https://allmanga.to'},
    body:JSON.stringify({query:'query { __typename }'})
  }, r=>r.ok);
  if (base.includes('localhost') || base.includes('127.0.0.1')) {
    await probe('Local manga API route',base.replace(/\/$/,'')+'/api/manga/search/attack%20on%20titan/1',{},r=>r.status<500);
    await probe('Local AllAnime API route',base.replace(/\/$/,'')+'/api/allanime/shows',{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'One Piece'})
    },r=>r.status<500);
    await probe('Local hCaptcha route (expected validation response)',base.replace(/\/$/,'')+'/api/hcaptcha/verify',{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({})
    },r=>[400,500].includes(r.status));
  } else {
    say('INFO','Local API route checks run only against localhost; production serverless routes may differ.');
  }
}
async function openBrowser(url) {
  try {
    if (process.platform === 'win32') spawn('cmd',['/c','start','',url],{detached:true,stdio:'ignore'}).unref();
    else if (process.platform === 'darwin') spawn('open',[url],{detached:true,stdio:'ignore'}).unref();
    else spawn('xdg-open',[url],{detached:true,stdio:'ignore'}).unref();
    say('PASS','Asked the operating system to open '+url);
  } catch(e) { say('FAIL','Could not open browser: '+e.message); }
}
async function launchLocal() {
  if (server && server.exitCode === null) {
    say('INFO','Development server already started in this console.');
    await openBrowser(LOCAL); return;
  }
  if (!existsSync(resolve(ROOT,'node_modules'))) {
    say('WARN','Dependencies missing. Run install first.'); return;
  }
  console.log('\nStarting Vite. Keep this console open while using the local app.');
  server = spawn('npm',['run','dev'],{cwd:ROOT,stdio:'inherit',shell:process.platform==='win32',env:process.env});
  server.on('error',e=>say('FAIL','Vite failed to start: '+e.message));
  await sleep(1800);
  await openBrowser(LOCAL);
  say('INFO','To stop Vite, select Stop local server or close this console.');
}
async function stopServer() {
  if (!server || server.exitCode !== null) { say('INFO','No local server started by this console.'); return; }
  if (process.platform==='win32') spawn('taskkill',['/pid',String(server.pid),'/t','/f'],{stdio:'ignore'}).on('close',()=>{});
  else server.kill('SIGTERM');
  server = null;
  say('PASS','Sent stop signal to the local server.');
}
async function tests() {
  if (!existsSync(resolve(ROOT,'node_modules'))) { say('FAIL','Dependencies missing. Choose Install dependencies first.'); return; }
  await run('npm',['test'],'Vitest unit tests');
}
async function build() {
  if (!existsSync(resolve(ROOT,'node_modules'))) { say('FAIL','Dependencies missing. Choose Install dependencies first.'); return; }
  await run('npm',['run','build'],'Production build');
}
async function allDiagnostics() {
  await repositoryCheck();
  await tests();
  await build();
  await apiLab(LOCAL);
  await apiLab(SITE);
}
async function menu() {
  while (true) {
    banner();
    console.log('  [1] Launch AnimeVault locally (opens browser)');
    console.log('  [2] Run all diagnostics');
    console.log('  [3] Unit tests');
    console.log('  [4] Production build');
    console.log('  [5] API & service lab (local + external APIs)');
    console.log('  [6] Check environment setup');
    console.log('  [E] Create .env.local from template');
    console.log('  [7] Install dependencies');
    console.log('  [8] Git status / recent commits');
    console.log('  [9] Pull latest changes from main');
    console.log('  [S] Stop local server');
    console.log('  [W] Open live AnimeVault website');
    console.log('  [0] Exit\n');
    const choice = (await rl.question('  AnimeVault > ')).trim().toLowerCase();
    if (choice==='0') break;
    if (choice==='1') await launchLocal();
    else if (choice==='2') await allDiagnostics();
    else if (choice==='3') await tests();
    else if (choice==='4') await build();
    else if (choice==='5') { await apiLab(LOCAL); await apiLab(SITE); }
    else if (choice==='6') envStatus();
    else if (choice==='e') await envWizard();
    else if (choice==='7') await run('npm',['install'],'Install dependencies');
    else if (choice==='8') { await run('git',['status','--short','--branch'],'Git status'); await run('git',['log','-8','--oneline'],'Recent commits'); }
    else if (choice==='9') await run('git',['pull','origin','main'],'Pull origin/main');
    else if (choice==='s') await stopServer();
    else if (choice==='w') await openBrowser(SITE);
    else say('WARN','Unknown option.');
    if (choice!=='1') await pause();
  }
  await stopServer();
  rl.close();
  console.log('\nAnimeVault Developer World closed. See you next time.\n');
}
if (!existsSync(resolve(ROOT,'package.json'))) {
  console.error('Run this console from the AnimeVault repository root.');
  process.exit(1);
}
menu().catch(async e=>{ console.error(e); await stopServer(); rl.close(); process.exitCode=1; });
