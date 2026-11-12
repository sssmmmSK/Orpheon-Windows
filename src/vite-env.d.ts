/// <reference types="vite/client" />
declare global {
  interface Window {
    orpheonDesktop?: {
      platform: string; version: string;
      launchSpotify: () => Promise<{ opened: boolean }>;
      command: (method: string, args?: Record<string, unknown>) => Promise<any>;
      onStatus: (callback: (value: any) => void) => () => void;
      onState: (callback: (value: any) => void) => () => void;
      onQueue: (callback: (value: any) => void) => () => void;
    };
  }
}
export {};
