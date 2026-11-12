# Orpheon Windows

An independent Windows desktop port project inspired by [Orpheon](https://github.com/kota-zo/Orpheon).

## Current status

**Prototype / foundation (0.1.0).** This repository currently contains the Windows desktop shell, a dark UI prototype, and a Windows CI build workflow. Spotify authentication, real account data, playback, queue, and library synchronization are not implemented yet. The visible track rows are sample UI data and do not play audio.

## Stack

- Electron + React + TypeScript + Vite
- Windows x64 installer via electron-builder / NSIS
- GitHub Actions workflow for reproducible Windows builds

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

## Planned work

1. Validate a supported desktop playback runtime for Spotify's Web Player.
2. Implement secure Spotify sign-in (OAuth/PKCE where supported) without storing passwords.
3. Replace sample data with real home, search, library, playlist, and album data.
4. Implement playback state, queue, device selection, and media-key integration.
5. Add settings, diagnostics, packaging, and end-to-end tests.

## Upstream and licensing

Orpheon is an Android application maintained by kota-zo and is licensed under GPL-3.0. This repository is an independent Windows port project; upstream code will only be incorporated with its license and notices preserved. See the upstream repository for its current source and license.

This project is not affiliated with or endorsed by Spotify AB. Spotify is a trademark of Spotify AB. Use of Spotify services remains subject to Spotify's terms.
