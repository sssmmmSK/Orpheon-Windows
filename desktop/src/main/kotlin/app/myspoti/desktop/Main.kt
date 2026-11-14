package app.myspoti.desktop

import androidx.compose.foundation.background
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
    var query by remember { mutableStateOf("") }
    var results by remember { mutableStateOf<List<Track>>(emptyList()) }
    var searchMessage by remember { mutableStateOf("") }

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
            Text("Главная", color = Color.White, style = MaterialTheme.typography.bodyLarge)
            Text("Поиск", color = Muted, style = MaterialTheme.typography.bodyLarge)
            Text("Медиатека", color = Muted, style = MaterialTheme.typography.bodyLarge)
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
            Box(
                modifier = Modifier.weight(1f).fillMaxWidth().background(Panel, RoundedCornerShape(16.dp)).padding(20.dp),
            ) {
                Column(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Результаты поиска", color = Color.White, style = MaterialTheme.typography.titleLarge)
                    if (searchMessage.isNotBlank()) Text(searchMessage, color = Muted)
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(results, key = { it.uri }) { track ->
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
                                    OutlinedButton(
                                        onClick = {
                                            scope.launch {
                                                runCatching { runtime.saveTrack(track) }
                                                    .onFailure { searchMessage = it.message ?: "Не удалось добавить в любимые" }
                                            }
                                        },
                                    ) { Text("♡") }
                                    Button(
                                        onClick = {
                                            scope.launch {
                                                runCatching { runtime.playTrack(track) }
                                                    .onFailure { searchMessage = it.message ?: "Не удалось запустить" }
                                            }
                                        },
                                    ) { Text("▶") }
                                }
                            }
                        }
                    }
                    if (results.isEmpty() && searchMessage.isBlank()) {
                        Spacer(Modifier.weight(1f))
                        Text("Подключите Spotify и выполните поиск.", color = Muted)
                        Spacer(Modifier.weight(1f))
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
