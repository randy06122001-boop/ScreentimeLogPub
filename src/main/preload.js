const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  
  // Session data
  getSessions: (params) => ipcRenderer.invoke('get-sessions', params),
  getDailySummary: (date) => ipcRenderer.invoke('get-daily-summary', date),
  getWeeklySummary: (startDate) => ipcRenderer.invoke('get-weekly-summary', startDate),
  getMonthlySummary: (year, month) => ipcRenderer.invoke('get-monthly-summary', year, month),
  getCurrentSession: () => ipcRenderer.invoke('get-current-session'),
  
  // Export
  exportPDF: (params) => ipcRenderer.invoke('export-pdf', params),
  exportCSV: (params) => ipcRenderer.invoke('export-csv', params),
  
  // Data management
  clearData: (params) => ipcRenderer.invoke('clear-data', params),
  getStats: () => ipcRenderer.invoke('get-stats'),
  
  // Listeners
  onSessionUpdate: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('session-update', listener);
    return () => ipcRenderer.removeListener('session-update', listener);
  }
});
