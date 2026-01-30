const { desktopIdle } = require('desktop-idle');
const WindowTracker = require('./windowTracker');

class ActivityMonitor {
  constructor(database, store) {
    this.database = database;
    this.store = store;
    this.currentSessionId = null;
    this.monitoringInterval = null;
    this.windowTracker = new WindowTracker();
    this.lastActivityTime = Date.now();
    this.lastWindowInfo = null;
    this.lastAppInfo = null;
    this.lastWindowStartTime = null;
    this.isPaused = false;
    this.idleThreshold = 300; // 5 minutes default
    this.updateInterval = 1000; // 1 second
    this.settings = {};
  }

  updateSettings(settings) {
    this.settings = { ...this.settings, ...settings };
    this.idleThreshold = settings.idleThresholdSeconds || 300;
  }

  start() {
    if (this.monitoringInterval) {
      return;
    }

    this.loadSettings();
    this.startNewSession();
    this.windowTracker.start();
    this.monitoringInterval = setInterval(() => this.tick(), this.updateInterval);
  }

  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.windowTracker.stop();

    // Log final window activity if tracking
    if (this.currentSessionId && this.lastWindowStartTime) {
      this.logWindowActivity();
    }

    if (this.currentSessionId) {
      this.endCurrentSession();
    }
  }

  pause() {
    this.isPaused = true;

    // Log window activity before pausing
    if (this.currentSessionId && this.lastWindowStartTime) {
      this.logWindowActivity();
    }

    if (this.currentSessionId) {
      this.endCurrentSession();
    }
  }

  resume() {
    this.isPaused = false;
    if (!this.currentSessionId) {
      this.startNewSession();
    }
  }

  loadSettings() {
    try {
      const settings = this.database.getSettings();
      this.settings = settings || {};
      this.idleThreshold = settings.idleThresholdSeconds || 300;
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  tick() {
    if (this.isPaused) {
      return;
    }

    const idleTime = desktopIdle.getIdleTime();
    const now = Date.now();

    // Check if user has been idle beyond threshold
    if (idleTime > this.idleThreshold * 1000) {
      // Log window activity before ending session
      if (this.currentSessionId && this.lastWindowStartTime) {
        this.logWindowActivity();
      }

      if (this.currentSessionId) {
        this.endCurrentSession();
      }
    } else if (this.currentSessionId) {
      // Update session duration
      const session = this.database.getSessionById(this.currentSessionId);
      if (session) {
        const startTime = new Date(session.start_time);
        const duration = Math.floor((now - startTime.getTime()) / 1000);
        this.database.updateSession(this.currentSessionId, duration);
      }

      // Track window activity
      this.trackWindowActivity();
    } else {
      // User came back from idle, start new session
      this.startNewSession();
    }

    this.lastActivityTime = now;
  }

  trackWindowActivity() {
    const currentWindow = this.windowTracker.getCurrentWindow();
    const currentApp = this.windowTracker.getCurrentApp();

    if (!currentApp) {
      return;
    }

    // Check if window/app changed
    const appChanged = !this.lastAppInfo || this.lastAppInfo.id !== currentApp.id;
    const windowChanged = !this.lastWindowInfo || !currentWindow || 
                         this.lastWindowInfo.id !== currentWindow.id ||
                         this.lastWindowInfo.title !== currentWindow.title;

    if (appChanged || windowChanged) {
      // Log previous window activity if we were tracking one
      if (this.lastWindowStartTime && this.lastAppInfo) {
        this.logWindowActivity();
      }

      // Start tracking new window
      this.lastAppInfo = currentApp;
      this.lastWindowInfo = currentWindow;
      this.lastWindowStartTime = Date.now();
    }
  }

  logWindowActivity() {
    if (!this.currentSessionId || !this.lastAppInfo || !this.lastWindowStartTime) {
      return;
    }

    const now = Date.now();
    const durationSeconds = Math.floor((now - this.lastWindowStartTime) / 1000);

    // Only log if duration is greater than 1 second
    if (durationSeconds > 1) {
      try {
        this.database.logWindowActivity(
          this.currentSessionId,
          this.lastAppInfo,
          this.lastWindowInfo,
          durationSeconds
        );
      } catch (error) {
        console.error('Failed to log window activity:', error);
      }
    }

    // Reset tracking
    this.lastWindowStartTime = now;
  }

  startNewSession() {
    try {
      const session = this.database.startSession();
      this.currentSessionId = session.id;
      this.lastWindowStartTime = Date.now();
      console.log('Started session:', session.id);
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  }

  endCurrentSession() {
    if (!this.currentSessionId) {
      return;
    }

    try {
      const result = this.database.endSession(this.currentSessionId);
      console.log('Ended session:', result);
      this.currentSessionId = null;
      this.lastAppInfo = null;
      this.lastWindowInfo = null;
      this.lastWindowStartTime = null;
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  }

  getCurrentSession() {
    if (!this.currentSessionId) {
      return null;
    }

    try {
      const session = this.database.getSessionById(this.currentSessionId);
      if (session) {
        const startTime = new Date(session.start_time);
        const now = Date.now();
        const duration = Math.floor((now - startTime.getTime()) / 1000);
        
        return {
          id: session.id,
          startTime: session.start_time,
          duration: duration,
          isActive: true,
          currentApp: this.lastAppInfo,
          currentWindow: this.lastWindowInfo
        };
      }
    } catch (error) {
      console.error('Failed to get current session:', error);
    }

    return null;
  }

  getCurrentWindowInfo() {
    return {
      app: this.lastAppInfo,
      window: this.lastWindowInfo
    };
  }
}

module.exports = ActivityMonitor;
