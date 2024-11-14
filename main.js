import fs from 'fs';
import { promisify } from 'util';
import { app, BrowserWindow, systemPreferences } from 'electron';
import path from 'path';
import { startServer } from './server.js';
import { createStream } from 'rotating-file-stream';

const copyFile = promisify(fs.copyFile);
const mkdir = promisify(fs.mkdir);
const access = promisify(fs.access);

let mainWindow;

const DEV = false;
const DEBUG = false;

const logDirectory = app.getPath('userData');
const logStream = createStream('app.log', {
    size: '500K', // Rotate every 500KB
    path: logDirectory
});

function logToFile(message) {
    logStream.write(`${new Date().toISOString()} - ${message}\n`);
}

async function checkAndCopyProfile() {
    const profilesDir = path.join(logDirectory, 'profiles');
    const ethanJsonPath = path.join(app.getAppPath(), 'ethan.json');
    const targetPath = path.join(profilesDir, 'ethan.json');

    try {
        await access(profilesDir);
    } catch (err) {
        await mkdir(profilesDir);
        logToFile('Created profiles directory');
        // Only add ethan if there's no profile dir.
        try {
            await copyFile(ethanJsonPath, targetPath);
            logToFile('Copied ethan.json to profiles directory');
        } catch (err) {
            logToFile('Failed to copy ethan.json: ' + err);
        }
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 650,
        height: 960,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    if (DEV) {
        mainWindow.loadURL('http://localhost:5173');
    } else {
        const indexPath = path.join(app.getAppPath(), 'frontend', 'dist', 'index.html');
        mainWindow.loadFile(indexPath).catch(err => {
            logToFile('Failed to load index.html: ' + err);
        });
    }

    if (DEBUG) {
        mainWindow.webContents.openDevTools(); // Open Electron DevTools
    }

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.on('ready', async () => {
    createWindow(); // Create the window first
    try {
        startServer();
    } catch (error) {
        logToFile("Failed to start server: " + error);
    }
    await checkAndCopyProfile(); // Check and copy profile
  });
}

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function () {
    if (mainWindow === null) {
        createWindow();
    }
});