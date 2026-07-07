@rem BlockRent Smartlock — generate Gradle wrapper (run once after installing Gradle)
@rem Usage: scripts\bootstrap-gradle.bat

@echo off
setlocal
cd /d "%~dp0.."

where gradle >nul 2>&1
if errorlevel 1 (
  echo Gradle not found. Install with: scoop install gradle
  echo Or download from https://gradle.org/releases/
  exit /b 1
)

gradle wrapper --gradle-version 8.7
if errorlevel 1 exit /b 1

echo.
echo Gradle wrapper ready. Build with: gradlew.bat assembleDebug
