import { app, BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';

export class AutoUpdaterService {
  private mainWindow: BrowserWindow | null = null;

  initialize(mainWindow: BrowserWindow | null): void {
    this.mainWindow = mainWindow;
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    if (!app.isPackaged) {
      return;
    }

    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(() => {});
    }, 10_000);

    setInterval(() => {
      autoUpdater.checkForUpdates().catch(() => {});
    }, 4 * 60 * 60 * 1000);

    autoUpdater.on('update-available', (info) => {
      this.mainWindow?.webContents?.send('update:available', {
        version: info.version,
        releaseNotes: info.releaseNotes,
      });
    });

    autoUpdater.on('download-progress', (progress) => {
      this.mainWindow?.webContents?.send('update:progress', {
        percent: progress.percent,
        bytesPerSecond: progress.bytesPerSecond,
        transferred: progress.transferred,
        total: progress.total,
      });
    });

    autoUpdater.on('update-downloaded', (info) => {
      this.mainWindow?.webContents?.send('update:downloaded', { version: info.version });
    });

    autoUpdater.on('error', () => {});
  }

  async installNow(): Promise<void> {
    autoUpdater.quitAndInstall(false, true);
  }
}

export const autoUpdaterService = new AutoUpdaterService();
