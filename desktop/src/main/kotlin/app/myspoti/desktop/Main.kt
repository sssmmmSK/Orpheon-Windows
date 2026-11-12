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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Window
import androidx.compose.ui.window.application

private val Background = Color(0xFF090A0C)
private val Panel = Color(0xFF111318)
private val Accent = Color(0xFFD6FF6B)
private val Muted = Color(0xFF8A8D96)

fun main() = application {
    Window(
        onCloseRequest = ::exitApplication,
        title = "MySpoti",
    ) {
        MaterialTheme {
            MySpotiDesktopShell()
        }
    }
}

@Composable
private fun MySpotiDesktopShell() {
    Row(
        modifier = Modifier.fillMaxSize().background(Background).padding(12.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Column(
            modifier = Modifier.width(232.dp).background(Panel, RoundedCornerShape(16.dp)).padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(22.dp),
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
            Text("ПОДКЛЮЧЕНИЕ", color = Muted, style = MaterialTheme.typography.labelSmall)
            Text("Spotify пока не подключён", color = Muted, style = MaterialTheme.typography.bodySmall)
        }
        Column(
            modifier = Modifier.weight(1f).fillMaxSize(),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = Panel,
                shape = RoundedCornerShape(16.dp),
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 22.dp, vertical = 18.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text("Поиск музыки и исполнителей", color = Muted)
                    Spacer(Modifier.weight(1f))
                    Text("Windows desktop · preview", color = Muted, style = MaterialTheme.typography.labelSmall)
                }
            }
            Box(
                modifier = Modifier.weight(1f).fillMaxWidth().background(Panel, RoundedCornerShape(16.dp)).padding(32.dp),
                contentAlignment = Alignment.Center,
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("MySpoti для Windows", color = Color.White, style = MaterialTheme.typography.headlineMedium)
                    Text(
                        "Настольная версия на базе оригинального Kotlin-проекта. Подключение Spotify и перенос экранов — следующие этапы.",
                        color = Muted,
                        style = MaterialTheme.typography.bodyMedium,
                    )
                    Text("Сейчас это техническая оболочка, не готовый музыкальный плеер.", color = Accent, style = MaterialTheme.typography.bodySmall)
                }
            }
            Surface(color = Panel, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.padding(18.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text("Нет воспроизводимого трека", color = Muted)
                    Spacer(Modifier.weight(1f))
                    Text("—:—", color = Muted)
                }
            }
        }
    }
}
