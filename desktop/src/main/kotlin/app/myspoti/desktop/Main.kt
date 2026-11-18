package app.myspoti.desktop

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Window
import androidx.compose.ui.window.application
import app.myspoti.api.Track
import kotlinx.coroutines.launch

private val Background = Color(0xFF090A0C)
private val Panel = Color(0xFF111318)
private val Accent = Color(0xFFD6FF6B)
private val Muted = Color(0xFF8A8D96)

fun main() = application {
    val runtime = DesktopRuntime()
    Window(onCloseRequest = { runtime.close(); exitApplication() }, title = "MySpoti") {
        MaterialTheme { MySpotiDesktopShell(runtime) }
    }
}

@Composable
private fun MySpotiDesktopShell(runtime: DesktopRuntime) {
    val connection by runtime.state.collectAsState()
    val player by runtime.playerState.collectAsState()
    val scope = rememberCoroutineScope()
    var section by remember { mutableStateOf("search") }
    var query by remember { mutableStateOf("") }
    var results by remember { mutableStateOf<List<Track>>(emptyList()) }
    var searchMessage by remember { mutableStateOf("") }
    var likedTracks by remember { mutableStateOf<List<Track>>(emptyList()) }
    var likedNextOffset by remember { mutableStateOf<Int?>(null) }
    var likedTotal by remember { mutableStateOf(0) }
    var libraryMessage by remember { mutableStateOf("") }
    var libraryLoading by remember { mutableStateOf(false) }

    fun loadLikedTracks(reset: Boolean) {
        if (libraryLoading) return
        val offset = if (reset) 0 else likedNextOffset ?: return
        libraryLoading = true
        scope.launch {
            runCatching { runtime.likedTracks(offset, 50) }
                .onSuccess { page ->
                    likedTracks = if (reset) page.items else likedTracks + page.items
                    likedNextOffset = page.nextOffset
                    likedTotal = page.total
                    libraryMessage = ""
                }
                .onFailure { libraryMessage = it.message ?: "Не удалось загрузить медиатеку" }
            libraryLoading = false
        }
    }

    val status = when (connection) {
        ConnectionState.Disconnected -> "Spotify не подключён"
        ConnectionState.StartingBrowser -> "Запуск браузера…"
        ConnectionState.Connecting -> "Подключение к Spotify…"
        ConnectionState.WaitingForSpotify -> "Войдите в Spotify в открывшемся окне браузера, затем нажмите «Проверить вход»."
        ConnectionState.Connected -> "Spotify подключён"
        is ConnectionState.Error -> "Ошибка: " + (connection as ConnectionState.Error).message
    }
    DisposableEffect(runtime) { onDispose { runtime.close() } }

    Row(
        modifier = Modifier.fillMaxSize().background(Background).padding(12.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Column(
            modifier = Modifier.width(232.dp).background(Panel, RoundedCornerShape(16.dp)).padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(18.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("◉", color = Accent, style = MaterialTheme.typography.headlineMedium)
                Spacer(Modifier.width(10.dp))
                Column {
                    Text("myspoti", color = Color.White, style = MaterialTheme.typography.titleLarge)
                    Text("WINDOWS", color = Muted, style = MaterialTheme.typography.labelSmall)
                }
            }
            Text("Главная", color = Muted, style = MaterialTheme.typography.bodyLarge)
            Text(
                "Поиск",
                color = if (section == "search") Color.White else Muted,
                style = MaterialTheme.typography.bodyLarge,
                modifier = Modifier.clickable { section = "search" },
            )
            Text(
                "Медиатека",
                color = if (section == "library") Color.White else Muted,
                style = MaterialTheme.typography.bodyLarge,
                modifier = Modifier.clickable {
                    section = "library"
                    if (likedTracks.isEmpty() && !libraryLoading) loadLikedTracks(reset = true)
                },
            )
            Spacer(Modifier.weight(1f))
            Text("СОСТОЯНИЕ", color = Muted, style = MaterialTheme.typography.labelSmall)
            Text(status, color = if (connection == ConnectionState.Connected) Accent else Muted, style = MaterialTheme.typography.bodySmall)
            Button(
                onClick = { scope.launch { runtime.connect() } },
                enabled = connection == ConnectionState.Disconnected || connection is ConnectionState.Error,
            ) { Text("Подключить Spotify") }
            if (connection == ConnectionState.WaitingForSpotify) {
                OutlinedButton(onClick = { scope.launch { runtime.checkSignIn() } }) { Text("Проверить вход") }
            }
            if (connection == ConnectionState.Connected) {
                OutlinedButton(onClick = { scope.launch { runtime.disconnect() } }) { Text("Отключить") }
            }
        }
        Column(
            modifier = Modifier.weight(1f).fillMaxSize(),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            if (section == "search") {
                Surface(modifier = Modifier.fillMaxWidth(), color = Panel, shape = RoundedCornerShape(16.dp)) {
                    Row(
                        modifier = Modifier.padding(horizontal = 18.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        OutlinedTextField(
                            value = query,
                            onValueChange = { query = it },
                            modifier = Modifier.weight(1f),
                            singleLine = true,
                            label = { Text("Поиск музыки и исполнителей") },
                        )
                        Button(
                            onClick = {
                                scope.launch {
                                    runCatching { runtime.searchTracks(query) }
                                        .onSuccess { results = it; searchMessage = if (it.isEmpty()) "Ничего не найдено" else "" }
                                        .onFailure { searchMessage = it.message ?: "Ошибка поиска" }
                                }
                            },
                            enabled = connection == ConnectionState.Connected && query.isNotBlank(),
                        ) { Text("Найти") }
                    }
                }
            }
            Box(
                modifier = Modifier.weight(1f).fillMaxWidth().background(Panel, RoundedCornerShape(16.dp)).padding(20.dp),
            ) {
                Column(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column {
                            Text(
                                if (section == "library") "Любимые треки" else "Результаты поиска",
                                color = Color.White,
                                style = MaterialTheme.typography.titleLarge,
                            )
                            if (section == "library") Text("$likedTotal треков в Spotify", color = Muted, style = MaterialTheme.typography.bodySmall)
                        }
                        Spacer(Modifier.weight(1f))
                        if (section == "library") {
                            OutlinedButton(enabled = !libraryLoading, onClick = { loadLikedTracks(reset = true) }) {
                                Text(if (libraryLoading) "Загрузка…" else "Обновить")
                            }
                        }
                    }
                    val visibleTracks = if (section == "library") likedTracks else results
                    val message = if (section == "library") libraryMessage else searchMessage
                    if (message.isNotBlank()) Text(message, color = Muted)
                    LazyColumn(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        items(visibleTracks, key = { it.uri }) { track ->
                            Surface(color = Color(0xFF191C22), shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(track.name, color = Color.White, maxLines = 1)
                                        Text(track.artists.joinToString { it.name }, color = Muted, maxLines = 1)
                                    }
                                    if (section == "search") {
                                        OutlinedButton(
                                            onClick = {
                                                scope.launch {
                                                    runCatching { runtime.saveTrack(track) }
                                                        .onFailure { searchMessage = it.message ?: "Не удалось добавить в любимые" }
                                                }
                                            },
                                        ) { Text("♡") }
                                    }
                                    Button(
                                        onClick = {
                                            scope.launch {
                                                runCatching { runtime.playTrack(track) }
                                                    .onFailure {
                                                        if (section == "library") libraryMessage = it.message ?: "Не удалось запустить"
                                                        else searchMessage = it.message ?: "Не удалось запустить"
                                                    }
                                            }
                                        },
                                    ) { Text("▶") }
                                }
                            }
                        }
                        if (section == "library" && likedNextOffset != null) {
                            item {
                                OutlinedButton(
                                    enabled = !libraryLoading,
                                    onClick = { loadLikedTracks(reset = false) },
                                ) { Text(if (libraryLoading) "Загрузка…" else "Загрузить ещё") }
                            }
                        }
                    }
                    if (visibleTracks.isEmpty() && !libraryLoading && message.isBlank()) {
                        Text(
                            if (section == "library") "Любимые треки пока не загружены или список пуст." else "Подключите Spotify и выполните поиск.",
                            color = Muted,
                        )
                    }
                }
            }
            Surface(color = Panel, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(player?.item?.name ?: "Нет воспроизводимого трека", color = Color.White, maxLines = 1)
                        Text(player?.item?.artists?.joinToString { it.name } ?: "Spotify Connect", color = Muted, maxLines = 1)
                    }
                    OutlinedButton(enabled = connection == ConnectionState.Connected, onClick = { scope.launch { runtime.previousTrack() } }) { Text("|◀") }
                    Button(enabled = connection == ConnectionState.Connected, onClick = { scope.launch { runtime.togglePlayback() } }) {
                        Text(if (player?.isPaused == false) "Ⅱ" else "▶")
                    }
                    OutlinedButton(enabled = connection == ConnectionState.Connected, onClick = { scope.launch { runtime.nextTrack() } }) { Text("▶|") }
                }
            }
        }
    }
}
