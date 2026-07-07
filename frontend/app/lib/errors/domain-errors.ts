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

export class InvalidAgreementStatus extends Error {
  constructor(message = "El contrato de alquiler de la propiedad no se encuentra activo.") {
    super(message);
    this.name = "InvalidAgreementStatus";
  }
}

export class NoActiveOrCompletedRental extends Error {
  constructor(message = "No posees un alquiler activo o finalizado que te autorice a dejar una reseña en esta propiedad.") {
    super(message);
    this.name = "NoActiveOrCompletedRental";
  }
}

export class ReviewAlreadyPosted extends Error {
  constructor(message = "Ya has publicado una reseña para este contrato de alquiler anteriormente.") {
    super(message);
    this.name = "ReviewAlreadyPosted";
  }
}
