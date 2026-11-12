/// <reference types="vite/client" />

declare global {
  interface Window {
    orpheonDesktop?: {
      platform: string;
      version: string;
    };
  }
}

export {};