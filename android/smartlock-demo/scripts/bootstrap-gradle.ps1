# Download Gradle once and generate gradlew.bat (no separate Gradle install needed)
param(
    [string]$GradleVersion = "8.7"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path $PSScriptRoot -Parent
Set-Location $ProjectRoot

if (Test-Path "gradlew.bat") {
    Write-Host "gradlew.bat already exists."
    exit 0
}

$gradleZip = "$env:TEMP\gradle-$GradleVersion-bin.zip"
$gradleDir = "$env:TEMP\gradle-$GradleVersion"

Write-Host "Downloading Gradle $GradleVersion..."
Invoke-WebRequest -Uri "https://services.gradle.org/distributions/gradle-$GradleVersion-bin.zip" -OutFile $gradleZip

Write-Host "Extracting..."
Expand-Archive -Path $gradleZip -DestinationPath $env:TEMP -Force

$gradleBat = Join-Path $gradleDir "bin\gradle.bat"
& $gradleBat wrapper --gradle-version $GradleVersion

if (Test-Path "gradlew.bat") {
    Write-Host "Done — run: .\gradlew.bat assembleDebug" -ForegroundColor Green
} else {
    Write-Error "Failed to create Gradle wrapper."
}
