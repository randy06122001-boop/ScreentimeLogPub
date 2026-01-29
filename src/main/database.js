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

      CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time);
      CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date(start_time));
      CREATE INDEX IF NOT EXISTS idx_daily_summaries_date ON daily_summaries(date);
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

  // Session Management
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

  // Query Methods
  getSessions(startDate, endDate) {
    return this.db.prepare(`
      SELECT * FROM sessions 
      WHERE date(start_time) BETWEEN ? AND ?
      ORDER BY start_time DESC
    `).all(startDate, endDate);
  }

  getDailySummary(date) {
    return this.db.prepare(`
      SELECT * FROM daily_
