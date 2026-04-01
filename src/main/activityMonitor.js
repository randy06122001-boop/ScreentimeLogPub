// Try to load optional dependencies
let desktopIdle = null;
try {
  desktopIdle = require('desktop-idle');
} catch (e) {
  console.log('desktop-idle not available, using fallback');
}

let activeWin = null;
try {
  activeWin = require('active-win');
} catch (e) {
  console.log('active-win not available, window tracking disabled');
}

class ActivityMonitor {
  constructor(database, store) {
    this.database = database;
    this.store = store;
    this.currentSessionId = null;
    this.monitoringInterval = null;
    this.lastActivityTime = Date.now();
    this.isPaused = false;
    this.idleThreshold = 300; // 5 minutes default
    this.updateInterval = 1000; // 1 second
    this.settings = {};
    this.isRunning = false;
    
    // App tracking
    this.currentAppName = '';
    this.currentWindowTitle = '';
    this.lastAppCheck = 0;
    this.appCheckInterval = 2000; // Check active window every 2 seconds
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
    this.isRunning = true;
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
      const settingsList = this.database.getSettings();
      const settingsObj = {};
      if (settingsList) {
        settingsList.forEach(setting => {
          let value = setting.value;
          if (value === 'true') value = true;
          else if (value === 'false') value = false;
          else if (!isNaN(value) && value !== '') value = Number(value);
          settingsObj[setting.key] = value;
        });
      }
      this.settings = settingsObj;
      this.idleThreshold = settingsObj.idleThresholdSeconds || 300;
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  async tick() {
    if (!this.isRunning || this.isPaused) {
      return;
    }

    try {
      let idleTime = 0;
      if (desktopIdle) {
        idleTime = desktopIdle.getIdleTime();
      }

      // Get active window info periodically
      const now = Date.now();
      if (activeWin && (now - this.lastAppCheck > this.appCheckInterval)) {
        try {
          const activeWindow = await activeWin();
          if (activeWindow) {
            const newAppName = activeWindow.owner.name || '';
            const newWindowTitle = activeWindow.title || '';
            
            // Check if window changed
            if (newAppName !== this.currentAppName) {
              // End current session and start new one with new app info
              if (this.currentSessionId) {
                this.endCurrentSession();
              }
              
              this.currentAppName = newAppName;
              this.currentWindowTitle = newWindowTitle;
              this.startNewSession();
            } else if (newWindowTitle !== this.currentWindowTitle) {
              this.currentWindowTitle = newWindowTitle;
            }
          }
        } catch (err) {
          // Fallback if active-win fails
        }
        this.lastAppCheck = now;
      }

      // Update session duration
      if (this.currentSessionId) {
        const session = this.database.getSessionById(this.currentSessionId);
        if (session) {
          const startTime = new Date(session.start_time);
          const duration = Math.floor((now - startTime.getTime()) / 1000);
          this.database.updateSession(this.currentSessionId, duration);
        }
      }

      // Check if user has been idle beyond threshold
      if (idleTime > this.idleThreshold) {
        if (this.currentSessionId) {
          this.endCurrentSession();
        }
      } else if (!this.currentSessionId) {
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
      
      console.log('Started session:', session.id, 'App:', this.currentAppName || 'Unknown');
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
      
      // Update app usage with final duration
      if (result && this.currentAppName) {
        const session = this.database.getSessionById(this.currentSessionId);
        if (session) {
          const date = session.start_time.split('T')[0];
          const category = this.database.categorizeApp(this.currentAppName);
          this.database.recordAppUsage(date, this.currentAppName, this.currentWindowTitle, category, result.durationSeconds);
        }
      }
      
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
          isActive: true,
          appName: this.currentAppName,
          windowTitle: this.currentWindowTitle
        };
      }
    } catch (error) {
      console.error('Failed to get current session:', error);
    }

    return null;
  }
}

module.exports = ActivityMonitor;