import { EventEmitter } from "node:events";
import WebSocket from "ws";

type Target = { id: string; type: string; url: string; webSocketDebuggerUrl: string };
type CdpMessage = { id?: number; method?: string; params?: any; result?: any; error?: any };

export class SpotifyCdp extends EventEmitter {
  private socket: WebSocket | null = null;
  private seq = 0;
  private pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();
  private targetId = "";
  private bridge = "";
  private reconnecting = false;

  constructor(bridge: string) { super(); this.bridge = bridge; }

  async connect(): Promise<void> {
    if (this.reconnecting) return;
    this.reconnecting = true;
    try {
      const response = await fetch("http://127.0.0.1:9222/json/list");
      if (!response.ok) throw new Error("Chrome DevTools endpoint is unavailable");
      const targets = await response.json() as Target[];
      let target = targets.find(t => t.type === "page" && t.url.startsWith("https://open.spotify.com"));
      if (!target) {
        const opened = await fetch("http://127.0.0.1:9222/json/new?https://open.spotify.com/", { method: "PUT" });
        if (!opened.ok) throw new Error("Could not open Spotify tab in the browser");
        target = await opened.json() as Target;
      }
      if (!target.webSocketDebuggerUrl) throw new Error("Spotify tab has no CDP WebSocket endpoint");
      this.targetId = target.id;
      this.socket = new WebSocket(target.webSocketDebuggerUrl);
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("CDP connection timed out")), 10000);
        this.socket!.once("open", () => { clearTimeout(timer); resolve(); });
        this.socket!.once("error", e => { clearTimeout(timer); reject(e); });
      });
      this.socket.on("message", data => void this.onMessage(data.toString()));
      this.socket.on("close", () => { this.emit("status", { connected: false, message: "Browser connection closed" }); this.rejectPending(); });
      this.socket.on("error", e => this.emit("status", { connected: false, message: e.message }));
      await this.send("Runtime.enable");
      await this.send("Page.enable");
      await this.send("Runtime.addBinding", { name: "__mspHostPost" });
      await this.send("Page.addScriptToEvaluateOnNewDocument", { source: this.bridge });
      await this.send("Runtime.evaluate", { expression: this.bridge, awaitPromise: false, returnByValue: true });
      this.emit("status", { connected: true, message: "Spotify browser connected" });
    } finally { this.reconnecting = false; }
  }

  private async onMessage(raw: string) {
    let msg: CdpMessage;
    try { msg = JSON.parse(raw); } catch { return; }
    if (msg.id && this.pending.has(msg.id)) {
      const p = this.pending.get(msg.id)!; this.pending.delete(msg.id);
      if (msg.error) p.reject(new Error(msg.error.message || "CDP error")); else p.resolve(msg.result);
      return;
    }
    if (msg.method === "Runtime.bindingCalled" && msg.params?.name === "__mspHostPost") {
      try { this.emit("bridge", JSON.parse(msg.params.payload)); } catch { /* malformed page message */ }
    }
    if (msg.method === "Page.frameNavigated" && msg.params?.frame?.url?.startsWith("https://open.spotify.com")) {
      setTimeout(() => void this.inject(), 900);
    }
  }

  private async inject() {
    try { await this.send("Runtime.evaluate", { expression: this.bridge, awaitPromise: false }); } catch { /* next navigation/ready event retries */ }
  }

  private send(method: string, params: Record<string, unknown> = {}): Promise<any> {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return Promise.reject(new Error("Spotify browser is not connected"));
    const id = ++this.seq;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket!.send(JSON.stringify({ id, method, params }), error => {
        if (error) { this.pending.delete(id); reject(error); }
      });
      setTimeout(() => { const p = this.pending.get(id); if (p) { this.pending.delete(id); p.reject(new Error("CDP command timed out")); } }, 15000);
    });
  }

  async call(method: string, args: Record<string, unknown> = {}): Promise<any> {
    const expression = `(async()=>{if(!window.Myspoti)throw new Error("Spotify player bridge is not ready");return await window.Myspoti.call("host-"+Date.now()+"-"+Math.random(), ${JSON.stringify(method)}, ${JSON.stringify(args)})})()`;
    const result = await this.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || "Spotify command failed");
    return result.result?.value ?? null;
  }

  async close() {
    try { this.socket?.close(); } catch { /* ignored */ }
    this.socket = null;
    this.rejectPending();
  }

  private rejectPending() {
    for (const p of this.pending.values()) p.reject(new Error("Spotify browser disconnected"));
    this.pending.clear();
  }
}
