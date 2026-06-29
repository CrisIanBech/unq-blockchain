import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const BlockRentModule = buildModule("BlockRentModule", (m) => {
  // 1. Deploy MockUSDC
  const mockUSDC = m.contract("MockUSDC");

  // 2. Deploy PropertyNFT (forced to run after MockUSDC is mined)
  const propertyNFT = m.contract("PropertyNFT", [], { after: [mockUSDC] });

  // 3. Deploy RentalAgreementFactory (forced to run after both are mined)
  const factory = m.contract("RentalAgreementFactory", [propertyNFT, mockUSDC]);

  // 4. Deploy ReviewSystem, injecting PropertyNFT and Factory addresses
  const review = m.contract("Review", [propertyNFT, factory]);

  return { propertyNFT, mockUSDC, factory, review };
});

export default BlockRentModule;
