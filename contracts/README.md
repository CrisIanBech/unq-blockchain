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

## 5. Guía de Despliegue (Deploy) en Sepolia

Existen dos alternativas recomendadas para desplegar los contratos inteligentes utilizando sus wallets de MetaMask en la red de pruebas Sepolia.

### Opción A: Despliegue mediante Remix IDE (Visual e Intuitivo)

Esta es la mejor opción si están acostumbrados a la interfaz gráfica de Remix.

1.  **Cargar los archivos en Remix:**
    *   Ingresa a [Remix IDE](https://remix.ethereum.org/).
    *   Crea o importa la estructura de archivos `.sol` dentro de la carpeta `contracts` de Remix. Recuerda mantener la subcarpeta `interfaces/` con las interfaces correspondientes.
2.  **Configurar el compilador:**
    *   En la pestaña **Solidity Compiler**, selecciona la versión de compilador `0.8.24`.
    *   En *Advanced Configuration*, activa la opción **Enable optimization** y pon el valor de *runs* en `200`.
    *   Haz clic en **Compile**.
3.  **Conectar MetaMask:**
    *   Asegúrate de estar en la red **Sepolia Testnet** en tu extensión de MetaMask y contar con saldo de prueba (Sepolia ETH).
    *   En Remix, ve a la pestaña **Deploy & Run Transactions**.
    *   En el menú de **Environment**, selecciona **Injected Provider - MetaMask**. Acepta la solicitud de conexión en MetaMask.
4.  **Secuencia de Despliegue:**
    *   **Paso 1:** Selecciona `PropertyNFT` y haz clic en **Deploy**. Confirma la transacción en MetaMask y copia la dirección del contrato resultante.
    *   **Paso 2 (Opcional):** Si requieres un token de prueba de USDC en Sepolia, selecciona `MockUSDC`, haz clic en **Deploy**, y copia su dirección. De lo contrario, puedes usar cualquier dirección de USDC de prueba oficial que ya exista.
    *   **Paso 3:** Selecciona `RentalAgreementFactory` en Remix. En los parámetros del constructor, ingresa la dirección de tu `PropertyNFT` y de `MockUSDC` (o del USDC oficial de prueba), y haz clic en **Transact**. Confirma la transacción en MetaMask.

---

### Opción B: Despliegue mediante Hardhat CLI (Automatizado)

Hardhat permite realizar el despliegue automático mediante código utilizando claves privadas de MetaMask configuradas localmente de manera segura.

1.  **Configurar las variables de entorno:**
    *   Copia el archivo `.env.example` y nómbralo como `.env` (este archivo ya está excluido en el `.gitignore` por seguridad):
        ```bash
        cp .env.example .env
        ```
    *   Abre el archivo `.env` y coloca la clave privada de tu cuenta de MetaMask en la variable `SEPOLIA_PRIVATE_KEY` (sin el prefijo `0x`):
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