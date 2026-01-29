# ScreenTimeLog
Screen time logger

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
   npm run build
   ```

4. **Run the app:**
   ```bash
   npm start
   ```

## Project Structure

- `src/`: Contains the source code for the Electron app.
  - `main.js`: The main process file.
  - `renderer.js`: The renderer process file.
  - `index.html`: The main HTML file for the app.
  - `styles.css`: The main CSS file for the app.
  - `components/`: Contains reusable components.
  - `utils/`: Contains utility functions.
- `public/`: Contains static assets.
- `dist/`: Contains the built app files.
- `package.json`: The project configuration file.
- `README.md`: This file.

## Usage

1. **Start the app:**
   ```bash
   npm start
   ```

2. **Log screen time:**
   - The app will automatically log your screen time.
   - You can also manually log screen time by clicking the "Log" button.

3. **View logs:**
   - The app will display a list of your screen time logs.
   - You can also view the logs in a CSV file by clicking the "Export" button.

4. **Settings:**
   - You can configure the app settings by clicking the "Settings" button.
   - You can set the log interval, the log file path, and other options.

5. **Exit the app:**
   - You can exit the app by clicking the "Exit" button.
   - You can also exit the app by closing the main window.

## Contributing

1. **Fork the repository:**
   ```bash
   git clone https://github.com/yourusername/ScreenTimeLog.git
   cd ScreenTimeLog
   ```

2. **Create a new branch:**
   ```bash
   git checkout -b my-new-feature
   ```

3. **Make your changes:**
   - Add your new feature or fix a bug.
   - Make sure to update the tests if necessary.

4. **Commit your changes:**
   ```bash
   git commit -am 'Add some feature'
   ```

5. **Push your changes:**
   ```bash
   git push origin my-new-feature
   ```

6. **Create a pull request:**
   - Go to the repository on GitHub.
   - Click on the "Pull requests" tab.
   - Click on the "New pull request" button.
   - Select your branch and the base branch.
   - Click on the "Create pull request" button.
   - Fill in the pull request template.
   - Click on the "Create pull request" button.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
