# MySpoti for Windows — porting plan

This branch is an early GPL-3.0 Windows desktop port of the original MySpoti/Orpheon codebase. It now produces Windows x64 EXE and MSI installers in GitHub Actions. A successful package build confirms that the app can be compiled and packaged; it does **not** prove end-to-end Spotify sign-in, DRM playback, or reliable operation on a user's PC.

The current Compose Desktop UI is an early port, not a complete copy of the Android MySpoti interface. It now has track search, a paged Liked Songs view (50 tracks per page), save-to-liked and basic playback controls. The app launches Microsoft Edge or Google Chrome with a dedicated profile. That browser window remains visible during sign-in and playback; hiding it or embedding the playback surface is not implemented yet. The complete library (playlists, albums, artists and folders), queue management, seeking, shuffle/repeat and volume controls remain unfinished.

## Grounded upstream architecture

- The upstream repository is `kota-zo/Orpheon` (formerly `kota-zo/myspoti`).
- `:api` is a plain Kotlin/JVM contract and has no Android dependency.
- `:api-spotify` is also Kotlin/JVM and implements Spotify catalog, search, library and player operations.
- `:host-cdp` is Kotlin/JVM and contains the production `CdpHost` implementation for Chrome DevTools Protocol, plus live integration tests. It is a reusable desktop playback host, but not a packaged desktop application or UI.
- The production UI is in `:app` and is currently an Android application. It cannot simply be packaged as a Windows EXE.
- `:host-android`, Android media services, Android Auto, Wear OS and Android-only storage/DRM integrations are not Windows components.

## Windows architecture

1. Keep the original GPL-3.0 Kotlin API and Spotify implementation; do not reimplement Spotify endpoints in JavaScript.
2. Add a Windows/Linux JVM desktop host based on Compose Multiplatform.
3. Reuse `:api`, `:api-spotify`, `:engine` where platform-neutral, and `:host-cdp`; add a production CDP host lifecycle (launch Chrome or Microsoft Edge with a dedicated profile, attach, inject the upstream bridge, recover from browser restarts, close cleanly).
4. Port the MySpoti Compose screens into a desktop source set incrementally. Android-only services are replaced by desktop equivalents; the visual language and navigation should remain recognizably MySpoti.
5. Package a Windows x64 installer. Chrome or Edge is the playback runtime. The current version still leaves its browser window visible; hiding/minimizing it after sign-in is a future requirement, not an implemented feature.
6. Keep GPL-3.0 notices and publish the complete corresponding source with every distributed build.

## Acceptance criteria

- First-run sign-in works through Spotify's official login page.
- Once signed in, the browser surface no longer obscures the MySpoti UI.
- Search, library, liked tracks, playlists, queue, play/pause, next/previous, seek, shuffle/repeat and volume are driven by the MySpoti desktop UI.
- Free-account compatibility is tested; no Premium-only Web Playback SDK is introduced.
- VPN routing on Windows is documented and the browser process uses the system network route.
- CI produces a Windows x64 installer and reports test/build failures honestly.

## Milestones

- [x] Inspect upstream modules and establish the platform boundary.
- [x] Add a JVM desktop host and a minimal Compose Desktop shell.
- [x] Wire the desktop host to the upstream Spotify API and CDP host (implementation present; real-world sign-in and playback remain unverified).
- [ ] Verify Spotify sign-in, player state and DRM-protected playback on Windows.
- [ ] Port the full MySpoti screens and navigation, including library, playlists, queue, seek and volume.
- [x] Produce Windows x64 EXE/MSI installers in GitHub Actions.
- [ ] Test on the user's Windows 11 + Amnezia VPN + Spotify Free setup.

This is an early Windows port with a verified CI package build, not a claim that the complete MySpoti experience is already working.
