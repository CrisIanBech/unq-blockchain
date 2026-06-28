# Guía de Integración Blockchain - Frontend (BlockRent)

Este documento detalla los pasos para conectar la aplicación web (construida con React, TypeScript y Vite) a los contratos inteligentes de BlockRent desplegados en Sepolia.

---

## Paso 1: Instalar Ethers.js en el Frontend

El frontend actualmente no cuenta con librerías para interactuar con la blockchain. Debes instalar **Ethers v6**:

Si usas `npm`:
```bash
npm install ethers
```
Si usas `pnpm`:
```bash
pnpm install ethers
```

---

## Paso 2: Importar las ABIs de los Contratos

Las ABIs definen los métodos y eventos con los que el frontend interactúa.
1. Compila tus contratos en el directorio `/contracts/` para generar las ABIs en `artifacts/contracts/`.
2. Copia los archivos `.json` de las ABIs a una nueva carpeta en el frontend (por ejemplo, `frontend/app/lib/abi/`):
   * `PropertyNFT.json`
   * `RentalAgreementFactory.json`
   * `RentalAgreement.json`
   * `RentalNFT.json`
   * `MockUSDC.json` (o la de tu token ERC20 USDC en Sepolia)

---

## Paso 3: Configurar las Direcciones de los Contratos

Crea un archivo de configuración, por ejemplo, `frontend/app/lib/contracts-config.ts` para almacenar las direcciones estáticas obtenidas tras el deploy:

```typescript
export const CONTRACT_ADDRESSES = {
  PROPERTY_NFT: "0x... (dirección de PropertyNFT desplegado)",
  FACTORY: "0x... (dirección de RentalAgreementFactory desplegado)",
  USDC: "0x... (dirección de MockUSDC o USDC Sepolia desplegado)",
};
```
*Nota: Nunca debes guardar direcciones de contratos `RentalAgreement` o `RentalNFT` de forma estática, ya que estas se generan dinámicamente on-chain.*

---

## Paso 4: Implementar la Conexión con MetaMask

Actualiza **`frontend/app/stores/user-store.ts`** para gestionar la conexión y el estado real de la cuenta de MetaMask:

```typescript
import { create } from "zustand";
import { ethers } from "ethers";

interface UserState {
  wallet: string;
  balance: number;
  connectWallet: () => Promise<void>;
  // ... resto del estado
}

export const useUserStore = create<UserState>((set) => ({
  wallet: "",
  balance: 0,

  connectWallet: async () => {
    if (!(window as any).ethereum) {
      alert("Por favor instala MetaMask para utilizar la aplicación.");
      return;
    }
    try {
      // Solicita acceso a las cuentas de MetaMask
      const accounts = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      set({ wallet: address });
    } catch (error) {
      console.error("Error al conectar wallet:", error);
    }
  }
}));
```

---

## Paso 5: Reemplazar Simulaciones (Mocks) por Llamadas a Blockchain

En **`frontend/app/stores/properties-store.ts`**, debes actualizar las funciones para interactuar con los contratos utilizando el firmante (signer) de MetaMask.

### Ejemplo 1: Mintear Propiedad (`mintAndLoadProperty`)
```typescript
import { ethers } from "ethers";
import { CONTRACT_ADDRESSES } from "../lib/contracts-config";
import PropertyNFTABI from "../lib/abi/PropertyNFT.json";

// Dentro de tu acción mintAndLoadProperty en Zustand:
const provider = new ethers.BrowserProvider((window as any).ethereum);
const signer = await provider.getSigner();

const propertyContract = new ethers.Contract(
  CONTRACT_ADDRESSES.PROPERTY_NFT,
  PropertyNFTABI.abi,
  signer
);

const tx = await propertyContract.mint(await signer.getAddress(), input.metadataURI);
const receipt = await tx.wait(); // Espera a que se mine la tx
const txHash = receipt.hash;
```

### Ejemplo 2: Crear Acuerdo de Alquiler (`createContract`)
```typescript
import RentalAgreementFactoryABI from "../lib/abi/RentalAgreementFactory.json";

const factoryContract = new ethers.Contract(
  CONTRACT_ADDRESSES.FACTORY,
  RentalAgreementFactoryABI.abi,
  signer
);

const tx = await factoryContract.createRentalAgreement(
  propertyId,
  tenantAddress,
  ethers.parseUnits(rentAmount.toString(), 6), // 6 decimales para USDC
  ethers.parseUnits(depositAmount.toString(), 6),
  inflationBps,
  lateFeeBps,
  gracePeriod,
  duration,
  deadline
);
const receipt = await tx.wait();

// Buscar la dirección del contrato RentalAgreement en los eventos emitidos por la Fábrica:
const event = receipt.logs.find(log => log.fragment && log.fragment.name === 'RentalAgreementCreated');
const agreementAddress = event.args.agreementAddress;
// Guarda esta dirección en tu backend o estado local para futuros usos
```

### Ejemplo 3: Firma Cruzada y Depósito (`signContract` / Inquilino)
Antes de llamar a `approveAgreement` en el contrato del alquiler, el inquilino debe autorizar el depósito de garantía en el contrato de USDC:

```typescript
import USDCABI from "../lib/abi/MockUSDC.json";
import RentalAgreementABI from "../lib/abi/RentalAgreement.json";

const usdcContract = new ethers.Contract(CONTRACT_ADDRESSES.USDC, USDCABI.abi, signer);
const agreementContract = new ethers.Contract(agreementAddress, RentalAgreementABI.abi, signer);

// 1. Inquilino aprueba que el contrato del alquiler retire el depósito
const approveTx = await usdcContract.approve(agreementAddress, depositAmount);
await approveTx.wait();

// 2. Inquilino aprueba/firma el contrato
const signTx = await agreementContract.approveAgreement();
await signTx.wait();
```

### Ejemplo 4: Pagar Renta Mensual (`payMonthlyRent`)
El inquilino debe aprobar y luego transferir la renta correspondiente:

```typescript
const approveTx = await usdcContract.approve(agreementAddress, currentRentAmount);
await approveTx.wait();

const payTx = await agreementContract.payRent();
await payTx.wait();
```

### Ejemplo 5: Retirar Fondos de Renta (`withdrawRent`)
Llamado por el propietario para retirar los USDC que han sido pagados por el inquilino:

```typescript
const agreementContract = new ethers.Contract(agreementAddress, RentalAgreementABI.abi, signer);
const withdrawTx = await agreementContract.withdrawRent();
await withdrawTx.wait();
```
