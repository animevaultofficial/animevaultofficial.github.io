#!/usr/bin/env node
import { spawn } from 'node:child_process';
import {
  existsSync, readFileSync, writeFileSync, copyFileSync, mkdirSync,
  readdirSync, statSync, appendFileSync
} from 'node:fs';
import { resolve, join, relative, extname } from 'node:path';
import { homedir, platform } from 'node:os';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const VERSION = '1.1.0';
const REPO_URL = 'https://github.com/animevaultofficial/animevaultofficial.github.io';
const SITE = process.env.ANIMEVAULT_URL || 'https://animevaultofficial.fun';
const LOCAL = process.env.ANIMEVAULT_LOCAL_URL || 'http://localhost:5173';
const PROFILE = process.env.USERPROFILE || homedir();
const APP_DIR = resolve(process.env.LOCALAPPDATA || join(PROFILE, 'AppData', 'Local'), 'Programs', 'AnimeVaultDeveloperAdminConsole');
const CONFIG_DIR = resolve(process.env.APPDATA || join(PROFILE, 'AppData', 'Roaming'), 'AnimeVaultDeveloperAdminConsole');
const CONFIG_PATH = resolve(CONFIG_DIR, 'config.json');
const HISTORY_PATH = resolve(CONFIG_DIR, 'history.txt');
const C = { reset:'\x1b[0m', pink:'\x1b[38;5;205m', cyan:'\x1b[36m', green:'\x1b[32m', red:'\x1b[31m', yellow:'\x1b[33m', dim:'\x1b[2m', bold:'\x1b[1m' };
const paint = (color, value) => process.stdout.isTTY ? color + value + C.reset : value;
const sleep = ms => new Promise(resolveSleep => setTimeout(resolveSleep, ms));
let ROOT = process.cwd();
let server = null;
let previewServer = null;
let serverLogs = [];
let previewLogs = [];
let lastTask = null;
let quitting = false;

function isProjectRoot(path) {
  try {
    const pkg = JSON.parse(readFileSync(resolve(path, 'package.json'), 'utf8'));
    return pkg.name === 'animevault';
  } catch { return false; }
}
function readConfig() {
  try { return JSON.parse(readFileSync(CONFIG_PATH, 'utf8')); } catch { return {}; }
}
function saveConfig(patch) {
  mkdirSync(CONFIG_DIR, { recursive:true });
  writeFileSync(CONFIG_PATH, JSON.stringify({ ...readConfig(), ...patch }, null, 2) + '\n', 'utf8');
}
const savedConfig = readConfig();
if (!isProjectRoot(ROOT) && savedConfig.projectRoot && isProjectRoot(savedConfig.projectRoot)) ROOT = resolve(savedConfig.projectRoot);
if (isProjectRoot(ROOT)) process.chdir(ROOT);

const rl = createInterface({
  input, output, historySize: 200,
  completer(line) {
    const all = commandNames.concat(['help','status','doctor','dev start','dev stop','git status','git diff','git log','git pull','api check','env setup','release check','deploy status']);
    const hits = all.filter(item => item.startsWith(line.trim().toLowerCase()));
    return [hits.length ? hits : all, line];
  }
});
try {
  mkdirSync(CONFIG_DIR, { recursive:true });
  if (existsSync(HISTORY_PATH)) {
    const oldHistory = readFileSync(HISTORY_PATH, 'utf8').split(/\r?\n/).filter(Boolean).slice(-200);
    rl.history.push(...oldHistory.reverse());
  }
} catch {}

