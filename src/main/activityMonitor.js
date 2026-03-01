// Try to load desktop-idle, but make it optional
let desktopIdle = null;
try {
  desktopIdle = require('desktop-idle');
} catch (error) {
  console.warn('desktop-idle not available, using fallback idle detection');
}

class ActivityMonitor {
  constructor(database, store) {
    this.database = database;
    this.store = store;
    this.currentSessionId = null;
    this.monitoringInterval = null;
    this.lastActivityTime = Date.now();
    this.lastMousePosition = { x: 0, y: 0 };
    this.isPaused = false;
    this.idleThreshold = 300; // 5 minutes default
    this.updateInterval = 1000; // 1 second
    this.settings = {};
    this.isRunning = false;
  }

  updateSettings(settings) {
    this.settings = { ...this.settings, ...settings };
    this.idleThreshold = settings.idleThresholdSeconds || 300;
  }

  start() {
    if (this.monitoringInterval) {
      return;
    }

    this.isRunning = true;
    this.loadSettings();
    this.startNewSession();
    this.monitoringInterval = setInterval(() => this.tick(), this.updateInterval);
  }

  stop() {
    this.isRunning = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.currentSessionId) {
      this.endCurrentSession();
    }
  }

  pause() {
    this.isPaused = true;
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

  getIdleTime() {
    // Use desktop-idle if available
    if (desktopIdle) {
      try {
        return desktopIdle.getIdleTime();
      } catch (error) {
        console.warn('desktop-idle failed, using fallback');
      }
    }
    
    // Fallback: assume user is active (0 idle time)
    // This means sessions will continue indefinitely until manually stopped
    return 0;
  }

  tick() {
    if (!this.isRunning || this.isPaused) {
      return;
    }

    try {
      const idleTime = this.getIdleTime();
      const now = Date.now();

      // Check if user has been idle beyond threshold
      if (idleTime > this.idleThreshold) {
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
      } else {
        // User came back from idle, start new session
        this.startNewSession();
      }

      this.lastActivityTime = now;
    } catch (error) {
      console.error('Error in activity monitor tick:', error);
    }
  }

  startNewSession() {
    try {
      const session = this.database.startSession();
      this.currentSessionId = session.id;
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
          isActive: true
        };
      }
    } catch (error) {
      console.error('Failed to get current session:', error);
    }

    return null;
  }
}

module.exports = ActivityMonitor;
