# BlockRent Blockchain Context

## Project Overview

BlockRent is a decentralized property rental platform built on Ethereum Sepolia.

The blockchain layer is responsible for managing property ownership, rental rights, rental agreements, and payment automation.

The frontend already exists and should remain compatible with the blockchain implementation.

Future modules (Reviews and SmartLock) will integrate with these smart contracts, so maintain a modular architecture.

---

# Blockchain Stack

- Solidity ^0.8.x
- Hardhat
- OpenZeppelin Contracts
- OpenZeppelin ERC4907
- ethers v6
- Hardhat Ignition
- Ethereum Sepolia
- USDC (Sepolia) for all payments

Never use ETH as the rental payment currency.

The USDC address must be configurable during deployment.

---

# Smart Contract Architecture

The blockchain consists of four contract types.

## PropertyNFT

Standard:

- ERC721

Purpose:

Represents permanent ownership of a property.

Responsibilities:

- Property ownership
- Metadata
- Minting
- Ownership verification

The owner of the PropertyNFT is considered the landlord.

---

## RentalNFT

Standard:

- ERC4907

Purpose:

Represents the temporary right to occupy a property.

Architecture:

owner = RentalAgreement

user = tenant

expires = agreement end timestamp

The tenant is NEVER the owner.

The RentalAgreement contract permanently owns the RentalNFT.

Only the RentalAgreement may update:

- user
- expires

SmartLock and frontend integrations MUST rely exclusively on:

userOf(tokenId)

Never use ownerOf(tokenId) to determine the current tenant.

RentalNFT should be burned when the agreement reaches its terminal state.

---

## RentalAgreement

Exactly one RentalAgreement contract exists for each rental.

Responsibilities:

- Rent payments
- Security deposits
- Inflation adjustments
- Late fees
- Agreement lifecycle
- RentalNFT management
- ERC4907 user assignment
- Events

Business logic belongs here.

---

## RentalAgreementFactory

Exactly one global stateless singleton Factory exists. It is deployed once and reused by all properties, landlords, and tenants.

Responsibilities:

- Deploy `RentalAgreement` contracts dynamically by accepting all necessary parameters (PropertyNFT, RentalNFT, USDC token, property ID, tenant, rent, security deposit, duration, deadline, etc.) in the creation function.
- Emit the `RentalAgreementCreated` event with the deployed agreement's address and details.

The Factory contains no state, active rental mappings, or registry histories. It acts strictly as a stateless deployer utility.

---

# Deployment Flow

Rental creation follows this sequence:

1. Landlord (or frontend on their behalf) calls `RentalAgreementFactory.createRentalAgreement(...)` passing all contract addresses (PropertyNFT, RentalNFT, USDC token) and terms (property ID, tenant, rent, security deposit, duration, deadline, etc.).
2. The Factory deploys a new `RentalAgreement` contract, forwarding all parameters to its constructor.
3. The Factory emits the `RentalAgreementCreated` event and returns the newly deployed `RentalAgreement` address.
4. The frontend retrieves the `RentalAgreement` address directly from the transaction (as the return value of the function call).
5. Before activation, the Landlord must approve the deployed `RentalAgreement` address on `PropertyNFT` (e.g., via `approve` or `setApprovalForAll`) to authorize it to set the user on `RentalNFT`.
6. Landlord and Tenant approve the agreement terms on the `RentalAgreement` contract.
7. Upon mutual approval:
   - The agreement state transitions to Active.
   - The `RentalAgreement` calls `setUser` on the existing `RentalNFT` to set the tenant as the temporary user with the corresponding expiration.
8. Future interactions (rent payments, claims, completions) occur directly with the `RentalAgreement` contract.

---

# Frontend Integration

The frontend maintains a single static reference to the global stateless `RentalAgreementFactory` singleton.

When a landlord wants to create a rental agreement, the frontend queries the deployed factory, passing the appropriate property details, token addresses, and agreement parameters.

The frontend must never hardcode individual `RentalAgreement` addresses. Instead, it discovers them dynamically by reading the return value of the creation transaction.

---

# Payment Model

Payments are performed using Sepolia USDC.

The RentalAgreement manages:

- Rent
- Deposit
- Late fees
- Inflation adjustments

Always use:

SafeERC20

Never use raw transfer() or transferFrom() directly.

---

# Rental Agreement Lifecycle

Created

↓

Active

↓

Completed

or

Cancelled

or

Defaulted

Terminal states should prevent further interaction.

---

# Security Requirements

Use whenever appropriate:

- ReentrancyGuard
- Ownable
- Pausable
- SafeERC20

Follow:

- Checks-Effects-Interactions
- Custom Errors
- NatSpec documentation

Validate every external input.

---

# Important Invariants

There must never be more than one active rental for the same property.

Only the PropertyNFT owner may create rentals.

Tenant cannot equal landlord.

Invalid dates must revert.

RentalNFT ownership never changes.

RentalNFT user can only be modified by its RentalAgreement.

USDC amounts must correctly handle token decimals.

Mappings should be preferred over expensive array iterations.

Avoid storing redundant information on-chain.

---

# Events

Every important state transition should emit an event.

Examples:

PropertyMinted

RentalAgreementCreated

RentalActivated

RentPaid

LateFeeApplied

RentalCompleted

RentalCancelled

RentalDefaulted

RentalNFTBurned

---

# Design Philosophy

Favor correctness, modularity, and maintainability over minimizing the number of contracts.

Each contract should have a single responsibility.

The Factory acts as a stateless deployer for agreements.

RentalAgreement contains rental business logic.

NFT contracts only manage ownership and permissions.

Avoid "God Contracts".

Design the system assuming future integration with:

- Reviews
- SmartLock
- Additional governance
- Indexers
- Analytics