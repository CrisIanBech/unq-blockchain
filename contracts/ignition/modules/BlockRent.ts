import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const BlockRentModule = buildModule("BlockRentModule", (m) => {
  // 1. Deploy MockUSDC
  const mockUSDC = m.contract("MockUSDC");

  // 2. Deploy RentalNFT
  const rentalNFT = m.contract("RentalNFT");

  // 3. Deploy PropertyNFT (passing RentalNFT address as constructor argument)
  const propertyNFT = m.contract("PropertyNFT", [rentalNFT]);
  
  // 4. Resolve the bidirectional relationship on-chain
  m.call(rentalNFT, "setPropertyNFT", [propertyNFT]);
  
  // 5. Deploy RentalAgreementFactory (forced to run after propertyNFT and mockUSDC are mined)
  const factory = m.contract("RentalAgreementFactory", [propertyNFT, mockUSDC, rentalNFT]);
  
  // 6. Deploy ReviewSystem, injecting PropertyNFT and Factory addresses
  const review = m.contract("Review", [propertyNFT, factory]);

  return { propertyNFT, mockUSDC, rentalNFT, factory, review };
});

export default BlockRentModule;
