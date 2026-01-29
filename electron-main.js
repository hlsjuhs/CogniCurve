const { app, BrowserWindow, ipcMain, protocol, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Prevent garbage collection
let mainWindow;

// Determine userData path for storing images
const userDataPath = app.getPath('userData');
const imagesDir = path.join(userDataPath, 'images');

// Ensure image directory exists
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    title: "CogniCurve - 科学记忆系统",
    autoHideMenuBar: true, 
    webPreferences: {
      nodeIntegration: false, // SECURITY: Disable Node integration in renderer
      contextIsolation: true, // SECURITY: Enable Context Isolation
      preload: path.join(__dirname, 'preload.js'), // Load preload script
      webSecurity: true // Keep true for security, we use custom protocol for local files
    },
  });

  mainWindow.setMenu(null);

  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// REGISTER CUSTOM PROTOCOL
// This allows the renderer to load images like <img src="local-resource://image.jpg" />
// mapping securely to the user's data folder.
app.whenReady().then(() => {
  protocol.registerFileProtocol('local-resource', (request, callback) => {
    const url = request.url.replace('local-resource://', '');
    try {
      // Decode URL in case of spaces etc.
      const decodedUrl = decodeURIComponent(url);
      // Construct full path
      const fullPath = path.join(imagesDir, decodedUrl);
      
      // Security check: Prevent directory traversal
      if (!fullPath.startsWith(imagesDir)) {
         callback({ error: -2 }); // FAILED
         return;
      }
      
      callback({ path: fullPath });
    } catch (error) {
      console.error(error);
      callback({ error: -2 });
    }
  });

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

// --- IPC HANDLERS ---

// Save Image Handler: Receives base64, saves to disk, returns protocol URL
ipcMain.handle('save-image', async (event, { dataUrl }) => {
  try {
    // dataUrl is like "data:image/jpeg;base64,/9j/4AAQ..."
    const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid input string');
    }

    const type = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const extension = type.split('/')[1] || 'jpg';
    
    // Generate unique filename
    const filename = `${crypto.randomUUID()}.${extension}`;
    const filePath = path.join(imagesDir, filename);

    // Write file
    await fs.promises.writeFile(filePath, buffer);

    // Return the custom protocol URL
    return `local-resource://${filename}`;
  } catch (error) {
    console.error('Failed to save image:', error);
    throw error;
  }
});

// Save Text File (e.g., .ics) to Temp and return path
ipcMain.handle('save-file', async (event, { filename, content }) => {
    try {
        const tempPath = app.getPath('temp');
        const filePath = path.join(tempPath, filename);
        await fs.promises.writeFile(filePath, content, 'utf-8');
        return filePath;
    } catch (error) {
        console.error('Failed to save file:', error);
        throw error;
    }
});

// Open External File/URL
ipcMain.handle('open-external', async (event, url) => {
  await shell.openExternal(url);
});

// Open Path (for ICS files generated locally)
ipcMain.handle('open-path', async (event, filePath) => {
    await shell.openPath(filePath);
});