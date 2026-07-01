import {
  UserRejectedTransaction,
  InsufficientFunds,
  RentalAlreadyActive,
  AgreementExpired,
  UnauthorizedOperation,
  UnknownBlockchainError,
  NoEthereumProvider,
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
  if (errorMessage.includes("notpropertyowner") || errorMessage.includes("notowner") || errorMessage.includes("unauthorized")) {
    return new UnauthorizedOperation();
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
