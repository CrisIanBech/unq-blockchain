import { ethers } from "ethers";
import { CONTRACT_ADDRESSES } from "./addresses";

import PropertyNFTABI from "./abi/PropertyNFT.json";
import RentalAgreementFactoryABI from "./abi/RentalAgreementFactory.json";
import RentalAgreementABI from "./abi/RentalAgreement.json";
import RentalNFTABI from "./abi/RentalNFT.json";
import MockUSDCABI from "./abi/MockUSDC.json";

/**
 * Instantiates the PropertyNFT contract interface.
 */
export function getPropertyNFT(runner: ethers.ContractRunner): ethers.Contract {
  return new ethers.Contract(CONTRACT_ADDRESSES.propertyNft, PropertyNFTABI.abi, runner);
}

/**
 * Instantiates the RentalAgreementFactory contract interface.
 */
export function getRentalAgreementFactory(runner: ethers.ContractRunner): ethers.Contract {
  return new ethers.Contract(CONTRACT_ADDRESSES.rentalFactory, RentalAgreementFactoryABI.abi, runner);
}

/**
 * Instantiates the MockUSDC contract interface.
 */
export function getMockUSDC(runner: ethers.ContractRunner): ethers.Contract {
  return new ethers.Contract(CONTRACT_ADDRESSES.usdc, MockUSDCABI.abi, runner);
}

/**
 * Instantiates a RentalAgreement contract at the dynamically deployed contract address.
 */
export function getRentalAgreement(address: string, runner: ethers.ContractRunner): ethers.Contract {
  return new ethers.Contract(address, RentalAgreementABI.abi, runner);
}

/**
 * Instantiates a RentalNFT contract at the dynamically deployed contract address.
 */
export function getRentalNFT(address: string, runner: ethers.ContractRunner): ethers.Contract {
  return new ethers.Contract(address, RentalNFTABI.abi, runner);
}
