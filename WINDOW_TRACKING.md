# Window/Application Tracking Implementation

## Overview
This document describes the window/application tracking feature added to ScreenTimeLog v1.0.0+.

## What Was Added

### New Files
1. **src/main/windowTracker.js**
   - Tracks active windows and applications
   - Uses the `active-win` package for cross-platform window detection
   - Updates every second to detect window/app changes

### Modified Files

#### 1. src/main/database.js
**New Tables:**
- `window_activity`: Stores individual window/app events
  - session_id, app_name, app_path, app_id, window_title, window_id, start_time, duration_seconds
- `app_usage`: Aggregated app usage by day
  - date, app_name, app_id, total_seconds, window_count

**New Methods:**
- `logWindowActivity(sessionId, appInfo, windowInfo, durationSeconds)` - Log a window activity event
- `updateAppUsage(date, appInfo, durationSeconds)` - Update aggregated app usage
- `updateDailyWindowActivity(date)` - Update daily summary with window count
- `getWindowActivityBySession(sessionId)` - Get all window activity for a session
- `getAppUsageByDate(date)` - Get app usage for a specific day
- `getAppUsageByRange(startDate, endDate)` - Get app usage for a date range
- `getTopAppsByDate(date, limit)` - Get top apps for a day
- `getTopAppsByRange(startDate, endDate, limit)` - Get top apps for a range

#### 2. src/main/activityMonitor.js
**New Functionality:**
- Integrated `WindowTracker` for tracking active windows
- Tracks window/app changes and logs activity events
- Logs window activity when:
  - User becomes idle (before ending session)
  - Window/app changes
  - Session ends

**New Properties:**
- `windowTracker` - Instance of WindowTracker
- `lastWindowInfo` - Last tracked window
- `lastAppInfo` - Last tracked app
- `lastWindowStartTime` - When current window became active

**New Methods:**
- `trackWindowActivity()` - Called every tick to check for window changes
- `logWindowActivity()` - Records window activity to database
- `getCurrentWindowInfo()` - Returns current window/app info

#### 3. src/main/main.js
**New IPC Handlers:**
- `get-current-window` - Get current window/app info
- `get-app-usage-by-date` - Get app usage for a day
- `get-app-usage-by-range` - Get app usage for a date range
- `get-top-apps-by-date` - Get top apps for a day
- `get-top-apps-by-range` - Get top apps for a range
- `get-window-activity-by-session` - Get window activity for a session

#### 4. src/main/preload.js
**New API Methods:**
- `getCurrentWindow()`
- `getAppUsageByDate(date)`
- `getAppUsageByRange(params)`
- `getTopAppsByDate(date, limit)`
- `getTopAppsByRange(params, limit)`
- `getWindowActivityBySession(sessionId)`

#### 5. src/renderer/index.html
**New Tab:**
- Apps tab with navigation item and content section
- Date filter for selecting date range
- Table displaying app usage (name, total time, window count)

#### 6. src/renderer/app.js
**New Methods:**
- `loadApps()` - Populates the apps table with usage data
- Updated navigation to handle the Apps tab

#### 7. package.json
**New Dependency:**
- `active-win@^8.2.1` - Cross-platform active window detection

## How It Works

1. **Initialization**: When the app starts, `WindowTracker` begins polling every second for the active window
2. **Tracking**: Every tick (1 second), the `ActivityMonitor` checks if the window/app has changed
3. **Logging**: When a change is detected, the previous window's duration is calculated and logged to the database
4. **Aggregation**: App usage is automatically aggregated by day in the `app_usage` table
5. **Display**: Users can view their top applications and usage time in the Apps tab

## Data Privacy
- All window activity is stored locally in the SQLite database
- No data is transmitted to external servers
- Users can clear old data at any time

## Platform Support
- **Windows**: Fully supported via active-win
- **macOS**: Supported via active-win
- **Linux**: Supported via active-win (may require additional dependencies)

## Building for Windows
```bash
npm install
npm run build:win
```
This creates an installer at `dist/Screen Time Tracker Setup.exe` with full window tracking support.
