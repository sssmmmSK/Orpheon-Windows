import { app, BrowserWindow, WebContentsView, ipcMain, shell } from "electron";
import path from "node:path";
import fs from "node:fs";
import { SpotifyCdp } from "./cdp";

const isDev = !app.isPackaged;
let mainWindow: BrowserWindow | null = null;
let spotify: SpotifyCdp | null = null;
let spotifyView: WebContentsView | null = null;
let spotifyLoginVisible = false;
let spotifyReady = false;

function logDiagnostic(kind: string, details: unknown) {
  try {
    const logPath = path.join(app.getPath("userData"), "orpheon-diagnostics.log");
    const value = typeof details === "string" ? details : JSON.stringify(details);
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${kind}: ${value}\n`, "utf8");
  } catch { /* diagnostics must never prevent startup */ }
}

function showRendererFailure(message: string) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const escaped = message.slice(0, 1800).replace(/[&<>]/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;"
  }[c]!));
  const html = `<div style="min-height:100vh;background:#090a0c;color:#eee;font:14px Segoe UI;padding:48px;box-sizing:border-box"><h2 style="color:#d6ff6b">Orpheon не смог загрузить интерфейс</h2><p>Скопируй текст ошибки и отправь его в ChatGPT:</p><pre style="white-space:pre-wrap;background:#17181d;padding:18px;border-radius:8px;color:#ffb4b4">${escaped}</pre><p>Журнал: %APPDATA%\\orpheon-windows\\orpheon-diagnostics.log</p></div>`;
  void mainWindow.webContents.executeJavaScript(`document.body.innerHTML = ${JSON.stringify(html)};`).catch(() => undefined);
}

function send(channel: string, payload: unknown) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload);
}

function setSpotifyLoginVisible(visible: boolean) {
  if (!mainWindow || mainWindow.isDestroyed() || !spotifyView || spotifyView.webContents.isDestroyed()) return;
  spotifyLoginVisible = visible;
  const bounds = mainWindow.getContentBounds();
  spotifyView.setBounds(visible
    ? { x: 0, y: 0, width: bounds.width, height: bounds.height }
    : { x: 0, y: 0, width: 1, height: 1 });
}

async function launchSpotifyBrowser() {
  if (!mainWindow || mainWindow.isDestroyed()) throw new Error("Окно Orpheon ещё не готово");
  if (spotifyView && !spotifyView.webContents.isDestroyed()) {
    setSpotifyLoginVisible(!spotifyReady);
    return;
  }

  const bridgePath = path.join(app.getAppPath(), "electron", "player-bridge.js");
  spotifyView = new WebContentsView({
    webPreferences: {
      partition: "persist:orpheon-spotify",
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
      autoplayPolicy: "no-user-gesture-required"
    }
  });
  spotifyLoginVisible = true;
  spotifyReady = false;
  mainWindow.contentView.addChildView(spotifyView);
  setSpotifyLoginVisible(true);
  spotifyView.webContents.setAudioMuted(false);
  spotifyView.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://accounts.spotify.com/") || url.startsWith("https://open.spotify.com/")) {
      void spotifyView?.webContents.loadURL(url);
    } else if (url.startsWith("https://")) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });

  spotify = new SpotifyCdp(fs.readFileSync(bridgePath, "utf8"), spotifyView.webContents);
  spotify.on("status", status => {
    if (status.connected === false) {
      spotifyReady = false;
    }
    send("spotify:status", status);
  });
  spotify.on("bridge", message => {
    if (message.type === "state") send("spotify:state", message.state);
    else if (message.type === "queue") send("spotify:queue", message.queue);
    else if (message.type === "ready") {
      spotifyReady = true;
      setSpotifyLoginVisible(false);
      send("spotify:status", { connected: true, ready: true, message: "Spotify подключён внутри Orpheon" });
    }
    else if (message.type === "auth-required") send("spotify:status", { connected: true, ready: false, message: "Войдите в свой аккаунт Spotify в этом окне" });
    else if (message.type === "error") send("spotify:status", { connected: true, ready: false, message: message.error });
    else if (message.type === "jserror") logDiagnostic("spotify-page-error", message);
    else if (message.type === "net") logDiagnostic("spotify-network", message);
  });

  spotifyView.webContents.on("did-fail-load", (_event, code, description, url, isMainFrame) => {
    if (isMainFrame) {
      logDiagnostic("embedded-spotify-load-failed", { code, description, url });
      send("spotify:status", { connected: false, ready: false, message: "Не удалось загрузить Spotify: " + description });
    }
  });

  await spotify.connect();
  await spotifyView.webContents.loadURL("https://open.spotify.com/");
  send("spotify:status", { connected: true, ready: false, message: "Войдите в Spotify в окне Orpheon" });
}


function createWindow() {
  mainWindow = new BrowserWindow({
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
      sandbox: false
    }
  });

  const load = isDev
    ? mainWindow.loadURL("http://localhost:5173")
    : mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  void load.catch(error => {
    logDiagnostic("window-load-error", String(error));
    showRendererFailure(String(error));
  });

  mainWindow.webContents.on("did-finish-load", () => {
    void mainWindow?.webContents.executeJavaScript("Boolean(window.orpheonDesktop)")
      .then(available => {
        logDiagnostic("preload-bridge-check", { available });
        if (!available) showRendererFailure("Electron preload bridge is missing. Check preload-error in orpheon-diagnostics.log.");
      })
      .catch(error => logDiagnostic("preload-bridge-check-error", String(error)));
  });
  mainWindow.webContents.on("did-fail-load", (_event, code, description, url, isMainFrame) => {
    if (isMainFrame) {
      logDiagnostic("did-fail-load", { code, description, url });
      showRendererFailure(`${code}: ${description}\n${url}`);
    }
  });
  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    logDiagnostic("render-process-gone", details);
    showRendererFailure(`Renderer crashed: ${JSON.stringify(details)}`);
  });
  mainWindow.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    if (level >= 2) {
      logDiagnostic("renderer-console", { level, message, line, source: sourceId });
    }
  });
  mainWindow.webContents.on("preload-error", (_event, preloadPath, error) => {
    logDiagnostic("preload-error", { preloadPath, message: error.message, stack: error.stack });
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) void shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.on("resize", () => { if (spotifyLoginVisible) setSpotifyLoginVisible(true); });
  mainWindow.on("closed", () => { mainWindow = null; });
}

ipcMain.handle("spotify:launch", async () => {
  await launchSpotifyBrowser();
  return { opened: true };
});
ipcMain.handle("spotify:show-login", async () => {
  if (!spotifyView || spotifyView.webContents.isDestroyed()) return launchSpotifyBrowser();
  setSpotifyLoginVisible(true);
  await spotifyView.webContents.loadURL("https://open.spotify.com/");
  return { opened: true };
});
ipcMain.handle("spotify:command", async (_event, method: string, args?: Record<string, unknown>) => {
  if (!spotify) throw new Error("Сначала подключите Spotify");
  return spotify.call(method, args || {});
});

app.whenReady().then(() => {
  logDiagnostic("startup", {
    version: app.getVersion(),
    packaged: app.isPackaged,
    platform: process.platform,
    arch: process.arch
  });
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on("before-quit", () => { void spotify?.close(); });
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
