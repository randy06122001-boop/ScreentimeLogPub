const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const AutoLaunch = require('auto-launch');
const Store = require('electron-store');
const Database = require('./database');
const ActivityMonitor = require('./activityMonitor');
const ExportService = require('./exportService');

let mainWindow;
let tray;
let activityMonitor;
let database;
let exportService;
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
    return database.getSettings();
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
    return database.clearOldData(olderThan);
  });

  ipcMain.handle('get-stats', () => {
    return database.getOverallStats();
  });
}

app.whenReady().then(() => {
  database = new Database(app.getPath('userData'));
  exportService = new ExportService(app.getPath('documents'));
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
