class ScreenTimeApp {
  constructor() {
    this.currentSessionTimer = null;
    this.currentSessionTime = 0;
    this.init();
  }

  async init() {
    this.setupNavigation();
    this.setupEventListeners();
    this.setupPomodoroListeners();
    await this.loadData();
    await this.loadPomodoroSettings();
    this.startSessionTimer();
    this.startPomodoroPolling();
  }

  setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const tabId = item.dataset.tab;
        this.switchTab(tabId);
      });
    });
  }

  switchTab(tabId) {
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.tab === tabId);
    });

    // Update tabs
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.toggle('active', tab.id === `${tabId}-tab`);
    });

    // Load data for specific tabs
    if (tabId === 'sessions') {
      this.loadSessions();
    }
  }

  setupEventListeners() {
    // Sessions filter
    document.getElementById('filter-sessions').addEventListener('click', () => this.loadSessions());

    // Export buttons
    document.getElementById('export-pdf').addEventListener('click', () => this.exportPDF());
    document.getElementById('export-csv').addEventListener('click', () => this.exportCSV());

    // Clear old data
    document.getElementById('clear-old-data').addEventListener('click', () => this.clearOldData());

    // Save settings
    document.getElementById('save-settings').addEventListener('click', () => this.saveSettings());

    // Set default dates
    this.setDefaultDates();
  }

  setDefaultDates() {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startDate = thirtyDaysAgo.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];

    // Set dates for sessions filter
    document.getElementById('session-start-date').value = startDate;
    document.getElementById('session-end-date').value = endDate;

    // Set dates for export
    document.getElementById('export-start-date').value = startDate;
    document.getElementById('export-end-date').value = endDate;
  }

  async loadData() {
    await this.updateDashboard();
    await this.loadTopApps();
    await this.loadSessions();
    await this.loadSettings();
  }

  async updateDashboard() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const weekStart = this.getWeekStart(today);
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthStartStr = monthStart.toISOString().split('T')[0];

    try {
      const [dailySummary, weeklySummary, monthlySummary, stats] = await Promise.all([
        window.electronAPI.getDailySummary(todayStr),
        window.electronAPI.getWeeklySummary(weekStartStr),
        window.electronAPI.getMonthlySummary(today.getFullYear(), today.getMonth() + 1),
        window.electronAPI.getStats()
      ]);

      // Update today time
      if (dailySummary) {
        document.getElementById('today-time').textContent = this.formatDuration(dailySummary.total_seconds);
        document.getElementById('longest-session').textContent = this.formatDuration(dailySummary.longest_session_seconds);
      }

      // Update week time
      if (weeklySummary) {
        const weekTotal = weeklySummary.reduce((sum, day) => sum + (day.total_seconds || 0), 0);
        document.getElementById('week-time').textContent = this.formatDuration(weekTotal);
      }

      // Update month time
      if (monthlySummary) {
        const monthTotal = monthlySummary.reduce((sum, day) => sum + (day.total_seconds || 0), 0);
        document.getElementById('month-time').textContent = this.formatDuration(monthTotal);
      }

      // Load recent sessions
      await this.loadRecentSessions();
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  }

  async loadRecentSessions() {
    const today = new Date();
    const startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = today.toISOString().split('T')[0];

    try {
      const sessions = await window.electronAPI.getSessions({
        startDate: startDateStr,
        endDate: endDateStr
      });

      const container = document.getElementById('recent-sessions');
      if (sessions.length === 0) {
        container.innerHTML = '<p class="no-data">No sessions recorded yet</p>';
        return;
      }

      container.innerHTML = sessions.slice(0, 10).map(session => `
        <div class="session-item">
          <span class="session-date">${this.formatDate(session.start_time)}</span>
          <span class="session-duration">${this.formatDuration(session.duration_seconds)}</span>
        </div>
      `).join('');
    } catch (error) {
      console.error('Failed to load recent sessions:', error);
    }
  }

  async loadSessions() {
    const startDate = document.getElementById('session-start-date').value;
    const endDate = document.getElementById('session-end-date').value;

    try {
      const sessions = await window.electronAPI.getSessions({ startDate, endDate });

      const tbody = document.getElementById('sessions-tbody');
      if (sessions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="no-data">No sessions found</td></tr>';
        return;
      }

      tbody.innerHTML = sessions.map(session => `
        <tr>
          <td>${this.formatDate(session.start_time)}</td>
          <td>${this.formatTime(session.start_time)}</td>
          <td>${session.end_time ? this.formatTime(session.end_time) : 'Active'}</td>
          <td>${this.formatDuration(session.duration_seconds)}</td>
          <td>
            <span class="status-badge ${session.is_active ? 'active' : 'inactive'}">
              ${session.is_active ? 'Active' : 'Ended'}
            </span>
          </td>
        </tr>
      `).join('');
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  }

  async loadSettings() {
    try {
      const settings = await window.electronAPI.getSettings();

      if (settings) {
        document.getElementById('idle-threshold').value = settings.idleThresholdSeconds || 300;
        document.getElementById('min-session').value = settings.minSessionDurationSeconds || 60;
        document.getElementById('data-retention').value = settings.dataRetentionDays || 365;
        document.getElementById('auto-launch').checked = settings.autoLaunch || false;
        document.getElementById('dark-mode').checked = settings.darkMode || false;
        document.getElementById('break-reminder').checked = settings.breakReminderEnabled !== false;
        document.getElementById('break-interval').value = settings.breakIntervalMinutes || 60;
      }

      this.applyDarkMode(settings?.darkMode || false);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  async saveSettings() {
    const settings = {
      idleThresholdSeconds: parseInt(document.getElementById('idle-threshold').value),
      minSessionDurationSeconds: parseInt(document.getElementById('min-session').value),
      dataRetentionDays: parseInt(document.getElementById('data-retention').value),
      autoLaunch: document.getElementById('auto-launch').checked,
      darkMode: document.getElementById('dark-mode').checked,
      breakReminderEnabled: document.getElementById('break-reminder').checked,
      breakIntervalMinutes: parseInt(document.getElementById('break-interval').value)
    };

    try {
      await window.electronAPI.saveSettings(settings);
      this.applyDarkMode(settings.darkMode);
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings. Please try again.');
    }
  }

  applyDarkMode(enabled) {
    document.body.classList.toggle('dark', enabled);
  }

  async startSessionTimer() {
    if (this.currentSessionTimer) {
      clearInterval(this.currentSessionTimer);
    }

    this.currentSessionTimer = setInterval(async () => {
      try {
        const session = await window.electronAPI.getCurrentSession();

        const statusEl = document.getElementById('session-status');
        const timeEl = document.getElementById('current-session-time');

        if (session && session.isActive) {
          statusEl.textContent = 'Tracking';
          statusEl.className = 'status-badge active';
          timeEl.textContent = this.formatDuration(session.duration);
        } else {
          statusEl.textContent = 'Not tracking';
          statusEl.className = 'status-badge inactive';
          timeEl.textContent = '00:00:00';
        }
      } catch (error) {
        console.error('Failed to get current session:', error);
      }
    }, 1000);
  }

  async exportPDF() {
    const startDate = document.getElementById('export-start-date').value;
    const endDate = document.getElementById('export-end-date').value;
    const filename = `screentime-report-${startDate}-to-${endDate}`;

    try {
      const result = await window.electronAPI.exportPDF({
        startDate,
        endDate,
        filename
      });

      if (result.success) {
        alert(`PDF exported successfully to: ${result.path}`);
      } else {
        alert(`Failed to export PDF: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to export PDF:', error);
      alert('Failed to export PDF. Please try again.');
    }
  }

  async exportCSV() {
    const startDate = document.getElementById('export-start-date').value;
    const endDate = document.getElementById('export-end-date').value;
    const filename = `screentime-export-${startDate}-to-${endDate}`;

    try {
      const result = await window.electronAPI.exportCSV({
        startDate,
        endDate,
        filename
      });

      if (result.success) {
        alert(`CSV exported successfully to: ${result.path}`);
      } else {
        alert(`Failed to export CSV: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to export CSV:', error);
      alert('Failed to export CSV. Please try again.');
    }
  }

  async clearOldData() {
    if (!confirm('Are you sure you want to clear data older than 90 days? This action cannot be undone.')) {
      return;
    }

    try {
      const result = await window.electronAPI.clearData({ olderThan: 90 });
      if (result.success) {
        alert('Old data cleared successfully!');
        await this.loadData();
      } else {
        alert('Failed to clear old data. Please try again.');
      }
    } catch (error) {
      console.error('Failed to clear old data:', error);
      alert('Failed to clear old data. Please try again.');
    }
  }

  // Utility functions
  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  // Pomodoro Timer Methods
  setupPomodoroListeners() {
    document.getElementById('pomodoro-start-btn').addEventListener('click', () => this.startPomodoro());
    document.getElementById('pomodoro-pause-btn').addEventListener('click', () => this.pausePomodoro());
    document.getElementById('pomodoro-reset-btn').addEventListener('click', () => this.resetPomodoro());
    document.getElementById('pomodoro-skip-btn').addEventListener('click', () => this.skipPomodoro());
    document.getElementById('save-pomodoro-settings').addEventListener('click', () => this.savePomodoroSettings());
  }

  async startPomodoro() {
    try {
      const state = await window.electronAPI.pomodoroStart();
      this.updatePomodoroUI(state);
    } catch (error) {
      console.error('Failed to start Pomodoro:', error);
    }
  }

  async pausePomodoro() {
    try {
      const state = await window.electronAPI.pomodoroPause();
      this.updatePomodoroUI(state);
    } catch (error) {
      console.error('Failed to pause Pomodoro:', error);
    }
  }

  async resetPomodoro() {
    try {
      const state = await window.electronAPI.pomodoroReset();
      this.updatePomodoroUI(state);
    } catch (error) {
      console.error('Failed to reset Pomodoro:', error);
    }
  }

  async skipPomodoro() {
    try {
      const state = await window.electronAPI.pomodoroSkip();
      this.updatePomodoroUI(state);
    } catch (error) {
      console.error('Failed to skip Pomodoro:', error);
    }
  }

  updatePomodoroUI(state) {
    const timeEl = document.getElementById('pomodoro-time');
    const statusEl = document.getElementById('pomodoro-status');
    const startBtn = document.getElementById('pomodoro-start-btn');
    const pauseBtn = document.getElementById('pomodoro-pause-btn');
    const skipBtn = document.getElementById('pomodoro-skip-btn');

    // Update time display
    const minutes = Math.floor(state.timeRemaining / 60);
    const seconds = state.timeRemaining % 60;
    timeEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    // Update status
    const statusTexts = {
      'work': 'Focus Time',
      'shortBreak': 'Short Break',
      'longBreak': 'Long Break',
      'idle': 'Ready to Focus'
    };
    statusEl.textContent = statusTexts[state.mode] || 'Ready';

    // Update buttons
    startBtn.disabled = state.isRunning;
    pauseBtn.disabled = !state.isRunning;
    skipBtn.disabled = !state.isRunning;

    // Update stats
    document.getElementById('pomodoro-sessions-today').textContent = state.sessionsToday || 0;
    const totalMinutes = Math.floor((state.totalFocusTime || 0) / 60);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    document.getElementById('pomodoro-total-focus').textContent = `${hours}h ${mins}m`;
  }

  async savePomodoroSettings() {
    const settings = {
      pomodoroWorkDuration: parseInt(document.getElementById('pomodoro-work-duration').value),
      pomodoroShortBreakDuration: parseInt(document.getElementById('pomodoro-short-break').value),
      pomodoroLongBreakDuration: parseInt(document.getElementById('pomodoro-long-break').value),
      pomodoroSessionsBeforeLongBreak: parseInt(document.getElementById('pomodoro-sessions-count').value)
    };

    try {
      await window.electronAPI.pomodoroUpdateSettings(settings);
      alert('Pomodoro settings saved!');
    } catch (error) {
      console.error('Failed to save Pomodoro settings:', error);
      alert('Failed to save settings');
    }
  }

  async loadPomodoroSettings() {
    try {
      const settings = await window.electronAPI.getSettings();
      if (settings) {
        document.getElementById('pomodoro-work-duration').value = settings.pomodoroWorkDuration || 25;
        document.getElementById('pomodoro-short-break').value = settings.pomodoroShortBreakDuration || 5;
        document.getElementById('pomodoro-long-break').value = settings.pomodoroLongBreakDuration || 15;
        document.getElementById('pomodoro-sessions-count').value = settings.pomodoroSessionsBeforeLongBreak || 4;
      }
    } catch (error) {
      console.error('Failed to load Pomodoro settings:', error);
    }
  }

  startPomodoroPolling() {
    // Update Pomodoro state every second
    setInterval(async () => {
      try {
        const state = await window.electronAPI.pomodoroGetState();
        this.updatePomodoroUI(state);
      } catch (error) {
        console.error('Failed to get Pomodoro state:', error);
      }
    }, 1000);
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new ScreenTimeApp();


  async loadTopApps() {
    const today = new Date().toISOString().split('T')[0];
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    try {
      const topApps = await window.electronAPI.getTopApps(lastWeek, today, 10);
      this.renderTopApps(topApps);
    } catch (error) {
      console.error('Failed to load top apps:', error);
    }
  }

  renderTopApps(apps) {
    const container = document.getElementById('app-usage-chart');
    if (!container) return;
    
    if (!apps || apps.length === 0) {
      container.innerHTML = '<p class="no-data">No app usage data yet. Start using applications to see insights!</p>';
      return;
    }

    container.innerHTML = apps.map(app => {
      const hours = Math.floor(app.total_seconds / 3600);
      const minutes = Math.floor((app.total_seconds % 3600) / 60);
      const duration = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      
      return `
        <div class="app-item">
          <div class="app-name">${app.application_name || 'Unknown'}</div>
          <div class="app-time">${duration}</div>
          <div class="app-sessions">${app.session_count || 0} sessions</div>
        </div>
      `;
    }).join('');
  }

}
