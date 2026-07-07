# Point Gradle at JDK 17/21 — Java 25 breaks Gradle's Kotlin DSL (error: "25.0.1")
param(
    [string]$JdkDir = ""
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path $PSScriptRoot -Parent
$gradleProps = Join-Path $ProjectRoot "gradle.properties"

if (-not $JdkDir) {
    $candidates = @(
        "$env:USERPROFILE\.jdks\ms-17.0.15",
        "$env:USERPROFILE\.jdks\temurin-21",
        "$env:USERPROFILE\.jdks\temurin-17"
    )
    foreach ($path in $candidates) {
        if (Test-Path (Join-Path $path "bin\java.exe")) {
            $JdkDir = $path
            break
        }
    }
}

if (-not $JdkDir -or -not (Test-Path (Join-Path $JdkDir "bin\java.exe"))) {
    Write-Host "No JDK 17/21 found. Downloading Temurin 21..."
    $JdkDir = "$env:USERPROFILE\.jdks\temurin-21"
    $zip = "$env:TEMP\temurin-21.zip"
    $url = "https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jdk/hotspot/normal/eclipse?project=jdk"
    Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
    New-Item -ItemType Directory -Force -Path $JdkDir | Out-Null
    Expand-Archive -Path $zip -DestinationPath $JdkDir -Force
    $sub = Get-ChildItem $JdkDir -Directory | Select-Object -First 1
    if ($sub -and (Test-Path (Join-Path $sub.FullName "bin\java.exe"))) {
        Get-ChildItem $sub.FullName | Move-Item -Destination $JdkDir -Force
        Remove-Item $sub.FullName -Force
    }
}

$escaped = ($JdkDir -replace "\\", "\\")
Write-Host "Using JDK: $JdkDir"

$content = if (Test-Path $gradleProps) { Get-Content $gradleProps -Raw } else { "" }
$content = $content -replace "(?m)^org\.gradle\.java\.home=.*\r?\n?", ""
$content = "org.gradle.java.home=$escaped`n" + $content.TrimStart()
Set-Content -Path $gradleProps -Value $content.TrimEnd() -Encoding UTF8

Write-Host "Updated gradle.properties. Run: .\gradlew.bat assembleDebug" -ForegroundColor Green
