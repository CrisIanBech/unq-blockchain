import { ethers } from "ethers";
import { CONTRACT_ADDRESSES } from "./addresses";

import PropertyNFTABI from "./abi/PropertyNFT.json";
import RentalAgreementFactoryABI from "./abi/RentalAgreementFactory.json";
import RentalAgreementABI from "./abi/RentalAgreement.json";
import RentalNFTABI from "./abi/RentalNFT.json";
import MockUSDCABI from "./abi/MockUSDC.json";

// WeakMap cache: active signer/provider -> (contract address -> Contract instance)
const contractCache = new WeakMap<ethers.ContractRunner, Map<string, ethers.BaseContract>>();

function getCachedContract<T extends ethers.BaseContract>(
  address: string,
  abi: any,
  runner: ethers.ContractRunner,
  factory: (addr: string, abiJson: any, run: ethers.ContractRunner) => T
): T {
  let runnerCache = contractCache.get(runner);
  if (!runnerCache) {
    runnerCache = new Map<string, ethers.BaseContract>();
    contractCache.set(runner, runnerCache);
  }

  let contract = runnerCache.get(address);
  if (!contract) {
    contract = factory(address, abi, runner);
    runnerCache.set(address, contract);
  }
  return contract as T;
}

const standardFactory = (addr: string, abi: any, runner: ethers.ContractRunner) => {
  return new ethers.Contract(addr, abi.abi, runner);
};

export function getPropertyNFT(runner: ethers.ContractRunner): ethers.Contract {
  return getCachedContract(CONTRACT_ADDRESSES.propertyNft, PropertyNFTABI, runner, standardFactory);
}

export function getRentalAgreementFactory(runner: ethers.ContractRunner): ethers.Contract {
  return getCachedContract(CONTRACT_ADDRESSES.rentalFactory, RentalAgreementFactoryABI, runner, standardFactory);
}

export function getMockUSDC(runner: ethers.ContractRunner): ethers.Contract {
  return getCachedContract(CONTRACT_ADDRESSES.usdc, MockUSDCABI, runner, standardFactory);
}

export function getRentalAgreement(address: string, runner: ethers.ContractRunner): ethers.Contract {
  return getCachedContract(address, RentalAgreementABI, runner, standardFactory);
}

export function getRentalNFT(address: string, runner: ethers.ContractRunner): ethers.Contract {
  return getCachedContract(address, RentalNFTABI, runner, standardFactory);
}
