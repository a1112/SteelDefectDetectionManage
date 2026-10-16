const { app, BrowserWindow, ipcMain, screen } = require("electron");
const path = require("path");
const { startupOptions, trackWindow } = require("./window-geometry");

const getWindow = (event) => BrowserWindow.fromWebContents(event.sender);

ipcMain.handle("window:minimize", (event) => {
  const win = getWindow(event);
  win?.minimize();
});

ipcMain.handle("window:toggle-maximize", (event) => {
  const win = getWindow(event);
  if (!win) return false;
  if (win.isMaximized()) {
    win.unmaximize();
    return false;
  }
  win.maximize();
  return true;
});

ipcMain.handle("window:close", (event) => {
  const win = getWindow(event);
  win?.close();
});

ipcMain.handle("window:is-maximized", (event) => {
  const win = getWindow(event);
  return win?.isMaximized() ?? false;
});

const createWindow = () => {
  const win = new BrowserWindow({
    ...startupOptions(app, screen),
    frame: false,
    titleBarStyle: "hidden",
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });
  trackWindow(win, app);
  win.setMenuBarVisibility(false);
  win.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    console.error("did-fail-load", errorCode, errorDescription);
    win.show();
  });
  win.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    console.log("renderer", { level, message, line, sourceId });
  });

  const devUrl = process.env.ELECTRON_START_URL;
  if (devUrl) {
    win.loadURL(devUrl);
    return;
  }

  const indexPath = path.join(__dirname, "web", "index.html");
  win.loadFile(indexPath);
};

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
