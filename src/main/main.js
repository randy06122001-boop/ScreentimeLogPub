const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const AutoLaunch = require('auto-launch');
const Store = require('electron-store');
const Database = require('./database');
const ActivityMonitor = require('./activityMonitor');
const ExportService = require('./exportService');
const PomodoroTimer = require('./pomodoro');

let mainWindow;
let tray;
let activityMonitor;
let database;
let exportService;
let pomodoroTimer;
const store = new Store();

const autoLauncher = new AutoLaunch({
  name: 'Screen Time Tracker',
  path: app.getPath('exe'),
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '../../assets/icon.png'),
    show: false,
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, '../../assets/icon.png'));
  tray = new Tray(icon.resize({ width: 16, height: 16 }));

  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Open Dashboard', 
      click: () => mainWindow.show() 
    },
    { 
      label: 'Pause Tracking', 
      type: 'checkbox',
      checked: false,
      click: (menuItem) => {
        if (menuItem.checked) {
          activityMonitor.pause();
        } else {
          activityMonitor.resume();
        }
      }
    },
    { type: 'separator' },
    { 
      label: 'Quit', 
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Screen Time Tracker');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => mainWindow.show());
}

function setupIpcHandlers() {
  // Settings handlers
  ipcMain.handle('get-settings', () => {
    const settings = database.getSettings();
    const settingsObj = {};
    settings.forEach(setting => {
      let value = setting.value;
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      else if (!isNaN(value) && value !== '') value = Number(value);
      settingsObj[setting.key] = value;
    });
    return settingsObj;
  });

  ipcMain.handle('save-settings', (event, settings) => {
    database.saveSettings(settings);
    
    if (settings.autoLaunch) {
      autoLauncher.enable();
    } else {
      autoLauncher.disable();
    }
    
    activityMonitor.updateSettings(settings);
    return { success: true };
  });

  // Session data handlers
  ipcMain.handle('get-sessions', (event, { startDate, endDate }) => {
    return database.getSessions(startDate, endDate);
  });

  ipcMain.handle('get-daily-summary', (event, date) => {
    return database.getDailySummary(date);
  });

  ipcMain.handle('get-weekly-summary', (event, startDate) => {
    return database.getWeeklySummary(startDate);
  });

  ipcMain.handle('get-monthly-summary', (event, year, month) => {
    return database.getMonthlySummary(year, month);
  });

  ipcMain.handle('get-current-session', () => {
    return activityMonitor.getCurrentSession();
  });

  // Export handlers
  ipcMain.handle('export-pdf', (event, { startDate, endDate, filename }) => {
    const sessions = database.getSessions(startDate, endDate);
    const summary = database.getSummaryForRange(startDate, endDate);
    return exportService.exportToPDF(sessions, summary, filename);
  });

  ipcMain.handle('export-csv', (event, { startDate, endDate, filename }) => {
    const sessions = database.getSessions(startDate, endDate);
    return exportService.exportToCSV(sessions, filename);
  });

  // Data management
  ipcMain.handle('clear-data', (event, { olderThan }) => {
    const result = database.clearOldData(olderThan);
    return result;
  });

  ipcMain.handle('clear-all-data', () => {
    const result = database.clearAllData();
    return result;
  });

  ipcMain.handle('get-stats', () => {
    return database.getOverallStats();
  });

  // Pomodoro handlers
  ipcMain.handle('pomodoro-start', () => {
    if (!pomodoroTimer) {
      pomodoroTimer = new PomodoroTimer();
    }
    const settings = database.getSettings();
    const settingsObj = {};
    settings.forEach(setting => {
      let value = setting.value;
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      else if (!isNaN(value) && value !== '') value = Number(value);
      settingsObj[setting.key] = value;
    });
    pomodoroTimer.updateSettings(settingsObj);
    return pomodoroTimer.start();
  });

  ipcMain.handle('pomodoro-pause', () => {
    if (!pomodoroTimer) {
      pomodoroTimer = new PomodoroTimer();
    }
    return pomodoroTimer.pause();
  });

  ipcMain.handle('pomodoro-reset', () => {
    if (!pomodoroTimer) {
      pomodoroTimer = new PomodoroTimer();
    }
    return pomodoroTimer.reset();
  });

  ipcMain.handle('pomodoro-skip', () => {
    if (!pomodoroTimer) {
      pomodoroTimer = new PomodoroTimer();
    }
    return pomodoroTimer.skip();
  });

  ipcMain.handle('pomodoro-get-state', () => {
    if (!pomodoroTimer) {
      pomodoroTimer = new PomodoroTimer();
    }
    return pomodoroTimer.getState();
  });

  ipcMain.handle('pomodoro-update-settings', (event, settings) => {
    if (!pomodoroTimer) {
      pomodoroTimer = new PomodoroTimer();
    }
    pomodoroTimer.updateSettings(settings);
    return { success: true };
  });

  // App usage handlers
  ipcMain.handle('get-app-usage-by-date', (event, date) => {
    return database.getAppUsageByDate(date);
  });

  ipcMain.handle('get-app-usage-by-category', (event, { startDate, endDate }) => {
    return database.getAppUsageByCategory(startDate, endDate);
  });

  ipcMain.handle('get-top-apps', (event, { startDate, endDate, limit }) => {
    return database.getTopApps(startDate, endDate, limit || 10);
  });

  // Category handlers
  ipcMain.handle('get-all-categories', () => {
    return database.getAllCategories();
  });

  ipcMain.handle('add-category', (event, { name, color, applications }) => {
    database.addCategory(name, color, applications);
    return { success: true };
  });

  ipcMain.handle('update-category', (event, { categoryId, name, color, applications }) => {
    database.updateCategory(categoryId, name, color, applications);
    return { success: true };
  });

  ipcMain.handle('delete-category', (event, categoryId) => {
    database.deleteCategory(categoryId);
    return { success: true };
  });
}

app.whenReady().then(() => {
  database = new Database(app.getPath('userData'));
  exportService = new ExportService(app.getPath('documents'));
  pomodoroTimer = new PomodoroTimer();
  activityMonitor = new ActivityMonitor(database, store);

  createWindow();
  createTray();
  setupIpcHandlers();

  activityMonitor.start();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Keep running in background
  }
});

app.on('before-quit', () => {
  activityMonitor.stop();
  database.close();
});
