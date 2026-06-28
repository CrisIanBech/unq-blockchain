import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const BlockRentModule = buildModule("BlockRentModule", (m) => {
  // 1. Deploy PropertyNFT
  const propertyNFT = m.contract("PropertyNFT");

  // 2. Deploy MockUSDC
  const mockUSDC = m.contract("MockUSDC");

  // 3. Deploy RentalAgreementFactory, injecting the deployed PropertyNFT and MockUSDC addresses
  const factory = m.contract("RentalAgreementFactory", [propertyNFT, mockUSDC]);

  return { propertyNFT, mockUSDC, factory };
});

export default BlockRentModule;
