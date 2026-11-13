package app.myspoti.desktop

import app.myspoti.host.cdp.CdpHost
import app.myspoti.api.PlayerState
import app.myspoti.api.Track
import app.myspoti.spotify.SpotifyApi
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeout
import java.io.File
import java.net.ServerSocket
import java.net.URL
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.util.concurrent.TimeUnit

sealed interface ConnectionState {
    data object Disconnected : ConnectionState
    data object StartingBrowser : ConnectionState
    data object Connecting : ConnectionState
    data object WaitingForSpotify : ConnectionState
    data object Connected : ConnectionState
    data class Error(val message: String) : ConnectionState
}

/**
 * Windows desktop lifecycle for the upstream Spotify Web Player bridge.
 * Chrome owns the official web session/audio pipeline; the Compose app remains the control surface.
 */
class DesktopRuntime : AutoCloseable {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val mutableState = MutableStateFlow<ConnectionState>(ConnectionState.Disconnected)
    val state: StateFlow<ConnectionState> = mutableState.asStateFlow()
    private val mutablePlayerState = MutableStateFlow<PlayerState?>(null)
    val playerState: StateFlow<PlayerState?> = mutablePlayerState.asStateFlow()

    @Volatile private var chrome: Process? = null
    @Volatile private var host: CdpHost? = null
    @Volatile private var spotify: SpotifyApi? = null
    @Volatile private var debuggingPort: Int = -1

    suspend fun connect() {
        if (mutableState.value !is ConnectionState.Disconnected && mutableState.value !is ConnectionState.Error) return
        try {
            mutableState.value = ConnectionState.StartingBrowser
            val browserExe = findBrowser() ?: error("Не найден Microsoft Edge или Google Chrome. Установите один из этих браузеров и повторите подключение.")
            val profile = profileDirectory()
            val port = ServerSocket(0).use { it.localPort }
            debuggingPort = port
            chrome = withContext(Dispatchers.IO) {
                ProcessBuilder(
                    browserExe.absolutePath,
                    "--remote-debugging-port=$port",
                    "--remote-allow-origins=*",
                    "--user-data-dir=${profile.toAbsolutePath()}",
                    "--no-first-run",
                    "--no-default-browser-check",
                    "--disable-session-crashed-bubble",
                    "--new-window",
                    "https://open.spotify.com/"
                ).redirectErrorStream(true).start()
            }

            withTimeout(30_000) {
                while (!chrome!!.isAlive || !cdpAvailable(port)) delay(250)
            }

            mutableState.value = ConnectionState.Connecting
            val cdp = CdpHost.connect("http://127.0.0.1:$port")
            host = cdp
            val api = SpotifyApi(cdp, scope)
            spotify = api
            scope.launch { api.player.state.collect { mutablePlayerState.value = it } }

            // Force a deterministic page-load event after the CDP listeners are installed.
            coroutineScope {
                val pageLoaded = async { cdp.awaitLoad() }
                cdp.reload()
                withTimeout(60_000) { pageLoaded.await() }
            }
            api.onPageLoaded()
            mutableState.value = ConnectionState.WaitingForSpotify
            withTimeout(90_000) { api.awaitReady() }

            if (api.isSignedIn()) {
                mutableState.value = ConnectionState.Connected
            } else {
                // The user completes the official Spotify login in the Chrome window.
                mutableState.value = ConnectionState.WaitingForSpotify
            }
        } catch (t: Throwable) {
            disconnectInternal()
            mutableState.value = ConnectionState.Error(t.message ?: t.javaClass.simpleName)
        }
    }

    /** Re-check after the user has finished signing in through Spotify's official page. */
    suspend fun checkSignIn(): Boolean {
        val api = spotify ?: return false
        return try {
            val signedIn = withTimeout(15_000) { api.isSignedIn() }
            mutableState.value = if (signedIn) ConnectionState.Connected else ConnectionState.WaitingForSpotify
            signedIn
        } catch (t: Throwable) {
            mutableState.value = ConnectionState.Error(t.message ?: "Не удалось проверить авторизацию")
            false
        }
    }

    fun api(): SpotifyApi? = spotify

    suspend fun searchTracks(query: String): List<Track> {
        if (query.isBlank()) return emptyList()
        return spotify?.search?.tracks(query.trim(), limit = 25)?.items.orEmpty()
    }

    suspend fun playTrack(track: Track) {
        val api = spotify ?: error("Сначала подключите Spotify")
        api.player.play(track.uri, track.uri)
    }

    suspend fun togglePlayback() {
        val api = spotify ?: error("Сначала подключите Spotify")
        if (mutablePlayerState.value?.isPaused == false) api.player.pause() else api.player.resume()
    }

    suspend fun nextTrack() { spotify?.player?.next() ?: error("Spotify не подключён") }
    suspend fun previousTrack() { spotify?.player?.previous() ?: error("Spotify не подключён") }
    suspend fun saveTrack(track: Track) {
        val api = spotify ?: error("Сначала подключите Spotify")
        api.library.add(listOf(track.uri))
    }

    suspend fun disconnect() {
        disconnectInternal()
        mutableState.value = ConnectionState.Disconnected
    }

    private fun disconnectInternal() {
        runCatching { host?.close() }
        host = null
        spotify = null
        mutablePlayerState.value = null
        chrome?.let { process ->
            runCatching { process.destroy() }
            runCatching { if (!process.waitFor(2, TimeUnit.SECONDS)) process.destroyForcibly() }
        }
        chrome = null
    }

    private suspend fun cdpAvailable(port: Int): Boolean = withContext(Dispatchers.IO) {
        runCatching {
            URL("http://127.0.0.1:$port/json/version").openConnection().apply {
                connectTimeout = 500
                readTimeout = 500
            }.getInputStream().use { it.read() >= 0 }
        }.getOrDefault(false)
    }

    private fun findBrowser(): File? {
        // Prefer Chrome when installed; Windows 10/11 also ships with Edge.
        val candidates = listOfNotNull(
            System.getenv("PROGRAMFILES")?.let { File(it, "Google/Chrome/Application/chrome.exe") },
            System.getenv("PROGRAMFILES(X86)")?.let { File(it, "Google/Chrome/Application/chrome.exe") },
            System.getenv("LOCALAPPDATA")?.let { File(it, "Google/Chrome/Application/chrome.exe") },
            System.getenv("PROGRAMFILES")?.let { File(it, "Microsoft/Edge/Application/msedge.exe") },
            System.getenv("PROGRAMFILES(X86)")?.let { File(it, "Microsoft/Edge/Application/msedge.exe") },
            System.getenv("LOCALAPPDATA")?.let { File(it, "Microsoft/Edge/Application/msedge.exe") },
            File("C:/Program Files/Google/Chrome/Application/chrome.exe"),
            File("C:/Program Files (x86)/Google/Chrome/Application/chrome.exe"),
            File("C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"),
            File("C:/Program Files/Microsoft/Edge/Application/msedge.exe")
        )
        return candidates.firstOrNull { it.isFile }
    }

    private fun profileDirectory(): Path {
        val base = System.getenv("LOCALAPPDATA")?.let { Paths.get(it) }
            ?: Paths.get(System.getProperty("user.home"))
        val dir = base.resolve("MySpoti").resolve("ChromeProfile")
        Files.createDirectories(dir)
        return dir
    }

    override fun close() {
        disconnectInternal()
        scope.cancel()
    }
}