function banner() {
  console.clear();
  console.log(paint(C.pink, '╭──────────────────────────────────────────────────────────────────╮'));
  console.log(paint(C.pink, '│') + paint(C.bold, '                    ANIMEVAULT TERMINAL v' + VERSION + '                    ') + paint(C.pink, '│'));
  console.log(paint(C.pink, '│') + '             slash commands • project tools • diagnostics          ' + paint(C.pink, '│'));
  console.log(paint(C.pink, '╰──────────────────────────────────────────────────────────────────╯'));
  console.log('  Project: ' + (isProjectRoot(ROOT) ? ROOT : 'Not linked — use /project link'));
  console.log('  Type /help for commands. Use Tab for suggestions.\n');
}
function say(type, message) {
  const color = type === 'PASS' ? C.green : type === 'FAIL' ? C.red : type === 'WARN' ? C.yellow : C.cyan;
  console.log('  ' + paint(color, type.padEnd(5)) + message);
}
function section(title) { console.log('\n' + paint(C.cyan + C.bold, '  ' + title)); }
function projectRequired() {
  if (isProjectRoot(ROOT)) return true;
  say('WARN', 'No local AnimeVault checkout linked. Run /project link. The console installs independently.');
  return false;
}
function packageData() {
  try { return JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')); } catch { return null; }
}
function envData() {
  const path = resolve(ROOT, '.env.local');
  const values = {};
  if (!existsSync(path)) return { exists:false, values };
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && !match[1].startsWith('#')) values[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return { exists:true, values };
}
function run(command, args, label, options = {}) {
  return new Promise(done => {
    section(label);
    console.log(paint(C.dim, '  > ' + command + ' ' + args.join(' ')));
    const child = spawn(command, args, {
      cwd: options.cwd || ROOT,
      stdio: options.capture ? ['ignore','pipe','pipe'] : 'inherit',
      shell: platform() === 'win32' && command.toLowerCase() === 'npm',
      env: process.env
    });
    lastTask = { label, pid:child.pid, startedAt:new Date().toISOString() };
    let out = '';
    if (options.capture) {
      child.stdout.on('data', chunk => { out += chunk.toString(); });
      child.stderr.on('data', chunk => { out += chunk.toString(); });
    }
    child.on('error', error => { say('FAIL', label + ': ' + error.message); done({ok:false,code:-1,output:out}); });
    child.on('close', code => {
      if (options.capture && out) console.log(out.slice(-12000));
      say(code === 0 ? 'PASS' : 'FAIL', label + ' (exit ' + code + ')');
      done({ok:code === 0,code,output:out});
    });
  });
}
function spawnManaged(command, args, label, logStore, url) {
  if (server && label === 'development server' && server.exitCode === null) {
    say('INFO', 'Development server is already running.'); return;
  }
  if (previewServer && label === 'preview server' && previewServer.exitCode === null) {
    say('INFO', 'Preview server is already running.'); return;
  }
  const child = spawn(command, args, {
    cwd:ROOT, stdio:['ignore','pipe','pipe'], shell:platform()==='win32', env:process.env
  });
  if (label === 'development server') server = child; else previewServer = child;
  const addLog = (stream, chunk) => {
    const lines = chunk.toString().split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      const entry = '[' + new Date().toLocaleTimeString() + '] ' + line;
      logStore.push(entry);
      if (logStore.length > 300) logStore.shift();
      console.log(stream === 'stderr' ? paint(C.yellow, '  ' + line) : '  ' + line);
    }
  };
  child.stdout.on('data', chunk => addLog('stdout', chunk));
  child.stderr.on('data', chunk => addLog('stderr', chunk));
  child.on('error', error => say('FAIL', label + ': ' + error.message));
  child.on('close', code => {
    say(code === 0 ? 'INFO' : 'WARN', label + ' stopped (exit ' + code + ')');
    if (label === 'development server') server = null; else previewServer = null;
  });
  say('PASS', 'Started ' + label + ' (PID ' + child.pid + '). Logs: /logs');
  if (url) setTimeout(() => openBrowser(url), 1400);
}
async function stopManaged(which) {
  const child = which === 'preview' ? previewServer : server;
  if (!child || child.exitCode !== null) { say('INFO', 'No ' + (which === 'preview' ? 'preview' : 'development') + ' server managed by this console.'); return; }
  if (platform() === 'win32') {
    await run('taskkill', ['/pid', String(child.pid), '/t', '/f'], 'Stop ' + which + ' server');
  } else {
    child.kill('SIGTERM');
    say('PASS', 'Sent stop signal to ' + which + ' server.');
  }
  if (which === 'preview') previewServer = null; else server = null;
}
async function openBrowser(url) {
  try {
    let command, args;
    if (platform() === 'win32') { command = 'cmd'; args = ['/c','start','',url]; }
    else if (platform() === 'darwin') { command = 'open'; args = [url]; }
    else { command = 'xdg-open'; args = [url]; }
    const child = spawn(command, args, { detached:true, stdio:'ignore', shell:false });
    child.unref();
    say('PASS', 'Opening ' + url);
  } catch (error) { say('FAIL', 'Could not open browser: ' + error.message); }
}
async function probe(name, url, options = {}, expected = response => response.ok) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, {
      ...options, signal:controller.signal,
      headers:{'User-Agent':'AnimeVault-Terminal/' + VERSION, ...(options.headers || {})}
    });
    const body = await response.text();
    const ok = expected(response, body);
    say(ok ? 'PASS' : 'FAIL', name + ' — HTTP ' + response.status + ' (' + url + ')');
    if (!ok && body) console.log(paint(C.dim, '         ' + body.slice(0,160).replace(/\s+/g,' ')));
    return ok;
  } catch (error) {
    say('FAIL', name + ' — ' + (error.name === 'AbortError' ? 'timeout after 10s' : error.message));
    return false;
  } finally { clearTimeout(timer); }
}
function envStatus() {
  section('ENVIRONMENT CHECK (values are never printed)');
  const env = envData();
  if (!env.exists) {
    say('INFO', '.env.local not found. Use /env setup to copy the template.');
    return;
  }
  say('PASS', '.env.local exists; values hidden.');
  for (const key of ['VITE_AUTH_PROXY_URL','VITE_NEON_AUTH_URL']) {
    const value = env.values[key] || process.env[key];
    say(value && !/your-|example|placeholder/i.test(value) ? 'PASS' : 'WARN', key + ': ' + (value ? 'configured (hidden)' : 'not configured'));
  }
  const risky = Object.keys(env.values).filter(key => key.startsWith('VITE_') && /SECRET|PASSWORD|DATABASE_URL|API_KEY|TOKEN/i.test(key));
  if (risky.length) say('WARN', 'Potentially sensitive VITE_ keys detected: ' + risky.join(', ') + '. Values remain hidden; VITE_ variables are public in frontend builds.');
}
async function envSetup() {
  if (!projectRequired()) return;
  const template = resolve(ROOT, '.env.example');
  const target = resolve(ROOT, '.env.local');
  if (!existsSync(template)) { say('FAIL', '.env.example does not exist in this checkout.'); return; }
  if (existsSync(target)) {
    const answer = (await rl.question('Keep existing .env.local (K) or replace with template (R)? ')).trim().toLowerCase();
    if (answer !== 'r') { say('INFO', 'Kept existing .env.local.'); return; }
    if ((await rl.question('This may remove local settings. Type REPLACE to confirm: ')).trim() !== 'REPLACE') { say('INFO','Cancelled.'); return; }
  }
  copyFileSync(template, target);
  say('PASS', 'Created .env.local from .env.example. Review placeholders locally; do not commit this file.');
}
async function linkProject() {
  const existing = isProjectRoot(ROOT) ? ROOT : '';
  const raw = (await rl.question('Local AnimeVault repository path' + (existing ? ' [' + existing + ']' : '') + ': ')).trim().replace(/^['"]|['"]$/g, '');
  const candidate = resolve(raw || existing || '.');
  if (!isProjectRoot(candidate)) { say('FAIL', 'Not an AnimeVault project root (package.json name must be animevault).'); return; }
  ROOT = candidate;
  process.chdir(ROOT);
  saveConfig({projectRoot:ROOT});
  say('PASS', 'Linked ' + ROOT);
}
async function status() {
  section('PROJECT STATUS');
  say(isProjectRoot(ROOT) ? 'PASS' : 'WARN', 'Project: ' + (isProjectRoot(ROOT) ? ROOT : 'not linked'));
  say('INFO', 'Console version: ' + VERSION);
  say('INFO', 'Node.js: ' + process.version + ' | Platform: ' + platform() + ' | Architecture: ' + process.arch);
  if (!isProjectRoot(ROOT)) return;
  const pkg = packageData();
  say('INFO', 'AnimeVault version: ' + (pkg.version || 'unknown'));
  await run('git', ['status','--short','--branch'], 'Git working tree', {capture:true});
  say(existsSync(resolve(ROOT,'node_modules')) ? 'PASS':'WARN', 'Dependencies: ' + (existsSync(resolve(ROOT,'node_modules')) ? 'installed' : 'missing'));
  say(existsSync(resolve(ROOT,'dist')) ? 'INFO':'INFO', 'Production output: ' + (existsSync(resolve(ROOT,'dist')) ? 'dist/ exists' : 'not built'));
}
async function doctor() {
  section('SYSTEM DOCTOR');
  say('PASS', 'Node.js ' + process.version);
  say(Number(process.versions.node.split('.')[0]) >= 22 ? 'PASS' : 'WARN', 'AnimeVault recommends Node.js 22.12+');
  const git = await run('git', ['--version'], 'Git availability', {capture:true});
  if (!git.ok) say('WARN', 'Git commands may be unavailable.');
  if (!isProjectRoot(ROOT)) { say('WARN','No project linked; run /project link.'); return; }
  const pkg = packageData();
  say(pkg.scripts?.dev ? 'PASS':'FAIL', 'npm run dev script');
  say(pkg.scripts?.build ? 'PASS':'FAIL', 'npm run build script');
  say(pkg.scripts?.test ? 'PASS':'WARN', 'npm test script');
  say(existsSync(resolve(ROOT,'node_modules')) ? 'PASS':'WARN', 'node_modules');
  say(existsSync(resolve(ROOT,'vite.config.js')) ? 'PASS':'WARN', 'vite.config.js');
  say(existsSync(resolve(ROOT,'.env.local')) ? 'PASS':'WARN', '.env.local (values hidden)');
  say(existsSync(resolve(ROOT,'.env.example')) ? 'PASS':'WARN', '.env.example template');
}
async function apiCheck() {
  section('API & SERVICE REACHABILITY');
  await probe('Production website', SITE);
  await probe('Local development server', LOCAL);
  await probe('AniList GraphQL', 'https://graphql.anilist.co', {
    method:'POST', headers:{'Content-Type':'application/json','Accept':'application/json'},
    body:JSON.stringify({query:'query { SiteStatistics { users { total } } }'})
  }, (response, body) => response.ok && /data|errors/i.test(body));
  await probe('AllAnime API reachable', 'https://api.allanime.day/api', {
    method:'POST', headers:{'Content-Type':'application/json','Referer':'https://allmanga.to'},
    body:JSON.stringify({query:'query { __typename }'})
  }, response => response.ok);
  if (LOCAL.includes('localhost') || LOCAL.includes('127.0.0.1')) {
    await probe('Local manga API route', LOCAL.replace(/\/$/,'') + '/api/manga/search/attack%20on%20titan/1', {}, response => response.status < 500);
    await probe('Local AllAnime API route', LOCAL.replace(/\/$/,'') + '/api/allanime/shows', {
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'One Piece'})
    }, response => response.status < 500);
  }
  say('INFO', 'Reachability checks do not prove login, OTP, streaming or provider reliability end-to-end.');
}
async function logs() {
  section('RECENT CONSOLE LOGS');
  const combined = serverLogs.concat(previewLogs);
  if (!combined.length) { say('INFO','No managed server logs yet. Start one with /dev start or /preview.'); return; }
  for (const line of combined.slice(-80)) console.log('  ' + line);
}
async function gitCommand(subcommand) {
  if (!projectRequired()) return;
  const args = {
    status:['status','--short','--branch'],
    diff:['diff','--'],
    log:['log','-12','--oneline','--decorate'],
    branch:['branch','--show-current'],
    remotes:['remote','-v']
  }[subcommand];
  if (!args) { say('WARN','Usage: /git status|diff|log|branch|remotes|pull'); return; }
  await run('git', args, 'Git ' + subcommand);
}
async function gitPull() {
  if (!projectRequired()) return;
  const answer = (await rl.question('Pull origin/main and integrate remote changes? [y/N] ')).trim().toLowerCase();
  if (answer !== 'y' && answer !== 'yes') { say('INFO','Cancelled.'); return; }
  await run('git',['pull','origin','main'],'Git pull origin/main');
}
async function findFiles(term) {
  if (!projectRequired()) return;
  if (!term) { say('WARN','Usage: /search <text>'); return; }
  const ignored = new Set(['node_modules','.git','dist','release','coverage','.next']);
  const matches = [];
  const needle = term.toLowerCase();
  function walk(dir) {
    if (matches.length >= 50) return;
    let entries = [];
    try { entries = readdirSync(dir, {withFileTypes:true}); } catch { return; }
    for (const entry of entries) {
      if (matches.length >= 50) return;
      if (entry.name.startsWith('.') && entry.name !== '.env.example') continue;
      if (ignored.has(entry.name)) continue;
      const full = join(dir,entry.name);
      if (entry.isDirectory()) walk(full);
      else if (statSafe(full) && statSafe(full).size < 1_000_000 && !['.png','.jpg','.jpeg','.webp','.gif','.ico','.woff','.woff2','.mp4','.zip','.pdf'].includes(extname(full).toLowerCase())) {
        try {
          const lines = readFileSync(full,'utf8').split(/\r?\n/);
          lines.forEach((line,index) => { if (line.toLowerCase().includes(needle) && matches.length < 50) matches.push(relative(ROOT,full) + ':' + (index+1) + ': ' + line.trim().slice(0,180)); });
        } catch {}
      }
    }
  }
  walk(ROOT);
  section('SEARCH RESULTS');
  if (!matches.length) say('INFO','No matches found.');
  else matches.forEach(match => console.log('  ' + match));
  if (matches.length === 50) say('INFO','Showing first 50 matches.');
}
function statSafe(path) { try { return statSync(path); } catch { return null; } }
async function openPath(target) {
  if (!target) { say('WARN','Usage: /open <relative-file-or-folder>'); return; }
  const full = resolve(ROOT,target);
  if (!full.startsWith(resolve(ROOT) + (platform()==='win32' ? '\\' : '/')) && full !== resolve(ROOT)) {
    say('FAIL','Path must stay inside the linked project folder.'); return;
  }
  if (!existsSync(full)) { say('FAIL','Path not found: ' + full); return; }
  let command,args;
  if (platform()==='win32') { command='cmd'; args=['/c','start','',full]; }
  else if (platform()==='darwin') { command='open'; args=[full]; }
  else { command='xdg-open'; args=[full]; }
  const child=spawn(command,args,{detached:true,stdio:'ignore'}); child.unref();
  say('PASS','Opened ' + full);
}
async function backup() {
  if (!projectRequired()) return;
  const stamp = new Date().toISOString().replace(/[:.]/g,'-');
  const destination = resolve(ROOT, '..', 'animevault-backup-' + stamp + '.tar.gz');
  const args = ['-czf',destination,'--exclude=.git','--exclude=node_modules','--exclude=dist','--exclude=release','--exclude=coverage','--exclude=.env.local','.'];
  const result = await run('tar',args,'Create project backup (secrets and generated folders excluded)');
  if (result.ok) say('PASS','Backup created: ' + destination);
}
async function deps() {
  if (!projectRequired()) return;
  const pkg=packageData();
  say(existsSync(resolve(ROOT,'node_modules'))?'PASS':'WARN','node_modules ' + (existsSync(resolve(ROOT,'node_modules'))?'present':'missing'));
  say(existsSync(resolve(ROOT,'package-lock.json'))?'PASS':'WARN','package-lock.json ' + (existsSync(resolve(ROOT,'package-lock.json'))?'present':'missing'));
  if (pkg) {
    say('INFO','Declared dependencies: ' + Object.keys(pkg.dependencies||{}).length);
    say('INFO','Declared dev dependencies: ' + Object.keys(pkg.devDependencies||{}).length);
  }
  if (!existsSync(resolve(ROOT,'node_modules'))) say('INFO','Run /deps install to install dependencies.');
}
async function configCommand(args) {
  const cfg=readConfig();
  if (!args.length || args[0]==='show') {
    section('CONSOLE CONFIGURATION');
    console.log(JSON.stringify({projectRoot:cfg.projectRoot||null,siteUrl:SITE,localUrl:LOCAL,configPath:CONFIG_PATH,historyPath:HISTORY_PATH},null,2));
    return;
  }
  if (args[0]==='project' && args[1]==='clear') {
    saveConfig({projectRoot:null}); ROOT=process.cwd();
    say('PASS','Saved project link cleared. Restart or use /project link to choose another folder.'); return;
  }
  say('WARN','Usage: /config show | /config project clear');
}
async function releaseCheck() {
  if (!projectRequired()) return;
  const pkg=packageData();
  section('RELEASE READINESS');
  say(pkg?.version?'PASS':'FAIL','package version ' + (pkg?.version||'missing'));
  say(existsSync(resolve(ROOT,'package-lock.json'))?'PASS':'WARN','lockfile');
  say(existsSync(resolve(ROOT,'node_modules'))?'PASS':'WARN','dependencies installed');
  say(existsSync(resolve(ROOT,'dist','index.html'))?'PASS':'WARN','dist/index.html production artifact');
  await run('git',['status','--short','--branch'],'Working tree');
  say('INFO','This is a local checklist only; it does not publish a release.');
}
async function deployStatus() {
  if (!projectRequired()) return;
  section('DEPLOYMENT CONFIGURATION');
  const pkg=packageData();
  say(pkg?.scripts?.deploy?'INFO':'WARN','Deploy script: ' + (pkg?.scripts?.deploy || 'not configured'));
  say(existsSync(resolve(ROOT,'.github','workflows'))?'PASS':'WARN','.github/workflows directory');
  say(existsSync(resolve(ROOT,'dist','index.html'))?'PASS':'WARN','Production build artifact');
  say('INFO','No deployment is triggered by this command.');
}
async function tasks() {
  section('MANAGED TASKS');
  say(server && server.exitCode===null?'PASS':'INFO','Development server: ' + (server && server.exitCode===null ? 'running (PID '+server.pid+')' : 'stopped'));
  say(previewServer && previewServer.exitCode===null?'PASS':'INFO','Preview server: ' + (previewServer && previewServer.exitCode===null ? 'running (PID '+previewServer.pid+')' : 'stopped'));
  if (lastTask) say('INFO','Last command: ' + lastTask.label + ' at ' + lastTask.startedAt + ' (PID ' + lastTask.pid + ')');
}
async function history() {
  section('COMMAND HISTORY');
  const items = rl.history.slice(0,40).reverse();
  if (!items.length) say('INFO','No commands recorded this session.');
  else items.forEach((item,index)=>console.log('  ' + String(index+1).padStart(2,' ') + '  ' + item));
}
async function help() {
  section('COMMAND REFERENCE');
  const groups = [
    ['CORE','/help  /clear  /menu  /about  /history  /exit'],
    ['PROJECT','/project link|show|clear  /status  /doctor'],
    ['DEVELOPMENT','/dev start|stop  /preview  /preview stop  /build  /test'],
    ['DIAGNOSTICS','/logs  /api check  /env  /env setup  /deps  /deps install  /ports'],
    ['GIT & RELEASE','/git status|diff|log|branch|remotes|pull  /release check  /deploy status'],
    ['FILES & UTILITIES','/search <text>  /open <path>  /backup  /tasks  /config show'],
    ['WEB','/site  /site local  /update']
  ];
  for (const [title,commands] of groups) { console.log('\n  ' + paint(C.pink + C.bold,title)); console.log('  ' + commands); }
  console.log('\n  Tip: commands are case-insensitive. Press Tab for command suggestions.');
  console.log('  Safety: pull asks for confirmation; this console does not auto-commit or auto-deploy.');
}
async function execute(line) {
  const trimmed=line.trim();
  if (!trimmed) return;
  const parts=trimmed.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g)||[];
  const tokens=parts.map(item=>item.replace(/^['"]|['"]$/g,''));
  let command=tokens.shift().toLowerCase();
  if (!command.startsWith('/')) { say('WARN','Commands start with /. Try /help.'); return; }
  command=command.slice(1);
  const args=tokens;
  const sub=(args[0]||'').toLowerCase();
  if (command==='help'||command==='?') await help();
  else if (command==='clear'||command==='cls') console.clear();
  else if (command==='menu') { banner(); await help(); }
  else if (command==='about') { section('ABOUT'); console.log('  AnimeVault Terminal v'+VERSION+'\n  Developer console for animevaultofficial/animevaultofficial.github.io\n  '+REPO_URL); }
  else if (command==='exit'||command==='quit') quitting=true;
  else if (command==='history') await history();
  else if (command==='status') await status();
  else if (command==='doctor') await doctor();
  else if (command==='project') {
    if (sub==='link') await linkProject();
    else if (sub==='show'||!sub) say('INFO','Linked project: '+(isProjectRoot(ROOT)?ROOT:'none'));
    else if (sub==='clear') { saveConfig({projectRoot:null}); say('PASS','Saved project link cleared. The current session keeps its active folder; restart to detach fully.'); }
    else say('WARN','Usage: /project link|show|clear');
  }
  else if (command==='dev') {
    if (!projectRequired()) return;
    if (sub==='start') {
      if (!existsSync(resolve(ROOT,'node_modules'))) { say('WARN','Dependencies missing. Run /deps install first.'); return; }
      spawnManaged('npm',['run','dev'],'development server',serverLogs,LOCAL);
    } else if (sub==='stop') await stopManaged('dev');
    else say('WARN','Usage: /dev start|stop');
  }
  else if (command==='preview') {
    if (sub==='stop') await stopManaged('preview');
    else {
      if (!projectRequired()) return;
      if (!existsSync(resolve(ROOT,'dist','index.html'))) { say('WARN','No production build found. Run /build first.'); return; }
      spawnManaged('npm',['run','preview'],'preview server',previewLogs,LOCAL.replace(':5173',':4173'));
    }
  }
  else if (command==='build') { if (projectRequired()) await run('npm',['run','build'],'Production build'); }
  else if (command==='test') { if (projectRequired()) await run('npm',['test'],'Unit tests'); }
  else if (command==='logs') await logs();
  else if (command==='api'&&sub==='check') await apiCheck();
  else if (command==='env') { if (sub==='setup') await envSetup(); else if (projectRequired()) envStatus(); }
  else if (command==='deps') {
    if (!projectRequired()) return;
    if (sub==='install') {
      const confirm=(await rl.question('Run npm install in the linked project? [y/N] ')).trim().toLowerCase();
      if (confirm==='y'||confirm==='yes') await run('npm',['install'],'Install dependencies');
      else say('INFO','Cancelled.');
    } else await deps();
  }
  else if (command==='git') { if (sub==='pull') await gitPull(); else await gitCommand(sub||'status'); }
  else if (command==='release'&&sub==='check') await releaseCheck();
  else if (command==='deploy'&&sub==='status') await deployStatus();
  else if (command==='search') await findFiles(args.join(' '));
  else if (command==='open') await openPath(args.join(' '));
  else if (command==='backup') await backup();
  else if (command==='tasks') await tasks();
  else if (command==='config') await configCommand(args);
  else if (command==='site') { if (sub==='local') await openBrowser(LOCAL); else await openBrowser(SITE); }
  else if (command==='ports') {
    section('COMMON DEVELOPMENT PORTS');
    for (const port of [4173,5173,8787,3000,8080]) {
      const url='http://127.0.0.1:'+port;
      try { const response=await fetch(url,{signal:AbortSignal.timeout(1200)}); say('PASS',port+' responds with HTTP '+response.status+' ('+url+')'); }
      catch { say('INFO',port+' not responding ('+url+')'); }
    }
  }
  else if (command==='update') {
    section('UPDATING THE CONSOLE');
    console.log('  Re-run the standalone installer to fetch the latest version:');
    console.log('  irm https://raw.githubusercontent.com/animevaultofficial/animevaultofficial.github.io/main/tools/animevault-developer-admin-console/install.ps1 | iex');
    say('INFO','The console does not self-replace while running.');
  }
  else say('WARN','Unknown command: /'+command+'. Try /help.');
}
const commandNames = [
  '/help','/clear','/menu','/about','/history','/exit','/status','/doctor',
  '/project','/project link','/project show','/project clear','/dev','/dev start','/dev stop',
  '/preview','/preview stop','/build','/test','/logs','/api check','/env','/env setup',
  '/deps','/deps install','/git','/git status','/git diff','/git log','/git branch','/git remotes','/git pull',
  '/release check','/deploy status','/search','/open','/backup','/tasks','/config show','/ports','/site','/site local','/update'
];

async function shutdown() {
  if (server && server.exitCode===null) await stopManaged('dev');
  if (previewServer && previewServer.exitCode===null) await stopManaged('preview');
  try {
    mkdirSync(CONFIG_DIR,{recursive:true});
    const entries=rl.history.slice(0,200).reverse();
    if (entries.length) appendFileSync(HISTORY_PATH,entries.join('\n')+'\n','utf8');
  } catch {}
  rl.close();
  console.log('\nAnimeVault Terminal closed. See you next time.\n');
}
async function main() {
  banner();
  while (!quitting) {
    let line;
    try { line=await rl.question(paint(C.pink,'av')+paint(C.dim,' > ')); }
    catch { break; }
    try { await execute(line); }
    catch (error) { say('FAIL',error?.stack || String(error)); }
  }
  await shutdown();
}
process.on('SIGINT',()=>{ quitting=true; rl.close(); });
main().catch(error=>{ console.error(error); process.exitCode=1; });
