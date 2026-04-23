const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  pickWorkspace: () => ipcRenderer.invoke('smw:pickWorkspace'),
  readWorkspaceFile: (relPath) => ipcRenderer.invoke('smw:readFile', relPath),
  writeWorkspaceFile: (relPath, text) => ipcRenderer.invoke('smw:writeFile', relPath, text),
  openMarkdownInWorkspace: () => ipcRenderer.invoke('smw:openMarkdownInWorkspace'),
  saveFileAs: (curRelPath, text) => ipcRenderer.invoke('smw:saveFileAs', curRelPath, text),
  openBlockEditor: (relPath, blockId) => ipcRenderer.send('smw:openBlock', relPath, blockId),
  openBlockCanvas: (relPath, blockId) => ipcRenderer.send('smw:openBlockCanvas', relPath, blockId),
});
