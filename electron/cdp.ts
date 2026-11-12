import { EventEmitter } from "node:events";
import type { WebContents } from "electron";

export class SpotifyCdp extends EventEmitter {
  private bridge = "";
  private reconnecting = false;
  private attached = false;
  private readonly onDebuggerMessage = (_event: Electron.Event, method: string, params: Record<string, any>) => {
    if (method === "Runtime.bindingCalled" && params?.name === "__mspHostPost") {
      try { this.emit("bridge", JSON.parse(params.payload)); } catch { /* malformed page message */ }
    }
    if (method === "Page.frameNavigated" && params?.frame?.parentId == null && params?.frame?.url?.startsWith("https://open.spotify.com")) {
      setTimeout(() => void this.inject(), 900);
    }
  };

  constructor(bridge: string, private readonly contents: WebContents) {
    super();
    this.bridge = bridge;
  }

  async connect(): Promise<void> {
    if (this.reconnecting) return;
    this.reconnecting = true;
    try {
      const debuggerApi = this.contents.debugger;
      if (!debuggerApi.isAttached()) debuggerApi.attach("1.3");
      if (!this.attached) {
        debuggerApi.on("message", this.onDebuggerMessage);
        debuggerApi.on("detach", (_event, reason) => {
          this.emit("status", { connected: false, message: "Встроенный плеер отключён: " + reason });
        });
        this.attached = true;
      }
      await this.send("Runtime.enable");
      await this.send("Page.enable");
      await this.send("Runtime.addBinding", { name: "__mspHostPost" });
      await this.send("Page.addScriptToEvaluateOnNewDocument", { source: this.bridge });
      this.emit("status", { connected: true, message: "Встроенный Spotify запущен" });
    } finally {
      this.reconnecting = false;
    }
  }

  private async inject() {
    try {
      await this.send("Runtime.evaluate", { expression: this.bridge, awaitPromise: false, returnByValue: true });
    } catch (error) {
      this.emit("status", { connected: true, ready: false, message: "Ожидаю загрузки Spotify: " + String(error) });
    }
  }

  private send(method: string, params: Record<string, unknown> = {}): Promise<any> {
    if (!this.contents.debugger.isAttached()) return Promise.reject(new Error("Встроенный Spotify отключён"));
    return this.contents.debugger.sendCommand(method, params);
  }

  async call(method: string, args: Record<string, unknown> = {}): Promise<any> {
    const expression = `(async()=>{if(!window.Myspoti)throw new Error("Spotify player bridge is not ready");return await window.Myspoti.call("host-"+Date.now()+"-"+Math.random(), ${JSON.stringify(method)}, ${JSON.stringify(args)})})()`;
    const result = await this.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || "Spotify command failed");
    return result.result?.value ?? null;
  }

  async close() {
    try {
      this.contents.debugger.removeListener("message", this.onDebuggerMessage);
      if (this.contents.debugger.isAttached()) this.contents.debugger.detach();
    } catch { /* ignored during shutdown */ }
    this.attached = false;
  }
}
