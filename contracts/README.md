# BlockRent Smart Contracts Layer

This directory contains the smart contract implementations, unit tests, and deployment configurations for the **BlockRent** blockchain layer.

The project is built natively on **Hardhat 3** using **ES Modules (ESM)**, **Solidity 0.8.24 (Cancun EVM)**, and **Ethers v6**.

---

## 1. Smart Contract Architecture

The architecture consists of four core contracts and interfaces:

*   **`PropertyNFT.sol`**: A global ERC721 registry representing permanent property ownership. Landmark rights and dynamic landlord permissions are mapped directly to the owner of this NFT. Access control limits minting to accounts holding `MINTER_ROLE`.
*   **`RentalNFT.sol`**: An ERC4907 token representing temporary occupancy rights. It is deployed dynamically when an agreement activates, is owned permanently by the `RentalAgreement` contract, and designates the tenant as the `user`. The token is burned upon lease completion or cancellation.
*   **`RentalAgreement.sol`**: Individual state-machine contract tracking the lease lifecycle (`PendingSignatures -> Active -> Completed/Cancelled/Defaulted`). It dynamically resolves landlord authority via `PropertyNFT.ownerOf()`, processes BPS inflation and late fees, locks/releases deposits, and holds rent in escrow.
*   **`RentalAgreementFactory.sol`**: The entry point registry that landlord owners use to deploy new agreements. It prevents duplicate active rentals for any single property ID.

---

## 2. Installation & Setup

Ensure you have **Node.js** installed.

1.  **Navigate to the contracts directory:**
    ```bash
    cd contracts
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```

This will install Hardhat 3, OpenZeppelin v5, Ethers v6, and the ESM-compatible Mocha-Ethers toolbox.

---

## 3. Compilation & Building

To build the Solidity contracts and compile the TypeScript definitions:
```bash
npx hardhat build
```

---

## 4. Running the Tests

We use Mocha/Chai with Hardhat 3 to verify all invariants, custom errors, access controls, and state transitions.

To run the complete test suite:
```bash
npx hardhat test
```

---

## 5. Deployment Setup

We use Hardhat Ignition to manage deployments. The module is configured in `ignition/modules/BlockRent.ts`.

To deploy locally:
```bash
npx hardhat ignition deploy ignition/modules/BlockRent.ts --network hardhat
```