class PomodoroTimer {
  constructor() {
    this.workDuration = 25 * 60; // 25 minutes in seconds
    this.shortBreakDuration = 5 * 60; // 5 minutes
    this.longBreakDuration = 15 * 60; // 15 minutes
    this.sessionsBeforeLongBreak = 4;
    
    this.timeRemaining = this.workDuration;
    this.isRunning = false;
    this.isPaused = false;
    this.currentPhase = 'work'; // 'work', 'shortBreak', 'longBreak'
    this.sessionsCompleted = 0;
    this.totalFocusTime = 0;
    this.timerInterval = null;
    
    this.loadSettings();
  }

  loadSettings() {
    // Settings will be loaded from database via main process
  }

  updateSettings(settings) {
    if (settings.pomodoroWorkDuration) {
      this.workDuration = settings.pomodoroWorkDuration * 60;
    }
    if (settings.pomodoroShortBreakDuration) {
      this.shortBreakDuration = settings.pomodoroShortBreakDuration * 60;
    }
    if (settings.pomodoroLongBreakDuration) {
      this.longBreakDuration = settings.pomodoroLongBreakDuration * 60;
    }
    if (settings.pomodoroSessionsBeforeLongBreak) {
      this.sessionsBeforeLongBreak = settings.pomodoroSessionsBeforeLongBreak;
    }
    
    // Update time remaining if not running
    if (!this.isRunning && !this.isPaused) {
      this.timeRemaining = this.workDuration;
    }
  }

  start() {
    if (this.isRunning) return this.getState();
    
    this.isRunning = true;
    this.isPaused = false;
    
    this.timerInterval = setInterval(() => {
      this.tick();
    }, 1000);
    
    return this.getState();
  }

  pause() {
    if (!this.isRunning) return this.getState();
    
    this.isRunning = false;
    this.isPaused = true;
    
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    
    return this.getState();
  }

  reset() {
    this.isRunning = false;
    this.isPaused = false;
    
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    
    this.currentPhase = 'work';
    this.timeRemaining = this.workDuration;
    
    return this.getState();
  }

  skip() {
    this.completePhase();
    return this.getState();
  }

  tick() {
    if (this.timeRemaining > 0) {
      this.timeRemaining--;
      
      if (this.currentPhase === 'work') {
        this.totalFocusTime++;
      }
    } else {
      this.completePhase();
    }
  }

  completePhase() {
    if (this.currentPhase === 'work') {
      this.sessionsCompleted++;
      
      // Determine next break type
      if (this.sessionsCompleted % this.sessionsBeforeLongBreak === 0) {
        this.currentPhase = 'longBreak';
        this.timeRemaining = this.longBreakDuration;
      } else {
        this.currentPhase = 'shortBreak';
        this.timeRemaining = this.shortBreakDuration;
      }
    } else {
      // Break is over, start new work session
      this.currentPhase = 'work';
      this.timeRemaining = this.workDuration;
    }
    
    // Auto-start next phase (optional - can be configured)
    // For now, we'll auto-start
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = setInterval(() => this.tick(), 1000);
    }
  }

  getState() {
    return {
      timeRemaining: this.timeRemaining,
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      currentPhase: this.currentPhase,
      sessionsCompleted: this.sessionsCompleted,
      totalFocusTime: this.totalFocusTime,
      workDuration: this.workDuration,
      shortBreakDuration: this.shortBreakDuration,
      longBreakDuration: this.longBreakDuration,
      sessionsBeforeLongBreak: this.sessionsBeforeLongBreak
    };
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  stop() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.isRunning = false;
    this.isPaused = false;
  }
}

module.exports = PomodoroTimer;
