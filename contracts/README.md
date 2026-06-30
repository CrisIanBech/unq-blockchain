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
*   **`Review.sol`**: Sistema de reviews on-chain para propiedades. Solo inquilinos con acuerdo activo/completado pueden postear una review por acuerdo. Verifica tenant contra `RentalAgreementFactory.activeRentals()`.

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
2.  **Verificar la configuración de red:**
    *   El archivo `hardhat.config.ts` ya está configurado para leer esta clave privada y conectarse al RPC público de Sepolia:
        ```typescript
        sepolia: {
          type: "http",
          url: "https://ethereum-sepolia-rpc.publicnode.com",
          accounts: process.env.SEPOLIA_PRIVATE_KEY ? [process.env.SEPOLIA_PRIVATE_KEY] : [],
        }
        ```
3.  **Ejecutar el despliegue automático:**
    *   Utilizamos **Hardhat Ignition** para orquestar la secuencia de despliegue. Ejecuta el comando en tu terminal:
        ```bash
        npx hardhat ignition deploy ignition/modules/BlockRent.ts --network sepolia
        ```
    *   La herramienta desplegará secuencialmente `PropertyNFT`, `MockUSDC`, y `RentalAgreementFactory` firmando las transacciones automáticamente con tu cuenta, devolviéndote las direcciones resultantes por consola.

---

## 6. Desarrollo Local (Hardhat Node + Seeding)

Para probar on-chain sin depender de Sepolia:

1. **Levantar el nodo local** (mantener esta terminal abierta):
   ```bash
   npx hardhat node
   ```

2. **Deploy + Seed** (en otra terminal):
   ```bash
   npx hardhat run scripts/seed.ts --network localhost
   ```
   Esto despliega todos los contratos, mintea 2 propiedades, crea y activa 2 contratos de alquiler para el tenant, y muestra las addresses para el `.env` del frontend.

3. **Importar cuentas en MetaMask:**
   - Red: **Hardhat Local** (Chain ID 31337, RPC http://127.0.0.1:8545)
   - Account #1 (`0x7099...`): landlord
   - Account #2 (`0x3C44...`): tenant (PK: `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a`)

4. **Actualizar `.env` del frontend** con las addresses impresas por el seed.

> **Importante**: El nodo Hardhat es efímero. Al cerrarlo se pierde todo el estado. Si MetaMask muestra errores de nonce, usar *Settings → Advanced → Clear activity tab data*.