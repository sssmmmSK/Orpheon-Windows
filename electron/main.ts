import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "node:path";
import fs from "node:fs";
import { spawn, ChildProcess } from "node:child_process";
import { SpotifyCdp } from "./cdp";

const isDev = !app.isPackaged;
let mainWindow: BrowserWindow | null = null;
let spotify: SpotifyCdp | null = null;
let launchPromise: Promise<void> | null = null;

function send(channel: string, payload: unknown) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload);
}
function browserCandidates(): string[] {
  if (process.platform !== "win32") return ["google-chrome", "chromium", "microsoft-edge"];
  const roots = [process.env.PROGRAMFILES, process.env["PROGRAMFILES(X86)"], process.env.LOCALAPPDATA].filter(Boolean) as string[];
  return roots.flatMap(root => [path.join(root, "Microsoft", "Edge", "Application", "msedge.exe"), path.join(root, "Google", "Chrome", "Application", "chrome.exe")]);
}
function findBrowser(): string { return browserCandidates().find(p => fs.existsSync(p)) || (process.platform === "win32" ? "" : "google-chrome"); }
async function waitForCdp(timeoutMs = 30000) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    try { const r = await fetch("http://127.0.0.1:9222/json/version"); if (r.ok) return; } catch { /* starting */ }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error("Не удалось запустить Chrome/Edge с удалённой отладкой. Попробуйте закрыть браузер и повторить.");
}
async function launchSpotifyBrowser() {
  if (launchPromise) return launchPromise;
  launchPromise = (async () => {
    const executable = findBrowser();
    if (!executable) throw new Error("Не найден Microsoft Edge или Google Chrome. Установите один из браузеров.");
    const profile = path.join(app.getPath("userData"), "spotify-browser-profile");
    fs.mkdirSync(profile, { recursive: true });
    let alreadyRunning = false;
    try { const r = await fetch("http://127.0.0.1:9222/json/version"); alreadyRunning = r.ok; } catch { /* launch below */ }
    if (!alreadyRunning) {
      const child: ChildProcess = spawn(executable, ["--remote-debugging-port=9222", `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check", "https://open.spotify.com/"], { detached: false, stdio: "ignore", windowsHide: false });
      child.on("error", e => send("spotify:status", { connected: false, message: e.message }));
    }
    await waitForCdp();
    if (!spotify) {
      const bridgePath = path.join(app.getAppPath(), "electron", "player-bridge.js");
      spotify = new SpotifyCdp(fs.readFileSync(bridgePath, "utf8"));
      spotify.on("status", status => send("spotify:status", status));
      spotify.on("bridge", message => {
        if (message.type === "state") send("spotify:state", message.state);
        else if (message.type === "queue") send("spotify:queue", message.queue);
        else if (message.type === "ready") send("spotify:status", { connected: true, ready: true, message: "Плеер Spotify готов" });
        else if (message.type === "error") send("spotify:status", { connected: true, ready: false, message: message.error });
      });
    }
    await spotify.connect();
    send("spotify:status", { connected: true, ready: false, message: "Ожидаю загрузки плеера Spotify…" });
  })().catch(error => { launchPromise = null; throw error; });
  return launchPromise;
}
function createWindow() {
  mainWindow = new BrowserWindow({ width: 1440, height: 900, minWidth: 980, minHeight: 640, backgroundColor: "#090a0c", title: "Orpheon Windows", autoHideMenuBar: true, webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false, sandbox: true } });
  if (isDev) void mainWindow.loadURL("http://localhost:5173"); else void mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  mainWindow.webContents.setWindowOpenHandler(({ url }) => { if (url.startsWith("https://")) void shell.openExternal(url); return { action: "deny" }; });
  mainWindow.on("closed", () => { mainWindow = null; });
}
ipcMain.handle("spotify:launch", async () => { await launchSpotifyBrowser(); return { opened: true }; });
ipcMain.handle("spotify:command", async (_event, method: string, args?: Record<string, unknown>) => { if (!spotify) throw new Error("Сначала подключите Spotify"); return spotify.call(method, args || {}); });
app.whenReady().then(() => { createWindow(); app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); }); });
app.on("before-quit", () => { void spotify?.close(); });
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
