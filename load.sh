#!/bin/bash
# ScreenTimeLog App Loader

set -e

cd "$(dirname "$0")"

# Check if node modules exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start the app
echo "Starting ScreenTimeLog..."
npm start
