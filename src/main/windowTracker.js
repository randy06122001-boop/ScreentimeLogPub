const activeWin = require('active-win');

class WindowTracker {
  constructor() {
    this.currentWindow = null;
    this.currentApp = null;
    this.updateInterval = 1000; // 1 second
    this.trackingInterval = null;
  }

  start() {
    if (this.trackingInterval) {
      return;
    }

    // Track every second
    this.trackingInterval = setInterval(() => this.update(), this.updateInterval);
  }

  stop() {
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
  }

  async update() {
    try {
      const activeWindow = await activeWin();
      
      if (activeWindow) {
        this.currentApp = {
          name: activeWindow.owner.name,
          path: activeWindow.owner.path,
          id: activeWindow.owner.bundleId || activeWindow.owner.name
        };

        this.currentWindow = {
          title: activeWindow.title,
          id: activeWindow.id,
          app: this.currentApp
        };
      }
    } catch (error) {
      console.error('Failed to get active window:', error);
    }
  }

  getCurrentWindow() {
    return this.currentWindow;
  }

  getCurrentApp() {
    return this.currentApp;
  }

  getActiveInfo() {
    return {
      app: this.currentApp,
      window: this.currentWindow,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = WindowTracker;
