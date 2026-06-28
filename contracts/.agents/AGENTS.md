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

Exactly one Factory exists.

Responsibilities:

- Deploy RentalAgreement contracts
- Register agreements
- Keep mappings
- Prevent duplicate active rentals
- Emit deployment events

The Factory should contain as little business logic as possible.

---

# Deployment Flow

Rental creation follows this sequence:

1. Landlord calls RentalAgreementFactory.
2. Factory validates the request.
3. Factory deploys a RentalAgreement.
4. RentalAgreement creates its own RentalNFT.
5. RentalAgreement configures:
   - owner (itself)
   - user (tenant)
   - expiration
6. Factory emits RentalAgreementCreated().
7. Frontend retrieves the RentalAgreement address from the emitted event.
8. Future interactions occur directly with the RentalAgreement.

---

# Frontend Integration

The frontend should only contain a static reference to:

RentalAgreementFactory

The frontend must never contain hardcoded RentalAgreement addresses.

RentalAgreement addresses are obtained from emitted events.

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

The Factory deploys and registers contracts.

RentalAgreement contains rental business logic.

NFT contracts only manage ownership and permissions.

Avoid "God Contracts".

Design the system assuming future integration with:

- Reviews
- SmartLock
- Additional governance
- Indexers
- Analytics