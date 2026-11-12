import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "node:path";

const isDev = !app.isPackaged;
let spotifyWindow: BrowserWindow | null = null;

function createSpotifyWindow() {
  if (spotifyWindow && !spotifyWindow.isDestroyed()) {
    spotifyWindow.focus();
    return;
  }

  spotifyWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: "Spotify — Orpheon Windows",
    backgroundColor: "#121212",
    autoHideMenuBar: true,
    webPreferences: {
      partition: "persist:orpheon-spotify",
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  spotifyWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://accounts.spotify.com/") || url.startsWith("https://open.spotify.com/")) {
      return { action: "allow" };
    }
    if (url.startsWith("https://")) void shell.openExternal(url);
    return { action: "deny" };
  });

  spotifyWindow.on("closed", () => {
    spotifyWindow = null;
  });

  void spotifyWindow.loadURL("https://open.spotify.com/");
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: "#090a0c",
    title: "Orpheon Windows",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  if (isDev) {
    void win.loadURL("http://localhost:5173");
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    void win.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) void shell.openExternal(url);
    return { action: "deny" };
  });
}

ipcMain.handle("spotify:open", () => {
  createSpotifyWindow();
  return { opened: true };
});

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});