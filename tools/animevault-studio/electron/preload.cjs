const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('studio', Object.freeze({
  getAppInfo: () => ipcRenderer.invoke('studio:info'),
  getWorkspace: () => ipcRenderer.invoke('workspace:get'),
  chooseWorkspace: () => ipcRenderer.invoke('workspace:choose'),
  listFiles: () => ipcRenderer.invoke('workspace:list'),
  readFile: (relativePath) => ipcRenderer.invoke('file:read', relativePath),
  saveFile: (relativePath, content) => ipcRenderer.invoke('file:save', relativePath, content)
}));
