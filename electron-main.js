const { app, BrowserWindow } = require('electron');
const path = require('path');

// Prevent garbage collection
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    title: "CogniCurve - 科学记忆系统",
    autoHideMenuBar: true, // Hide the menu bar by default
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // For simple interaction
      webSecurity: false // Optional: helpful if loading local images with file:// protocol issues
    },
    // Icon configuration for runtime (windows/linux)
    // icon: path.join(__dirname, 'public/icon.png') 
  });

  // Completely remove the menu (File, Edit, etc.)
  mainWindow.setMenu(null);

  // Check if we are in dev mode (generic check)
  const isDev = !app.isPackaged;

  if (isDev) {
    // In development, load the Vite dev server
    // You need to run 'npm run dev' in another terminal
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built index.html
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});