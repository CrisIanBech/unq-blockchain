# Capa de Contratos Inteligentes de BlockRent

Este directorio contiene las implementaciones de los contratos inteligentes, pruebas unitarias y configuraciones de despliegue para la capa blockchain del proyecto **BlockRent**.

El proyecto está construido de forma nativa sobre **Hardhat 3** utilizando **ES Modules (ESM)**, **Solidity 0.8.24 (EVM Cancun)** y **Ethers v6**.

---

## 1. Arquitectura de los Contratos

La arquitectura está compuesta por los siguientes contratos principales e interfaces:

*   **`PropertyNFT.sol`**: Registro global ERC721 que representa la propiedad permanente de los inmuebles. Los derechos de administración y alquiler del propietario se resuelven de forma dinámica leyendo el dueño del token de este contrato. El minteo de nuevas propiedades está restringido a cuentas con `MINTER_ROLE`.
*   **`RentalNFT.sol`**: Token ERC4907 que representa el derecho temporal de ocupación de una propiedad. Se despliega dinámicamente al activarse un contrato de alquiler, es propiedad permanente del contrato `RentalAgreement` que lo crea, y define al inquilino como el `user` con una fecha de expiración. Se quema cuando el alquiler finaliza.
*   **`RentalAgreement.sol`**: Contrato individual que maneja el ciclo de vida de un alquiler (`PendingSignatures -> Active -> Completed/Cancelled/Defaulted`). Implementa la resolución dinámica del propietario (`PropertyNFT.ownerOf()`), depósito de garantía (`Locked -> Released / Claimed`), cobro de rentas en custodia, incrementos por inflación (BPS) y penalizaciones por mora (BPS).
*   **`RentalAgreementFactory.sol`**: Fábrica y registro global utilizado por los propietarios para desplegar nuevos contratos de alquiler. Evita que existan alquileres activos duplicados para la misma propiedad.

---

## 2. Instalación y Configuración

Asegúrate de tener **Node.js** instalado en tu sistema.

1.  **Navega al directorio de contratos:**
    ```bash
    cd contracts
    ```
2.  **Instala las dependencias necesarias:**
    ```bash
    npm install
    ```

---

## 3. Compilación y Construcción

Para compilar los contratos de Solidity y generar los tipos correspondientes de TypeScript:
```bash
npx hardhat build
```

---

## 4. Ejecución de Pruebas (Tests)

Utilizamos Mocha y Chai integrados con Hardhat 3 para validar todos los estados del ciclo de vida, transiciones, cálculos de mora e inflación y controles de acceso de manera local.

Para correr toda la suite de pruebas unitarias e integrales:
```bash
npx hardhat test
```

---

## 5. Guía de Despliegue (Deploy) y Versionado Automático

Hemos automatizado el flujo de despliegue mediante un script de TypeScript que gestiona el orden de inicialización de los enlaces bidireccionales, ejecuta validaciones on-chain y genera reportes de versión.

### Requisitos Previos:
1.  **Configurar variables de entorno:**
    *   Copia el archivo `.env.example` y nómbralo como `.env` en la carpeta `contracts`:
        ```bash
        cp .env.example .env
        ```
    *   Abre el archivo `.env` y coloca la clave privada de tu cuenta de MetaMask (sin el prefijo `0x`):
        ```env
        SEPOLIA_PRIVATE_KEY=tu_clave_privada_aqui
        ```

### Ejecutar Despliegue Local (Prueba de Humo / Dry Run):
Para comprobar que los contratos compilan y se configuran sin gastar Sepolia ETH reales, corre el deploy en la red interna de Hardhat:
```bash
npx hardhat run scripts/deploy.ts --network hardhat
```

### Ejecutar Despliegue en Sepolia (Oficial):
Ejecuta el script apuntando a la testnet oficial:
```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

El script imprimirá por consola un resumen detallado del despliegue y validará on-chain que las referencias bidireccionales se hayan registrado correctamente.

---

## 6. Historial de Versiones y Salidas Generadas

### A. Archivos de Despliegue Versionados (`deployments/`)
Cada ejecución exitosa del script de despliegue escribe un archivo JSON correlativo bajo `contracts/deployments/` (por ejemplo: `deploy-v1.json`, `deploy-v2.json`, etc.). Cada archivo almacena el siguiente reporte de metadatos:
```json
{
  "protocolVersion": 1,
  "network": "sepolia",
  "chainId": 11155111,
  "deployedAt": "2026-06-29T16:04:27.123Z",
  "contracts": {
    "mockUSDC": "0x3f622AfeEC2B85171fC4131F691558d845E08698",
    "propertyNFT": "0x078dE63bB4365493e74A97EF23E8a569E8c8c314",
    "rentalNFT": "0x84f176EB9686522C532FE12d9E8D138ef9056407",
    "rentalAgreementFactory": "0x409FDc9C6Dd2654217e735436e8FC5C1913F9c54"
  }
}
```
*   **Nota:** La versión se incrementa automáticamente consultando los archivos `.json` existentes en la carpeta de despliegues.

### B. Salidas Listas para el Frontend
Al finalizar el despliegue de forma exitosa, el script genera/actualiza los siguientes archivos de configuración en el frontend para agilizar la integración:
*   [frontend/.env.example](file:///home/nikkoros/dev/unq-blockchain/frontend/.env.example): Plantilla de variables de entorno de Vite con las nuevas direcciones asignadas automáticamente.
*   [frontend/contracts-config.example.ts](file:///home/nikkoros/dev/unq-blockchain/frontend/contracts-config.example.ts): Export TypeScript tipado de las nuevas direcciones para facilitar el reuso directo en la base de código.
*   **Importante:** Estos scripts **no** sobreescriben el archivo `.env` privado del desarrollador en el frontend para evitar pisar claves API o parámetros de testing locales.