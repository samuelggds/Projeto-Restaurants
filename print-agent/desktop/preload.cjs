'use strict';

const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('kitchen', Object.freeze({
  status: () => ipcRenderer.invoke('kitchen:status'),
  printers: () => ipcRenderer.invoke('kitchen:printers'),
  pair: (code) => ipcRenderer.invoke('kitchen:pair', code),
  select: (name) => ipcRenderer.invoke('kitchen:select', name),
  test: () => ipcRenderer.invoke('kitchen:test'),
  autoStart: (enabled) => ipcRenderer.invoke('kitchen:autoStart', enabled),
  disconnect: () => ipcRenderer.invoke('kitchen:disconnect'),
  website: () => ipcRenderer.invoke('kitchen:website'),
  onChanged: (listener) => {
    const handler = () => listener();
    ipcRenderer.on('kitchen:changed', handler);
    return () => ipcRenderer.removeListener('kitchen:changed', handler);
  },
}));
