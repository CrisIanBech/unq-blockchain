# Testing the smartlock (no deployed contracts)

Enable mock mode so you can test **MetaMask signing** and **NFC** without on-chain property/tenant verification.

## 1. Enable mock mode

Copy the frontend env file and keep mock mode on:

```powershell
cd frontend
copy .env.example .env
```

Ensure this line is set:

```
VITE_SMARTLOCK_MOCK_MODE=true
```

Restart the dev server after changing `.env`.

### What mock mode does

| Step | Still runs? |
|------|-------------|
| NFC read / demo challenge | Yes |
| MetaMask EIP-712 signature | Yes |
| `ownerOf` / `tenant` on Sepolia | **Skipped** |
| Sepolia network required | **No** |

Authorization uses the UI context instead:

- **Propietario** mode → treated as landlord after a valid signature
- **Llave** (tenant) mode → treated as tenant after a valid signature

You still prove wallet ownership via MetaMask — only the contract lookup is mocked.

---

## 2. Test in the browser (desktop)

```powershell
cd frontend
npm install
npm run dev
```

1. Open http://localhost:5173
2. Connect MetaMask (any network is fine in mock mode)
3. Go to **Smartlock**
4. Pick a property (mock IDs: `1`, `2`, `3` for landlord; `4`, `5` for tenant)
5. Turn NFC on (power icon)
6. Click **Acercar y abrir**
7. Approve the MetaMask signature popup
8. You should see a success toast and the yellow **Modo demo** chip

---

## 3. Test NFC on Android (Chrome)

Same mock mode setup, but expose the dev server on your LAN:

```powershell
npm run dev -- --host
```

On your phone (Chrome or Safari, Android or iOS):

1. Open `http://YOUR_PC_IP:5173/smartlock`
2. Tap the wallet chip → **Connect** → MetaMask opens via deep link (approve connection)
3. Return to Chrome when MetaMask sends you back
4. Enable NFC and tap **Acercar y abrir** near an NFC tag

**If the deep link fails:** open the same URL inside **MetaMask → Browser**, or add your LAN origin (`http://YOUR_PC_IP:5173`) to the [WalletConnect allowlist](https://cloud.walletconnect.com) as a fallback.

---

## 4. Test with the Android CLI app

See `android/smartlock-demo/README.md` for building without Android Studio.

### Quick flow (two phones or one phone + NFC tag)

| Step | Device | Action |
|------|--------|--------|
| 1 | Phone A | **Simulate lock** → property ID `1` → write to NFC tag |
| 2 | Phone B | **Read NFC** → scan tag |
| 3 | Phone B | Select **Tenant** or **Landlord** → **Sign with MetaMask** |
| 4 | MetaMask | Opens `/smartlock?challenge=…&role=tenant` → sign |

**Property IDs must match mock data:**

| Mock property | `propertyId` for NFC |
|---------------|----------------------|
| Depto Palermo Soho | `1` |
| Casa Villa Crespo | `2` |
| PH Caballito | `3` |
| Loft Distrito Tecnológico (tenant) | `4` |
| Oficina Microcentro (tenant) | `5` |

Set `DAPP_BASE_URL` in `SmartlockConfig.kt` to `http://YOUR_PC_IP:5173`.

---

## 5. When contracts are deployed

Set in `.env`:

```
VITE_SMARTLOCK_MOCK_MODE=false
```

Use real `propertyId` and `agreementAddress` from your rentals. MetaMask must be on **Sepolia**, and the signing wallet must match `ownerOf(propertyId)` or `RentalAgreement.tenant`.
