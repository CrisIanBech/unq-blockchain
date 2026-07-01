export class UserRejectedTransaction extends Error {
  constructor(message = "La transacción fue rechazada por el usuario en MetaMask.") {
    super(message);
    this.name = "UserRejectedTransaction";
  }
}

export class InsufficientFunds extends Error {
  constructor(message = "Fondos insuficientes (USDC o ETH) para completar la transacción.") {
    super(message);
    this.name = "InsufficientFunds";
  }
}

export class RentalAlreadyActive extends Error {
  constructor(message = "La propiedad ya posee un contrato de alquiler activo en la blockchain.") {
    super(message);
    this.name = "RentalAlreadyActive";
  }
}

export class AgreementExpired extends Error {
  constructor(message = "El plazo límite para la firma del acuerdo de alquiler ha expirado.") {
    super(message);
    this.name = "AgreementExpired";
  }
}

export class UnauthorizedOperation extends Error {
  constructor(message = "Operación no autorizada. No posees el rol o la propiedad requerida.") {
    super(message);
    this.name = "UnauthorizedOperation";
  }
}

export class UnknownBlockchainError extends Error {
  constructor(message = "Ocurrió un error inesperado al interactuar con la blockchain.") {
    super(message);
    this.name = "UnknownBlockchainError";
  }
}

export class NoEthereumProvider extends Error {
  constructor(
    message = "No se pudo conectar la billetera. En el celular, aprobá la conexión en MetaMask y volvé a Chrome. También podés abrir la página desde MetaMask → Browser."
  ) {
    super(message);
    this.name = "NoEthereumProvider";
  }
}
