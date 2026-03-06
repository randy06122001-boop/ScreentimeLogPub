# Screen Time Tracker

A cross-platform desktop application for tracking your screen time, built with Electron.

![Version](https://img.shields.io/badge/version-5.3.0-blue)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

### 📊 Dashboard
- **Real-time tracking**: See your current session duration and status
- **Daily/Weekly/Monthly stats**: Track your screen time across different time periods
- **Longest session**: Monitor your longest continuous screen session
- **Recent sessions**: Quick view of your last 10 sessions

### 🍅 Pomodoro Timer
- Customizable work and break durations
- Short break (default: 5 minutes) and long break (default: 15 minutes)
- Configurable sessions before long break (default: 4)
- Track total focus time and sessions completed

### 📈 App Usage Insights
- View top applications by usage time
- Session counts per application
- Category-based organization

### 📋 Sessions History
- Filter sessions by date range
- View start time, end time, duration, and status
- Export to PDF or CSV

### 📁 Data Management
- **Export**: Generate PDF or CSV reports for any date range
- **Clear old data**: Remove data older than 90 days
- **Clear all data**: Permanently delete all tracking history (with double confirmation)

### ⚙️ Settings
- **Idle Threshold**: Configure when to pause tracking (default: 300 seconds)
- **Minimum Session Duration**: Set minimum session length (default: 60 seconds)
- **Auto-launch**: Start app on system startup
- **Dark Mode**: Toggle dark theme
- **Data Retention**: Configure how long to keep data (default: 365 days)
- **Break Reminders**: Enable/disable break notifications

## Installation

### Download
Download the latest release from the [Releases page](https://github.com/randy06122001-boop/ScreenTimeLog/releases).

- **Windows**: Download the `.exe` installer
- **macOS**: Download the `.dmg` file
- **Linux**: Download the `.AppImage` file

### Build from Source

1. **Clone the repository:**
   ```bash
   git clone https://github.com/randy06122001-boop/ScreenTimeLog.git
   cd ScreenTimeLog
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the app:**
   ```bash
   npm start
   ```

4. **Build for your platform:**
   ```bash
   npm run build        # Build for current platform
   npm run build:win    # Build for Windows
   npm run build:mac    # Build for macOS
   npm run build:linux  # Build for Linux
   ```

## Project Structure

```
ScreenTimeLog/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── main.js           # Main process entry point
│   │   ├── preload.js        # Preload script for IPC
│   │   ├── database.js       # SQLite database operations
│   │   ├── activityMonitor.js # Screen time tracking logic
│   │   ├── exportService.js  # PDF/CSV export functionality
│   │   └── pomodoro.js       # Pomodoro timer logic
│   └── renderer/             # Frontend (renderer process)
│       ├── index.html        # Main HTML
│       ├── app.js            # Application logic
│       └── styles.css        # Styling
├── assets/
│   └── icon.png              # App icon
├── package.json
└── README.md
```

## Technology Stack

- **Electron** - Cross-platform desktop framework
- **better-sqlite3** - SQLite database
- **electron-store** - Persistent settings storage
- **auto-launch** - System startup integration
- **jspdf** - PDF generation
- **csv-writer** - CSV export

## Database Schema

The app uses SQLite with the following tables:

- **sessions** - Individual screen time sessions
- **daily_summaries** - Aggregated daily statistics
- **app_usage** - Per-application usage tracking
- **categories** - Custom application categories
- **settings** - User preferences

## Usage Tips

1. **Keep it running**: The app runs in the system tray. Close the window to minimize to tray.
2. **Pomodoro technique**: Use the built-in timer to maintain focus with regular breaks.
3. **Regular exports**: Export your data periodically as PDF or CSV for external analysis.
4. **Configure idle threshold**: Adjust based on your workflow to avoid false breaks.

## Troubleshooting

### App doesn't start tracking
- Ensure the app has necessary permissions
- Check if idle threshold is set appropriately in Settings

### Database errors
- The database is stored in your user data folder
- Try clearing old data from the Reports tab

### Build errors on macOS
- Ensure Xcode Command Line Tools are installed: `xcode-select --install`

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Changelog

### v5.3.0
- Added Clear All Data feature with double confirmation
- Added Pomodoro Timer with customizable settings
- Added App Usage Insights dashboard
- Added Category Management
- Added .gitignore for proper build artifact exclusion
- Bug fixes and UI improvements

### Previous Versions
See [Releases](https://github.com/randy06122001-boop/ScreenTimeLog/releases) for full version history.

---
