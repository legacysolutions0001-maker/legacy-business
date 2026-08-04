'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Platform info
  platform: process.platform,
  isElectron: true,
  appName: 'Legacy Business Owner',

  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),

  // File system
  selectFolder: (opts) => ipcRenderer.invoke('select-folder', opts),
  openBackupFolder: () => ipcRenderer.invoke('open-backup-folder'),

  // Backup
  getBackupList: () => ipcRenderer.invoke('get-backup-list'),
  showNotification: (opts) => ipcRenderer.invoke('show-notification', opts),

  // Events from main
  onBackupComplete: (cb) => ipcRenderer.on('backup-complete', (_, data) => cb(data)),
  onBackupScheduled: (cb) => ipcRenderer.on('backup-scheduled', (_, data) => cb(data)),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
});
