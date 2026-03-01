const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

class ScreenTimeDatabase {
  constructor(userDataPath) {
    this.dbPath = path.join(userDataPath, 'screentime.db');
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.initializeSchema();
  }

  initializeSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        applied_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        start_time TEXT NOT NULL,
        end_time TEXT,
        duration_seconds INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        checksum TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS daily_summaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT UNIQUE NOT NULL,
        total_seconds INTEGER DEFAULT 0,
        session_count INTEGER DEFAULT 0,
        longest_session_seconds INTEGER DEFAULT 0,
        first_activity TEXT,
        last_activity TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS app_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        application_name TEXT NOT NULL,
        window_title TEXT,
        category TEXT NOT NULL DEFAULT 'Other',
        total_seconds INTEGER DEFAULT 0,
        session_count INTEGER DEFAULT 0,
        UNIQUE(date, application_name, category)
      );

      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        color TEXT DEFAULT '#3b82f6',
        applications TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time);
      CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date(start_time));
      CREATE INDEX IF NOT EXISTS idx_daily_summaries_date ON daily_summaries(date);
      CREATE INDEX IF NOT EXISTS idx_app_usage_date ON app_usage(date);
      CREATE INDEX IF NOT EXISTS idx_app_usage_category ON app_usage(category);
    `);

    this.initializeDefaultSettings();
  }

  initializeDefaultSettings() {
    const defaults = {
      idleThresholdSeconds: 300,
      minSessionDurationSeconds: 60,
      dataRetentionDays: 365,
      autoLaunch: false,
      darkMode: false,
      scheduledBreaks: JSON.stringify([]),
      breakReminderEnabled: true,
      breakIntervalMinutes: 60
    };

    const insert = this.db.prepare(`
      INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
    `);

    for (const [key, value] of Object.entries(defaults)) {
      insert.run(key, String(value));
    }
  }

  generateChecksum(data) {
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex').slice(0, 16);
  }

  verifyChecksum(session) {
    const data = {
      id: session.id,
      start_time: session.start_time,
      end_time: session.end_time,
      duration_seconds: session.duration_seconds
    };
    return this.generateChecksum(data) === session.checksum;
  }

  startSession() {
    const now = new Date().toISOString();
    const result = this.db.prepare(`
      INSERT INTO sessions (start_time, is_active) VALUES (?, 1)
    `).run(now);

    const session = { id: result.lastInsertRowid, start_time: now };
    const checksum = this.generateChecksum({ ...session, end_time: null, duration_seconds: 0 });
    
    this.db.prepare(`UPDATE sessions SET checksum = ? WHERE id = ?`).run(checksum, session.id);
    
    return { id: session.id, startTime: now };
  }

  updateSession(sessionId, durationSeconds) {
    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE sessions 
      SET duration_seconds = ?, updated_at = ?
      WHERE id = ? AND is_active = 1
    `).run(durationSeconds, now, sessionId);
  }

  endSession(sessionId) {
    const now = new Date().toISOString();
    const session = this.db.prepare(`SELECT * FROM sessions WHERE id = ?`).get(sessionId);
    
    if (!session) return null;

    const startTime = new Date(session.start_time);
    const endTime = new Date(now);
    const durationSeconds = Math.floor((endTime - startTime) / 1000);

    const checksum = this.generateChecksum({
      id: sessionId,
      start_time: session.start_time,
      end_time: now,
      duration_seconds: durationSeconds
    });

    this.db.prepare(`
      UPDATE sessions 
      SET end_time = ?, duration_seconds = ?, is_active = 0, checksum = ?, updated_at = ?
      WHERE id = ?
    `).run(now, durationSeconds, checksum, now, sessionId);

    this.updateDailySummary(session.start_time.split('T')[0]);

    return { sessionId, endTime: now, durationSeconds };
  }

  updateDailySummary(date) {
    const stats = this.db.prepare(`
      SELECT 
        COUNT(*) as session_count,
        COALESCE(SUM(duration_seconds), 0) as total_seconds,
        COALESCE(MAX(duration_seconds), 0) as longest_session,
        MIN(start_time) as first_activity,
        MAX(end_time) as last_activity
      FROM sessions 
      WHERE date(start_time) = ? AND is_active = 0
    `).get(date);

    this.db.prepare(`
      INSERT INTO daily_summaries (date, total_seconds, session_count, longest_session_seconds, first_activity, last_activity)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET
        total_seconds = excluded.total_seconds,
        session_count = excluded.session_count,
        longest_session_seconds = excluded.longest_session_seconds,
        first_activity = excluded.first_activity,
        last_activity = excluded.last_activity,
        updated_at = CURRENT_TIMESTAMP
    `).run(date, stats.total_seconds, stats.session_count, stats.longest_session, stats.first_activity, stats.last_activity);
  }

  getSessions(startDate, endDate) {
    return this.db.prepare(`
      SELECT * FROM sessions 
      WHERE date(start_time) BETWEEN ? AND ?
      ORDER BY start_time DESC
    `).all(startDate, endDate);
  }

  getDailySummary(date) {
    return this.db.prepare(`
      SELECT * FROM daily_summaries WHERE date = ?
    `).get(date);
  }

  getWeeklySummary(startDate) {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);
    const endDateStr = endDate.toISOString().split('T')[0];

    return this.db.prepare(`
      SELECT * FROM daily_summaries 
      WHERE date BETWEEN ? AND ?
      ORDER BY date DESC
    `).all(startDate, endDateStr);
  }

  getMonthlySummary(year, month) {
    return this.db.prepare(`
      SELECT * FROM daily_summaries 
      WHERE strftime('%Y', date) = ? AND strftime('%m', date) = ?
      ORDER BY date DESC
    `).all(String(year), String(month).padStart(2, '0'));
  }

  getSessionById(sessionId) {
    return this.db.prepare(`
      SELECT * FROM sessions WHERE id = ?
    `).get(sessionId);
  }

  getSettings() {
    return this.db.prepare(`
      SELECT key, value FROM settings
    `).all();
  }

  saveSettings(settings) {
    const update = this.db.prepare(`
      UPDATE settings SET value = ? WHERE key = ?
    `);
    const insert = this.db.prepare(`
      INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
    `);

    for (const [key, value] of Object.entries(settings)) {
      update.run(String(value), key);
      insert.run(String(value), key);
    }
  }

  getSummaryForRange(startDate, endDate) {
    return this.db.prepare(`
      SELECT 
        COUNT(*) as session_count,
        COALESCE(SUM(duration_seconds), 0) as total_seconds,
        COALESCE(MAX(duration_seconds), 0) as longest_session,
        MIN(start_time) as first_activity,
        MAX(end_time) as last_activity
      FROM sessions 
      WHERE date(start_time) BETWEEN ? AND ?
    `).get(startDate, endDate);
  }

  clearOldData(days) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffDateString = cutoffDate.toISOString().split('T')[0];

    this.db.prepare(`
      DELETE FROM sessions WHERE date(start_time) < ?
    `).run(cutoffDateString);

    this.db.prepare(`
      DELETE FROM daily_summaries WHERE date < ?
    `).run(cutoffDateString);

    return { success: true };
  }

  getOverallStats() {
    const stats = this.db.prepare(`
      SELECT 
        COUNT(*) as session_count,
        COALESCE(SUM(duration_seconds), 0) as total_seconds,
        COALESCE(MAX(duration_seconds), 0) as longest_session,
        MIN(start_time) as first_activity,
        MAX(end_time) as last_activity
      FROM sessions 
    `).get();

    return {
      sessionCount: stats.session_count,
      totalSeconds: stats.total_seconds,
      longestSession: stats.longest_session,
      firstActivity: stats.first_activity,
      lastActivity: stats.last_activity
    };
  }

  // App Usage Methods
  recordAppUsage(date, appName, windowTitle, category, durationSeconds) {
    const stmt = this.db.prepare(`
      INSERT INTO app_usage (date, application_name, window_title, category, total_seconds, session_count)
      VALUES (?, ?, ?, ?, ?, 1)
      ON CONFLICT(date, application_name, category) DO UPDATE SET
        total_seconds = total_seconds + ?,
        session_count = session_count + 1,
        window_title = ?
    `);
    
    stmt.run(date, appName, windowTitle, category, durationSeconds, durationSeconds, windowTitle);
  }

  getAppUsageByDate(date) {
    return this.db.prepare(`
      SELECT * FROM app_usage 
      WHERE date = ?
      ORDER BY total_seconds DESC
    `).all(date);
  }

  getAppUsageByCategory(startDate, endDate) {
    return this.db.prepare(`
      SELECT 
        category,
        SUM(total_seconds) as total_seconds,
        SUM(session_count) as session_count
      FROM app_usage
      WHERE date BETWEEN ? AND ?
      GROUP BY category
      ORDER BY total_seconds DESC
    `).all(startDate, endDate);
  }

  getTopApps(startDate, endDate, limit = 10) {
    return this.db.prepare(`
      SELECT 
        application_name,
        category,
        SUM(total_seconds) as total_seconds,
        SUM(session_count) as session_count
      FROM app_usage
      WHERE date BETWEEN ? AND ?
      GROUP BY application_name
      ORDER BY total_seconds DESC
      LIMIT ?
    `).all(startDate, endDate, limit);
  }

  // Category Management
  getAllCategories() {
    return this.db.prepare(`
      SELECT * FROM categories ORDER BY name
    `).all();
  }

  addCategory(name, color, applications) {
    const stmt = this.db.prepare(`
      INSERT INTO categories (name, color, applications)
      VALUES (?, ?, ?)
    `);
    
    stmt.run(name, color, JSON.stringify(applications || []));
  }

  updateCategory(categoryId, name, color, applications) {
    const stmt = this.db.prepare(`
      UPDATE categories 
      SET name = ?, color = ?, applications = ?
      WHERE id = ?
    `);
    
    stmt.run(name, color, JSON.stringify(applications || []), categoryId);
  }

  deleteCategory(categoryId) {
    this.db.prepare(`DELETE FROM categories WHERE id = ?`).run(categoryId);
  }

  categorizeApp(appName) {
    // Check if app is in any category
    const categories = this.getAllCategories();
    
    for (const category of categories) {
      const apps = JSON.parse(category.applications || '[]');
      if (apps.some(app => appName.toLowerCase().includes(app.toLowerCase()))) {
        return category.name;
      }
    }
    
    // Default categorization
    const appLower = appName.toLowerCase();
    if (appLower.includes('chrome') || appLower.includes('firefox') || appLower.includes('edge') || appLower.includes('safari')) {
      return 'Browsing';
    }
    if (appLower.includes('code') || appLower.includes('vscode') || appLower.includes('atom') || appLower.includes('sublime')) {
      return 'Development';
    }
    if (appLower.includes('slack') || appLower.includes('teams') || appLower.includes('discord') || appLower.includes('zoom')) {
      return 'Communication';
    }
    if (appLower.includes('spotify') || appLower.includes('netflix') || appLower.includes('youtube') || appLower.includes('vlc'))) {
      return 'Entertainment';
    }
    if (appLower.includes('word') || appLower.includes('excel') || appLower.includes('powerpoint') || appLower.includes('docs')) {
      return 'Productivity';
    }
    
    return 'Other';
  }

  close() {
    this.db.close();
  }
}

module.exports = ScreenTimeDatabase;
