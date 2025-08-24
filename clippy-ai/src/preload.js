const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  sendMessage: (message) => ipcRenderer.invoke('send-message', message),
  checkLLMStatus: () => ipcRenderer.invoke('check-llm-status'),
  onPartialResponse: (callback) => ipcRenderer.on('partial-response', (event, token) => callback(token)),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window')
});