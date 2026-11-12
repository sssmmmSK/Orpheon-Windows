import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("orpheonDesktop", {
  platform: process.platform,
  version: "0.1.0",
  openSpotify: () => ipcRenderer.invoke("spotify:open")
});