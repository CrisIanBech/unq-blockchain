# Integración Blockchain - Frontend (BlockRent)

Este proyecto cuenta con una arquitectura desacoplada para interactuar con la red Sepolia. La interfaz de usuario y los stores de Zustand no invocan directamente a la librería `ethers` ni acceden directamente a `window.ethereum`. En su lugar, se utiliza una capa de servicios estructurada:

```
Zustand Stores (Estado & UI)
    ↓
Servicio / Repositorio (Lógica de Negocio Web3)
    ↓
Módulo Blockchain Core (Configuración, Providers & Contratos)
    ↓
Ethers.js & Metamask
```

---

## Estructura del Módulo Blockchain

Toda la lógica de integración con la blockchain se encuentra centralizada en:
📁 **`frontend/app/lib/blockchain/`**

*   **`addresses.ts`**: Expone las constantes tipadas leyendo las direcciones de contratos desde las variables de entorno de Vite de manera segura.
*   **`provider.ts`**: Encapsula la inicialización del `BrowserProvider` y la obtención del `Signer` (firmante) de MetaMask.
*   **`wallet.ts`**: Maneja la conexión de MetaMask, la consulta de cuentas activas, validación del ID de red (Chain ID) y solicitudes para agregar o cambiar a la red **Sepolia** (Chain ID: `11155111`).
*   **`contracts.ts`**: Fábrica que expone instanciadores estáticos y dinámicos para los contratos:
    *   `getPropertyNFT(runner)`
    *   `getRentalAgreementFactory(runner)`
    *   `getMockUSDC(runner)`
    *   `getRentalAgreement(address, runner)` (Carga dinámica para acuerdos de alquiler desplegados por la fábrica)
    *   `getRentalNFT(address, runner)` (Carga dinámica para el NFT de renta asociado)
*   **`abi/`**: Directorio que contiene los archivos JSON de las ABIs ligeras de cada contrato.

---

## Configuración de Entorno

Las direcciones de los contratos inteligentes desplegados no están hardcodeadas en TypeScript. Deben ser provistas mediante variables de entorno de Vite.

1.  Copia el archivo `.env.template` y renómbralo como **`.env`** en la raíz de la carpeta `frontend/`:
    ```bash
    cp .env.template .env
    ```
2.  Define las direcciones de tus contratos inteligentes en el archivo `.env`:
    ```env
    VITE_GOOGLE_MAPS_API_KEY=tu_api_key_de_google_maps
    VITE_PROPERTY_NFT_ADDRESS=0x8C744e6136E972bE81c32e4463539a968b154105
    VITE_RENTAL_FACTORY_ADDRESS=0x3b6532A0452F94Fe0e07616d6F733e2BbEbE1B9b
    VITE_USDC_ADDRESS=0xFb68745988cd480F95a9FFd86A0c41c9F15A4813
    ```

---

## Sincronización Automatizada de ABIs

El frontend cuenta con un pipeline automático para sincronizar y limpiar las ABIs directamente de los artefactos compilados en la carpeta de contratos (`/contracts`).

Para actualizar las ABIs del frontend después de compilar tus contratos, simplemente ejecuta desde la raíz de `frontend/`:

```bash
npm run sync-abi
```

### ¿Cómo funciona?
El script de Node.js `frontend/scripts/sync-abi.js` lee los archivos generados por Hardhat, extrae **únicamente** la propiedad `abi` (descartando bytecode, metadatos y código intermedio) y genera archivos JSON livianos en `frontend/app/lib/blockchain/abi/` para mantener el bundle del frontend optimizado y ligero.

---

## Capa de Servicios (`frontend/app/lib/services/`)

El servicio **`BlockchainService`** (`blockchain-service.ts`) expone métodos asíncronos limpios de alto nivel que los stores de Zustand pueden invocar directamente:

```typescript
// Ejemplo de uso en Zustand
import { BlockchainService } from "../lib/services/blockchain-service";

// Mintear NFT
const txReceipt = await BlockchainService.mintPropertyNFT(walletAddress, metadataURI);

// Pagar Renta (Maneja la aprobación de USDC y llamada al alquiler internamente)
const txHash = await BlockchainService.payMonthlyRent(agreementAddress, rentAmount);

// Retirar USDC
const txHash = await BlockchainService.withdrawRent(agreementAddress);
```
