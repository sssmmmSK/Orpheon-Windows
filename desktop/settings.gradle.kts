pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "MySpoti-Windows"

include(":api", ":api-web", ":engine", ":api-spotify", ":host-cdp")
project(":api").projectDir = file("../upstream/base/api")
project(":api-web").projectDir = file("../upstream/base/api-web")
project(":engine").projectDir = file("../upstream/base/engine")
project(":api-spotify").projectDir = file("../upstream/base/api-spotify")
project(":host-cdp").projectDir = file("../upstream/base/host-cdp")
