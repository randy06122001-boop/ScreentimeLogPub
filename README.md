# ScreenTimeLog v2.1.0

Cross-platform desktop screen time tracker with app usage monitoring, Pomodoro timer, and exportable reports.

## Features

- **Automatic screen time tracking** — Logs active sessions with idle detection
- **App usage monitoring** — Tracks which applications you use most (Windows/Linux)
- **Pomodoro timer** — Built-in focus timer with configurable work/break intervals
- **Daily/Weekly/Monthly summaries** — Visual stats for your screen time
- **PDF & CSV export** — Generate reports for any date range
- **System tray** — Runs quietly in background with quick controls
- **Auto-launch** — Starts with your OS if enabled
- **Dark mode** — Built-in theme toggle
- **Data integrity** — Session checksums detect corruption

## Setup

```bash
git clone https://github.com/randy06122001-boop/ScreenTimeLog.git
cd ScreenTimeLog
npm install
npm start
```

To build an installer:
```bash
npm run build:win   # Windows .exe
npm run build:mac   # macOS .dmg
npm run build:linux # Linux .AppImage
```

## Tech Stack

- **Electron** — Desktop framework
- **better-sqlite3** — Local database
- **electron-store** — Settings persistence
- **jsPDF** — PDF export
- **csv-writer** — CSV export
