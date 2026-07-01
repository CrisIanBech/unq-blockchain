# BlockRent Smartlock — Jetpack Compose (Option A)

Native Android app: **NFC read/write in Compose** + **MetaMask mobile browser** for signing.

## Architecture

```
Compose app (NFC)  →  Sign with MetaMask  →  BlockRent /smartlock in MetaMask browser  →  EIP-712 signature
```

| Layer | Tech |
|-------|------|
| UI | Jetpack Compose + Material 3 |
| State | `SmartlockViewModel` + `StateFlow` |
| NFC | `NfcHelper` (native Android NFC API) |
| Wallet | `MetamaskLauncher` → MetaMask deep link |

## Project layout

```
app/src/main/java/com/blockrent/smartlock/
  MainActivity.kt          # Compose host + NFC lifecycle
  SmartlockViewModel.kt    # UI state
  ui/SmartlockScreen.kt    # Compose UI
  ui/theme/                # Material 3 theme
  nfc/NfcHelper.kt         # Tag read/write
  metamask/MetamaskLauncher.kt
  protocol/SmartlockProtocol.kt
```

## Build & install

```powershell
cd android\smartlock-demo
.\gradlew.bat assembleDebug
& "$env:USERPROFILE\..\Android\sdk\platform-tools\adb.exe" install -r app\build\outputs\apk\debug\app-debug.apk
```

(Set `org.gradle.java.home` in `gradle.properties` to JDK 17 if Gradle fails on Java 25.)

## Configure

**`SmartlockConfig.kt`** — PC LAN IP + port:

```kotlin
const val DAPP_BASE_URL = "http://10.251.4.238:5173"
```

**Frontend** — mock mode + LAN:

```powershell
cd frontend
npm run dev:lan
```

`.env`: `VITE_SMARTLOCK_MOCK_MODE=true`

## Test flow (Option A)

1. **Simulate lock** → property ID `4` → tap blank NFC tag to write
2. **Read NFC** → scan tag (or second phone)
3. Select **Tenant** → **Sign with MetaMask**
4. MetaMask opens BlockRent → approve Connect + Sign
5. Success toast on web page

NFC stays in the native app; MetaMask only signs (no Web NFC needed).

## CLI setup (first time)

See `scripts/setup-sdk.ps1` and `scripts/setup-jdk.ps1`. Full test matrix: `docs/smartlock-testing.md`.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Gradle error `25.0.1` | Run `.\scripts\setup-jdk.ps1` (uses JDK 17) |
| MetaMask can't open dApp | LAN IP in `DAPP_BASE_URL`, `npm run dev:lan` |
| NFC write fails | Blank NTAG213/215/216 tag; hold steady 2–3 s |
| `adb` not found | Add `%USERPROFILE%\Android\sdk\platform-tools` to PATH |

