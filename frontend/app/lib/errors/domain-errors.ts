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

export class InvalidRating extends Error {
  constructor(message = "El rating debe estar entre 1 y 5.") {
    super(message);
    this.name = "InvalidRating";
  }
}

export class CommentTooLong extends Error {
  constructor(message = "El comentario no puede superar los 280 caracteres.") {
    super(message);
    this.name = "CommentTooLong";
  }
}

export class NoActiveRental extends Error {
  constructor(message = "No hay un contrato de alquiler activo para esta propiedad.") {
    super(message);
    this.name = "NoActiveRental";
  }
}

export class NotTenantOfRental extends Error {
  constructor(message = "Solo el inquilino del contrato puede realizar esta acción.") {
    super(message);
    this.name = "NotTenantOfRental";
  }
}

export class UnknownBlockchainError extends Error {
  constructor(message = "Ocurrió un error inesperado al interactuar con la blockchain.") {
    super(message);
    this.name = "UnknownBlockchainError";
  }
}
