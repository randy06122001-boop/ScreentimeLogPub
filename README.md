# ScreenTimeLog

Cross-platform desktop screen time tracker with application and window tracking.

## Features

- **Session Tracking**: Automatically tracks your screen time in sessions
- **Idle Detection**: Pauses tracking when you're away from your computer
- **Window/App Tracking**: Tracks which applications and windows you're using
- **Daily/Weekly/Monthly Reports**: View your screen time statistics
- **Export Data**: Export your data to PDF or CSV
- **Tray Icon**: Runs in the background with system tray support
- **Auto-Launch**: Option to start automatically when you log in

## Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/ScreenTimeLog.git
   cd ScreenTimeLog
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the project:**
   ```bash
   npm run build:win  # For Windows
   # or
   npm run build:mac  # For macOS
   # or
   npm run build:linux  # For Linux
   ```

4. **Run the app:**
   ```bash
   npm start
   ```

## Project Structure

- `src/`: Contains the source code for the Electron app.
  - `main.js`: The main process file
  - `activityMonitor.js`: Handles activity monitoring and session management
  - `windowTracker.js`: Tracks active windows and applications
  - `database.js`: SQLite database operations
  - `exportService.js`: Data export functionality
  - `preload.js`: Electron preload script for secure IPC
  - `renderer/`: Frontend code
    - `index.html`: Main HTML
    - `app.js`: Frontend JavaScript
    - `styles.css`: Styling
- `assets/`: Application icon and assets
- `package.json`: Project configuration

## Usage

### Dashboard
- View today's, this week's, and this month's screen time
- See your longest session
- View recent sessions
- Monitor current session status

### Sessions
- View all tracked sessions with start/end times
- Filter by date range
- See session duration and status

### Apps (NEW)
- View top applications by usage time
- See window count for each application
- Filter by date range
- Track which applications you use the most

### Reports
- Export data to PDF or CSV
- Select date range for export
- Clear old data (older than 90 days)

### Settings
- **Idle Threshold**: Time before tracking pauses when idle (default: 5 minutes)
- **Minimum Session Duration**: Minimum time for a session to be recorded
- **Launch on Startup**: Automatically start when you log in
- **Dark Mode**: Enable dark theme
- **Data Retention**: How long to keep data (default: 365 days)
- **Break Reminders**: Get notified to take breaks
- **Break Interval**: Time between break reminders

## Database Schema

The app uses SQLite with the following tables:

- **sessions**: Stores screen time sessions
- **daily_summaries**: Daily aggregated statistics
- **window_activity**: Individual window/app activity events
- **app_usage**: Aggregated app usage by day
- **settings**: Application settings

## Building for Distribution

### Windows
```bash
npm run build:win
```
Output: `dist/Screen Time Tracker Setup.exe`

### macOS
```bash
npm run build:mac
```
Output: `dist/Screen Time Tracker.dmg`

### Linux
```bash
npm run build:linux
```
Output: `dist/Screen Time Tracker.AppImage`

## Privacy

All data is stored locally on your computer. No data is sent to any servers. You can clear your data at any time from the Reports tab.

## Contributing

1. Fork the repository
2. Create a new branch for your feature
3. Make your changes
4. Commit your changes with clear messages
5. Push to your fork
6. Create a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
