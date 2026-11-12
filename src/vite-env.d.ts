/// <reference types="vite/client" />

declare global {
  interface Window {
    orpheonDesktop?: {
      platform: string;
      version: string;
      openSpotify: () => Promise<{ opened: boolean }>;
    };
  }
}

export {};