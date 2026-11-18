# Orpheon Windows

A native Windows desktop companion for the official Spotify Web Player, built on the desktop CDP host architecture from [Orpheon (formerly MySpoti)](https://github.com/kota-zo/Orpheon).

## Current Windows port

The active Compose Desktop port is developed on the `myspoti-windows-port` branch. The default `main` branch still contains the earlier Electron prototype.

The current port can launch Microsoft Edge or Google Chrome with a dedicated Orpheon browser profile, attach through Chrome DevTools Protocol (CDP), inject the upstream Orpheon Spotify bridge, receive player state, and send basic commands from its native UI.

The UI currently wires:
- Spotify Web Player sign-in through the official `open.spotify.com` page
- Track search
- A paged Liked Songs view (50 tracks per page)
- Add a track to Liked Songs
- Play a selected track, pause/resume, next and previous

**This is an early Windows port, not a complete MySpoti feature port.** The separate Edge/Chrome window remains visible and must stay open during playback. The complete Your Library experience (playlists, albums, artists and folders), queue management, seeking, shuffle/repeat and volume controls are not yet implemented in the Windows UI.

## Build and verification status

GitHub Actions successfully packaged Windows x64 EXE and MSI installers in [Build #27](https://github.com/sssmmmSK/Orpheon-Windows/actions/runs/44051092664). The [Build #27 artifact](https://github.com/sssmmmSK/Orpheon-Windows/actions/runs/44051092664/artifacts/14313288986) contains the CI-produced installers and is retained until 1 December 2026.

A successful CI package build confirms compilation and installer packaging only. It does **not** prove that Spotify sign-in, DRM/Widevine playback, or playback on a user's Windows PC works. Those still require an end-to-end test with the user's browser, network and Spotify account. Spotify Free compatibility is a test target, not a verified guarantee.

The app does not ask for or store the user's Spotify password. Authentication is performed on Spotify's official page in the dedicated browser profile. The Windows wrapper does not add a DRM bypass; protected playback is delegated to the official browser runtime, and Widevine playback remains unverified. The port reuses upstream Orpheon behavior, so compatibility and service behavior can change with upstream or Spotify updates. Use remains subject to Spotify's terms.

## First launch

1. Install and open MySpoti Windows.
2. Press **Подключить Spotify**.
3. A separate Edge or Chrome window opens with the dedicated MySpoti profile.
4. Sign in on the official `open.spotify.com` page.
5. Return to the desktop app and press **Проверить вход** if prompted.
6. Keep the browser window open while using the desktop controls.

Requirements: Windows 10/11 x64, Microsoft Edge or Google Chrome, and network access to Spotify. VPN routing and regional availability depend on the user's own setup.

## Development

The Compose Desktop port uses JDK 17 and Gradle. The CI workflow checks out the upstream Orpheon source at a pinned commit and builds both Windows package formats on a Windows runner:

- Workflow: [windows-desktop.yml](.github/workflows/windows-desktop.yml)
- Desktop port notes and milestones: [desktop/README.md](desktop/README.md)

## Upstream licensing

The port reuses Kotlin/JVM modules and the Spotify bridge from [kota-zo/Orpheon](https://github.com/kota-zo/Orpheon), licensed under GPL-3.0. See [LICENSE](./LICENSE). The project is not affiliated with or endorsed by Spotify AB; Spotify is a trademark of Spotify AB.
