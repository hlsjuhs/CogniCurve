const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveImage: (dataUrl) => ipcRenderer.invoke('save-image', { dataUrl }),
  saveFile: (filename, content) => ipcRenderer.invoke('save-file', { filename, content }),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  openPath: (path) => ipcRenderer.invoke('open-path', path)
});