const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  pickWorkspace: () => ipcRenderer.invoke('mvwb:pickWorkspace'),
  readWorkspaceFile: (relPath) => ipcRenderer.invoke('mvwb:readFile', relPath),
  writeWorkspaceFile: (relPath, text) => ipcRenderer.invoke('mvwb:writeFile', relPath, text),
  openMarkdownInWorkspace: () => ipcRenderer.invoke('mvwb:openMarkdownInWorkspace'),
  saveFileAs: (curRelPath, text) => ipcRenderer.invoke('mvwb:saveFileAs', curRelPath, text),
  openBlockEditor: (relPath, blockId) => ipcRenderer.send('mvwb:openBlock', relPath, blockId),
  openBlockCanvas: (relPath, blockId) => ipcRenderer.send('mvwb:openBlockCanvas', relPath, blockId),
});
