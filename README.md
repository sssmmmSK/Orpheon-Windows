# Orpheon Windows

A Windows desktop companion for the official Spotify Web Player, using the desktop CDP host architecture from [Orpheon (formerly MySpoti)](https://github.com/kota-zo/Orpheon).

## Current status

**0.2.0 — first CDP integration build.** The demo track list has been removed. The app can launch Microsoft Edge or Google Chrome with a dedicated Orpheon browser profile, attach through Chrome DevTools Protocol, inject the upstream Orpheon player bridge, receive player state, and send basic playback commands from the native UI.

The Spotify login and DRM-protected playback still need to be verified on a real Windows machine. Spotify may change its internal Web Player services, which can break the bridge. This build does not use Spotify Web Playback SDK or Spotify Web API playback endpoints, so it is designed to work with a free Spotify account. It does not remove or skip Spotify advertisements.

## First launch

1. Install and open Orpheon Windows.
2. Press **Подключить Spotify**.
3. A separate Edge or Chrome window opens with a dedicated Orpheon profile.
4. Sign in on the official `open.spotify.com` page.
5. Wait for the app status to say **Плеер Spotify готов**.
6. Use the controls in Orpheon Windows. The browser window must remain open.

The dedicated browser profile keeps the Spotify session separate from your normal browser profile. The app does not ask for or store your Spotify password.

## Requirements

- Windows 10/11 x64
- Microsoft Edge or Google Chrome
- Internet access to Spotify (regional availability and VPN configuration remain the user's responsibility)

## Development

Requirements: Node.js 22 and npm.

```bash
npm install
npm run dev
```

Build the Windows installer:

```bash
npm run typecheck
npm run build
```

The installer is written to `release/`.

## Architecture and upstream licensing

The desktop host uses Chrome DevTools Protocol to communicate with the official desktop browser Web Player. The player bridge is derived from:

- Project: [kota-zo/Orpheon](https://github.com/kota-zo/Orpheon)
- Upstream file: `base/api-spotify/src/main/resources/bridge/player-bridge.js`
- Copyright: Orpheon contributors
- License: GNU General Public License v3.0 (see [LICENSE](./LICENSE))

The upstream bridge is included in `electron/player-bridge.js` with its original header retained. This project and its combined distribution are licensed under GPL-3.0-only.

This project is not affiliated with or endorsed by Spotify AB. Spotify is a trademark of Spotify AB. Use of Spotify services remains subject to Spotify's terms. Ads are not blocked.
