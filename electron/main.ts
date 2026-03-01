import { app, BrowserWindow, session, Tray, Menu, nativeImage } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { initDatabase, closeDatabase, getDb } from './services/database';
import { registerIpcHandlers } from './services/ipc-handlers';
import { safetyEngine } from './engine/safety-engine';
import { initialize as initAlertDelivery, shutdown as shutdownAlertDelivery } from './alerts/alert-delivery';
import { syncEngine } from './sync/sync-engine';
import { reportGenerator } from './reports/report-generator';
import { autoUpdaterService } from './updater/auto-updater';

const isDev = process.env.ELECTRON_START_URL != null;
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let trayInterval: NodeJS.Timeout | null = null;
let hasShownTrayNotice = false;
let isQuitting = false;

const singleInstanceLock = app.requestSingleInstanceLock();
if (!singleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 1280,
    minHeight: 720,
    frame: false,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  mainWindow.setMenuBarVisibility(false);
  if (mainWindow.maximizable) {
    mainWindow.maximize();
  }

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'",
        ],
      },
    });
  });

  if (isDev && process.env.ELECTRON_START_URL) {
    mainWindow.loadURL(process.env.ELECTRON_START_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  const isHidden = process.argv.includes('--hidden');
  mainWindow.once('ready-to-show', () => {
    if (!isHidden) mainWindow?.show();
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
      if (!hasShownTrayNotice && tray) {
        tray.displayBalloon({
          title: 'AdvanceSafe is still running',
          body: 'Safety monitoring continues in the background. Right-click the tray icon to quit.',
          iconType: 'info',
        });
        hasShownTrayNotice = true;
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (trayInterval) clearInterval(trayInterval);
    trayInterval = null;
  });

  createTray();
  autoUpdaterService.initialize(mainWindow);
}

function createTray(): void {
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'build', 'icon.ico')
    : path.join(app.getAppPath(), 'build', 'icon.ico');
  if (!fs.existsSync(iconPath)) return;
  const icon = nativeImage.createFromPath(iconPath);
  if (icon.isEmpty()) return;
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip('AdvanceSafe — Monitoring Active');
  tray.on('double-click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
  updateTrayMenu(0);
  trayInterval = setInterval(() => {
    try {
      const state = safetyEngine.getState();
      updateTrayMenu(state?.activeIncidents ?? 0);
    } catch {
      updateTrayMenu(0);
    }
  }, 30_000);
}

function updateTrayMenu(activeAlerts: number): void {
  if (!tray) return;
  const menu = Menu.buildFromTemplate([
    { label: 'AdvanceSafe', enabled: false },
    { type: 'separator' },
    {
      label: activeAlerts > 0 ? `⚠ ${activeAlerts} Active Alert(s)` : '✓ System Normal',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Open Dashboard',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    {
      label: 'Open Incidents',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
        mainWindow?.webContents?.send('navigate', '/incidents');
      },
    },
    { type: 'separator' },
    { label: '● Monitoring Active', enabled: false },
    { type: 'separator' },
    {
      label: 'Restart AdvanceSafe',
      click: () => {
        app.relaunch();
        app.exit(0);
      },
    },
    { label: 'Quit', click: () => { isQuitting = true; app.quit(); } },
  ]);
  tray.setContextMenu(menu);
}

app.whenReady().then(() => {
  initDatabase()
    .then(async () => {
      const db = getDb();
      if (db) {
        safetyEngine.initialize(db);
        initAlertDelivery(db);
        await syncEngine.initialize(db, () => safetyEngine.getState());
        reportGenerator.initialize(db);
      }
      registerIpcHandlers();
      createWindow();
    })
    .catch(() => {
      app.quit();
    });
});

app.on('before-quit', () => {
  isQuitting = true;
  if (trayInterval) clearInterval(trayInterval);
  trayInterval = null;
  tray = null;
  safetyEngine.shutdown();
  shutdownAlertDelivery();
  syncEngine.shutdown();
  mainWindow = null;
});

app.on('window-all-closed', () => {
  closeDatabase().finally(() => {
    app.quit();
  });
});
