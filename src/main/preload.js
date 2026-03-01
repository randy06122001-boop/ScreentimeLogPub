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
  
  // App usage
  getAppUsageByDate: (date) => ipcRenderer.invoke('get-app-usage-by-date', date),
  getAppUsageByCategory: (startDate, endDate) => ipcRenderer.invoke('get-app-usage-by-category', { startDate, endDate }),
  getTopApps: (startDate, endDate, limit) => ipcRenderer.invoke('get-top-apps', { startDate, endDate, limit }),
  
  // Categories
  getAllCategories: () => ipcRenderer.invoke('get-all-categories'),
  addCategory: (name, color, applications) => ipcRenderer.invoke('add-category', { name, color, applications }),
  updateCategory: (categoryId, name, color, applications) => ipcRenderer.invoke('update-category', { categoryId, name, color, applications }),
  deleteCategory: (categoryId) => ipcRenderer.invoke('delete-category', categoryId),
  

  // Pomodoro Timer
  pomodoroStart: () => ipcRenderer.invoke('pomodoro-start'),
  pomodoroPause: () => ipcRenderer.invoke('pomodoro-pause'),
  pomodoroReset: () => ipcRenderer.invoke('pomodoro-reset'),
  pomodoroSkip: () => ipcRenderer.invoke('pomodoro-skip'),
  pomodoroGetState: () => ipcRenderer.invoke('pomodoro-get-state'),
  pomodoroUpdateSettings: (settings) => ipcRenderer.invoke('pomodoro-update-settings', settings),
  // Listeners
  onSessionUpdate: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('session-update', listener);
    return () => ipcRenderer.removeListener('session-update', listener);
  }
});
