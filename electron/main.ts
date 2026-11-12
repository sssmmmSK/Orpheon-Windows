import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "node:path";

const isDev = !app.isPackaged;
let spotifyWindow: BrowserWindow | null = null;

const spotifyAuthHosts = new Set([
  "open.spotify.com",
  "accounts.spotify.com",
  "spotify.com",
  "accounts.google.com",
  "appleid.apple.com",
  "www.facebook.com",
  "login.live.com",
  "login.microsoftonline.com"
]);

function isSpotifyOrAuthUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    return url.protocol === "https:" &&
      [...spotifyAuthHosts].some(host => url.hostname === host || url.hostname.endsWith("." + host));
  } catch {
    return false;
  }
}

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

  // Spotify officially supports mainstream desktop browsers, not Electron's
  // product-specific user-agent token. Keep Chromium's real version but omit
  // the Electron marker so the page follows its normal Chrome code path.
  const chromiumUserAgent = spotifyWindow.webContents.getUserAgent()
    .replace(" Electron/" + process.versions.electron, "");
  spotifyWindow.webContents.setUserAgent(chromiumUserAgent);

  // OAuth providers open separate HTTPS windows during sign-in. Keep known
  // identity-provider flows inside this persistent Spotify session.
  spotifyWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isSpotifyOrAuthUrl(url)) return { action: "allow" };
    if (url.startsWith("https://")) void shell.openExternal(url);
    return { action: "deny" };
  });

  spotifyWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (isMainFrame) {
      console.error("[Spotify] Page load failed:", errorCode, errorDescription, validatedURL);
    }
  });

  spotifyWindow.webContents.on("render-process-gone", (_event, details) => {
    console.error("[Spotify] Renderer process exited:", details.reason, details.exitCode);
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
