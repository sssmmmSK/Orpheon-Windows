plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.compose.multiplatform)
    alias(libs.plugins.kotlin.compose)
    // Predeclare Kotlin plugins used by imported upstream modules.
    alias(libs.plugins.kotlin.multiplatform) apply false
    alias(libs.plugins.kotlin.serialization) apply false
}

group = "app.myspoti"
version = "0.1.0"

kotlin {
    jvmToolchain(17)
}

dependencies {
    implementation(compose.desktop.currentOs)
    implementation(compose.material3)
    implementation(compose.materialIconsExtended)

    // Reuse the real MySpoti Kotlin API and Spotify implementation from upstream.
    implementation(project(":api"))
    implementation(project(":api-spotify"))
    implementation(project(":host-cdp"))
    implementation(libs.coroutines.core)
    implementation(libs.coroutines.swing)
}

compose.desktop {
    application {
        mainClass = "app.myspoti.desktop.MainKt"
        nativeDistributions {
            targetFormats(org.jetbrains.compose.desktop.application.dsl.TargetFormat.Exe, org.jetbrains.compose.desktop.application.dsl.TargetFormat.Msi)
            packageName = "MySpoti"
            packageVersion = "0.1.0"
            description = "MySpoti music player for Windows"
            vendor = "MySpoti contributors"
            windows {
                menuGroup = "MySpoti"
                shortcut = true
                dirChooser = true
            }
        }
    }
}
