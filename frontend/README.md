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

## Capa de Servicios de Dominio (`frontend/app/lib/services/`)

Los servicios de dominio exponen métodos asíncronos limpios de alto nivel que los stores de Zustand invocan sin importar ni conocer tipos de `ethers`:

```typescript
// Ejemplo de uso en Zustand
import { PropertiesService } from "../lib/services/properties-service";
import { RentalsService } from "../lib/services/rentals-service";

// Mintear NFT de Propiedad
const result = await PropertiesService.mintProperty(walletAddress, metadataURI);
console.log(result.txHash); // Hash de transacción real de Sepolia

// Pagar Renta (Maneja la aprobación de USDC y llamada al alquiler internamente)
const resultRent = await RentalsService.payRent(agreementAddress, rentAmount);

// Retirar USDC acumulados de renta
const resultWithdraw = await RentalsService.withdrawRent(agreementAddress);
```

---

## Persistencia y Arquitectura con Backend (NestJS)

Actualmente, el listado de propiedades se gestiona **en memoria (Zustand)**, por lo que recargar la página (`F5`) reinicia los datos a sus fixtures por defecto. Para llevar BlockRent a producción, se debe incorporar una capa de backend construida en **NestJS** y una base de datos relacional (ej. PostgreSQL):

### 1. Rol de NestJS como Indexador Blockchain (Mempool & Event listener)
En lugar de forzar al frontend a realizar pesadas llamadas de lectura a la blockchain para escanear todos los NFTs de un usuario, el backend de NestJS actuará como indexador local:
*   **Servicio Indexador (Cron / Event Listener):** Usando librerías como `ethers` o `viem`, NestJS se conectará a la red Sepolia y se suscribirá a los eventos de los contratos inteligentes:
    *   `Transfer(from, to, tokenId)` en el contrato de **`PropertyNFT`**.
    *   `RentalAgreementCreated(propertyId, tenant, agreementAddress)` en el contrato de **`RentalAgreementFactory`**.
    *   `RentPaid(agreementAddress, tenant, amount)` en los contratos de **`RentalAgreement`**.
*   **Base de Datos Relacional:** Al detectar que se emite un evento `Transfer` hacia un usuario, NestJS guarda el `tokenId` (como `propertyId`), la dirección del dueño y los metadatos (URI) en la base de datos.

### 2. Guardado de Información Cosmética
La blockchain solo debe almacenar datos transaccionales críticos (gas optimization). El backend de NestJS expondrá una API REST para almacenar los datos cosméticos de la propiedad (descripción larga, fotos de alta resolución, comodidades) mapeados al `propertyId` del NFT.

### 3. Flujo de Trabajo Frontend ↔ NestJS
Cuando la arquitectura del backend esté integrada, el ciclo de vida del frontend será:

1.  **Carga de Página (On Mount):**
    Al conectar la wallet real en la UI, el frontend realiza una petición HTTP al backend:
    ```bash
    GET https://api.blockrent.com/properties?owner=0xTuWalletAddress
    ```
    El store de Zustand recibe el JSON indexado desde la base de datos de NestJS y actualiza `ownedProperties` de forma instantánea en lugar de usar los mocks.

2.  **Carga de Nueva Propiedad (Minter):**
    *   El usuario hace clic en *"Mintear y cargar"*.
    *   El frontend llama a `PropertiesService.mintProperty(...)`, lo cual dispara la transacción de minteo de NFT en MetaMask.
    *   Una vez confirmada on-chain y devuelto el `txHash`, el frontend realiza un envío al backend:
        ```bash
        POST https://api.blockrent.com/properties
        Body: { tokenId, txHash, name, type, address, imageUrl }
        ```
    *   NestJS valida la transacción en Sepolia, registra la propiedad en la base de datos y la asocia a tu cuenta. Al recargar la página, se recuperará del backend de forma persistente.
