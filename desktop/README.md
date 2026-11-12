# MySpoti for Windows — porting plan

This branch starts a GPL-3.0 Windows desktop port of the original MySpoti/Orpheon codebase. It replaces the earlier Electron prototype rather than extending its React mock UI.

## Grounded upstream architecture

- The upstream repository is `kota-zo/Orpheon` (formerly `kota-zo/myspoti`).
- `:api` is a plain Kotlin/JVM contract and has no Android dependency.
- `:api-spotify` is also Kotlin/JVM and implements Spotify catalog, search, library and player operations.
- `:host-cdp` is Kotlin/JVM and already speaks Chrome DevTools Protocol. It is currently used by integration tests, not shipped as a desktop app.
- The production UI is in `:app` and is currently an Android application. It cannot simply be packaged as a Windows EXE.
- `:host-android`, Android media services, Android Auto, Wear OS and Android-only storage/DRM integrations are not Windows components.

## Windows architecture

1. Keep the original GPL-3.0 Kotlin API and Spotify implementation; do not reimplement Spotify endpoints in JavaScript.
2. Add a Windows/Linux JVM desktop host based on Compose Multiplatform.
3. Reuse `:api`, `:api-spotify`, `:engine` where platform-neutral, and `:host-cdp`; add a production CDP host lifecycle (launch Chrome with a dedicated profile, attach, inject the upstream bridge, recover from browser restarts, close cleanly).
4. Port the MySpoti Compose screens into a desktop source set incrementally. Android-only services are replaced by desktop equivalents; the visual language and navigation should remain recognizably MySpoti.
5. Package a Windows x64 installer. Chrome is an internal playback runtime: after Spotify sign-in, its window should be hidden/minimized and the user should operate the music from the desktop UI. No browser page should cover the app.
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
- [ ] Add a JVM desktop host and a minimal Compose Desktop shell.
- [ ] Connect the host to the upstream Spotify API/bridge and validate login/state.
- [ ] Port core MySpoti screens and navigation.
- [ ] Add installer packaging and Windows CI.
- [ ] Test on the user's Windows 11 + Amnezia VPN + Spotify Free setup.

This is a porting plan, not a claim that a working Windows build already exists.
