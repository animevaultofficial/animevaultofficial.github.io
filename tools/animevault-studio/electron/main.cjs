const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');

let mainWindow;
let workspaceRoot = process.env.ANIMEVAULT_STUDIO_WORKSPACE ? path.resolve(process.env.ANIMEVAULT_STUDIO_WORKSPACE) : null;
const ignored = new Set(['.git', 'node_modules', 'dist', 'release', '.next', '.vite', 'coverage']);

function withinRoot(root, target) {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative));
}
async function resolveWorkspacePath(relativePath) {
  if (!workspaceRoot) throw new Error('Choose a workspace folder first.');
  if (typeof relativePath !== 'string' || !relativePath.trim()) throw new Error('A file path is required.');
  const root = await fs.realpath(workspaceRoot);
  const target = path.resolve(root, relativePath);
  if (!withinRoot(root, target)) throw new Error('That path is outside the selected workspace.');
  const actualTarget = await fs.realpath(target);
  if (!withinRoot(root, actualTarget)) throw new Error('Symbolic links outside the workspace are not allowed.');
  return actualTarget;
}
function assertTrustedSender(event) {
  if (!mainWindow || event.sender !== mainWindow.webContents) throw new Error('Untrusted IPC sender.');
  const url = event.senderFrame?.url || '';
  const trusted = url.startsWith('file://') || (!app.isPackaged && url.startsWith('http://127.0.0.1:5173/'));
  if (!trusted) throw new Error('IPC is only available to the local Studio interface.');
}
function handle(channel, callback) {
  ipcMain.handle(channel, (event, ...args) => {
    assertTrustedSender(event);
    return callback(event, ...args);
  });
}
async function walk(dir, depth = 0) {
  if (depth > 8) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  entries.sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name));
  const result = [];
  for (const entry of entries) {
    if (ignored.has(entry.name) || entry.name.startsWith('.DS_Store')) continue;
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(workspaceRoot, fullPath).split(path.sep).join('/');
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) result.push({ name: entry.name, path: relativePath, type: 'directory', children: await walk(fullPath, depth + 1) });
    else if (entry.isFile()) result.push({ name: entry.name, path: relativePath, type: 'file' });
  }
  return result;
}
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440, height: 920, minWidth: 960, minHeight: 640,
    backgroundColor: '#101014',
    title: 'AnimeVault Studio',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowed = !app.isPackaged && url.startsWith('http://127.0.0.1:5173/');
    if (!allowed && !url.startsWith('file://')) event.preventDefault();
  });
  if (!app.isPackaged && process.env.NODE_ENV !== 'production') mainWindow.loadURL('http://127.0.0.1:5173');
  else mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}
app.whenReady().then(() => {
  handle('studio:info', () => ({ name: 'AnimeVault Studio', version: app.getVersion(), platform: process.platform }));
  handle('workspace:get', () => ({ root: workspaceRoot }));
  handle('workspace:choose', async () => {
    const result = await dialog.showOpenDialog(mainWindow, { title: 'Open project folder', properties: ['openDirectory', 'createDirectory'] });
    if (result.canceled || !result.filePaths[0]) return { canceled: true, root: workspaceRoot };
    workspaceRoot = path.resolve(result.filePaths[0]);
    return { canceled: false, root: workspaceRoot };
  });
  handle('workspace:list', async () => {
    if (!workspaceRoot) return [];
    try { return await walk(workspaceRoot); } catch (error) { throw new Error('Could not read workspace: ' + error.message); }
  });
  handle('file:read', async (_event, relativePath) => {
    const target = await resolveWorkspacePath(relativePath);
    const stat = await fs.stat(target);
    if (!stat.isFile() || stat.size > 2 * 1024 * 1024) throw new Error('Only files up to 2 MB can be opened in this first version.');
    return await fs.readFile(target, 'utf8');
  });
  handle('file:save', async (_event, relativePath, content) => {
    const target = await resolveWorkspacePath(relativePath);
    if (typeof content !== 'string' || Buffer.byteLength(content, 'utf8') > 2 * 1024 * 1024) throw new Error('File content is invalid or exceeds 2 MB.');
    const stat = await fs.stat(target);
    if (!stat.isFile()) throw new Error('Only existing files can be saved in Phase 1.');
    await fs.writeFile(target, content, 'utf8');
    return { saved: true, path: relativePath };
  });
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
