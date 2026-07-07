import {
  UserRejectedTransaction,
  InsufficientFunds,
  RentalAlreadyActive,
  AgreementExpired,
  UnauthorizedOperation,
  UnknownBlockchainError,
  NoEthereumProvider,
  InvalidAgreementStatus,
  NoActiveOrCompletedRental,
  ReviewAlreadyPosted,
} from "./domain-errors";

/**
 * Translates any raw error from ethers or RPC nodes into a clean Domain Error.
 */
export function translateError(error: any): Error {
  if (!error) return new UnknownBlockchainError();

  const errorMessage = String(error.message || "").toLowerCase();
  const errorCode = String(error.code || "");

  // 1. User rejection
  if (errorCode === "ACTION_REJECTED" || errorMessage.includes("user rejected") || errorMessage.includes("rejected")) {
    return new UserRejectedTransaction();
  }

  // 2. Insufficient funds
  if (
    errorCode === "INSUFFICIENT_FUNDS" ||
    errorMessage.includes("insufficient funds") ||
    errorMessage.includes("out of gas") ||
    errorMessage.includes("gas limit")
  ) {
    return new InsufficientFunds();
  }

  // 3. Custom EVM revert checks
  const errorData = String(error.data || error.error?.data || "").toLowerCase();

  if (errorData.includes("0x1f5d033b") || errorMessage.includes("invalidagreementstatus")) {
    return new InvalidAgreementStatus();
  }

  if (errorData.includes("0x4dfc6ea2") || errorMessage.includes("noactiveorcompletedrental")) {
    return new NoActiveOrCompletedRental();
  }

  if (errorData.includes("0x718a36bc") || errorData.includes("0xd97e4115") || errorMessage.includes("reviewalreadyposted")) {
    return new ReviewAlreadyPosted();
  }

  if (
    errorMessage.includes("notpropertyowner") ||
    errorMessage.includes("notowner") ||
    errorMessage.includes("unauthorized") ||
    errorMessage.includes("accesscontrol") ||
    errorMessage.includes("minter_role") ||
    errorMessage.includes("onlyrole")
  ) {
    return new UnauthorizedOperation(
      "No tenés permiso para mintear propiedades. En local, usá una cuenta Hardhat con MINTER_ROLE o ejecutá scripts/grant-minter.ts."
    );
  }

  if (errorMessage.includes("propertyalreadyrented") || errorMessage.includes("already active")) {
    return new RentalAlreadyActive();
  }

  if (errorMessage.includes("agreementexpired") || errorMessage.includes("deadline")) {
    return new AgreementExpired();
  }

  if (errorMessage.includes("no ethereum provider") || errorMessage.includes("install metamask")) {
    return new NoEthereumProvider();
  }

  if (errorMessage.includes("reading 'create'") || errorMessage.includes("createevmclient")) {
    return new NoEthereumProvider(
      "Error al iniciar MetaMask. Probá WalletConnect o abrí la página en MetaMask → Browser."
    );
  }

  // 4. Default fallback
  return new UnknownBlockchainError(error.message || undefined);
}
