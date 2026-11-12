import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "node:path";
import fs from "node:fs";
import { spawn, ChildProcess } from "node:child_process";
import { SpotifyCdp } from "./cdp";

const isDev = !app.isPackaged;
let mainWindow: BrowserWindow | null = null;
let spotify: SpotifyCdp | null = null;
let launchPromise: Promise<void> | null = null;

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

function browserCandidates(): string[] {
  if (process.platform !== "win32") return ["google-chrome", "chromium", "microsoft-edge"];
  const roots = [process.env.PROGRAMFILES, process.env["PROGRAMFILES(X86)"], process.env.LOCALAPPDATA].filter(Boolean) as string[];
  return roots.flatMap(root => [
    path.join(root, "Microsoft", "Edge", "Application", "msedge.exe"),
    path.join(root, "Google", "Chrome", "Application", "chrome.exe")
  ]);
}

function findBrowser(): string {
  return browserCandidates().find(p => fs.existsSync(p)) || (process.platform === "win32" ? "" : "google-chrome");
}

async function waitForCdp(timeoutMs = 30000) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    try {
      const r = await fetch("http://127.0.0.1:9222/json/version");
      if (r.ok) return;
    } catch { /* browser is starting */ }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error("Не удалось запустить Chrome/Edge с удалённой отладкой. Закройте браузер и повторите.");
}

async function launchSpotifyBrowser() {
  if (launchPromise) return launchPromise;
  launchPromise = (async () => {
    const executable = findBrowser();
    if (!executable) throw new Error("Не найден Microsoft Edge или Google Chrome. Установите один из браузеров.");
    const profile = path.join(app.getPath("userData"), "spotify-browser-profile");
    fs.mkdirSync(profile, { recursive: true });

    let alreadyRunning = false;
    try {
      const r = await fetch("http://127.0.0.1:9222/json/version");
      alreadyRunning = r.ok;
    } catch { /* launch below */ }

    if (!alreadyRunning) {
      const child: ChildProcess = spawn(executable, [
        "--remote-debugging-port=9222",
        `--user-data-dir=${profile}`,
        "--no-first-run",
        "--no-default-browser-check",
        "https://open.spotify.com/"
      ], { detached: false, stdio: "ignore", windowsHide: false });
      child.on("error", e => send("spotify:status", { connected: false, message: e.message }));
    }

    await waitForCdp();
    if (!spotify) {
      const bridgePath = path.join(app.getAppPath(), "electron", "player-bridge.js");
      spotify = new SpotifyCdp(fs.readFileSync(bridgePath, "utf8"));
      spotify.on("status", status => {\n        if (status.connected === false) launchPromise = null;\n        send("spotify:status", status);\n      });
      spotify.on("bridge", message => {
        if (message.type === "state") send("spotify:state", message.state);
        else if (message.type === "queue") send("spotify:queue", message.queue);
        else if (message.type === "ready") send("spotify:status", { connected: true, ready: true, message: "Плеер Spotify готов" });
        else if (message.type === "error") send("spotify:status", { connected: true, ready: false, message: message.error });
        else if (message.type === "jserror") logDiagnostic("spotify-page-error", message);
        else if (message.type === "net") logDiagnostic("spotify-network", message);
      });
    }
    await spotify.connect();
    send("spotify:status", { connected: true, ready: false, message: "Ожидаю загрузки плеера Spotify…" });
  })().catch(error => {
    launchPromise = null;
    throw error;
  });
  return launchPromise;
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
  mainWindow.webContents.on("console-message", (_event, details) => {
    if (details.level >= 2) {
      logDiagnostic("renderer-console", {
        level: details.level,
        message: details.message,
        line: details.lineNumber,
        source: details.sourceId
      });
    }
  });
  mainWindow.webContents.on("preload-error", (_event, preloadPath, error) => {
    logDiagnostic("preload-error", { preloadPath, message: error.message, stack: error.stack });
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) void shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.on("closed", () => { mainWindow = null; });
}

ipcMain.handle("spotify:launch", async () => {
  await launchSpotifyBrowser();
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
