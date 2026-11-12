import { contextBridge, ipcRenderer } from "electron";
contextBridge.exposeInMainWorld("orpheonDesktop", {
  platform: process.platform, version: "0.2.0",
  launchSpotify: () => ipcRenderer.invoke("spotify:launch"),
  command: (method: string, args?: Record<string, unknown>) => ipcRenderer.invoke("spotify:command", method, args),
  onStatus: (callback: (value: any) => void) => { const listener = (_e: Electron.IpcRendererEvent, value: any) => callback(value); ipcRenderer.on("spotify:status", listener); return () => ipcRenderer.removeListener("spotify:status", listener); },
  onState: (callback: (value: any) => void) => { const listener = (_e: Electron.IpcRendererEvent, value: any) => callback(value); ipcRenderer.on("spotify:state", listener); return () => ipcRenderer.removeListener("spotify:state", listener); },
  onQueue: (callback: (value: any) => void) => { const listener = (_e: Electron.IpcRendererEvent, value: any) => callback(value); ipcRenderer.on("spotify:queue", listener); return () => ipcRenderer.removeListener("spotify:queue", listener); }
});
