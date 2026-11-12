import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("orpheonDesktop", {
  platform: process.platform,
  version: "0.1.0"
});