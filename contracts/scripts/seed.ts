import hre from "hardhat";

async function main() {
  const connection = await hre.network.connect("localhost");
  const ethers = connection.ethers;

  const [deployer, landlord, tenant] = await ethers.getSigners();
  const landlordAddr = await landlord.getAddress();
  const tenantAddr = await tenant.getAddress();

  console.log("=== Deploying BlockRent ===\n");

  const RentalNFT = await ethers.getContractFactory("RentalNFT");
  const rentalNFT = await RentalNFT.deploy();
  const rentalNFTAddr = await rentalNFT.getAddress();
  console.log("RentalNFT:", rentalNFTAddr);

  const PropertyNFT = await ethers.getContractFactory("PropertyNFT");
  const propertyNFT = await PropertyNFT.deploy(rentalNFTAddr);
  const propertyNFTAddr = await propertyNFT.getAddress();
  console.log("PropertyNFT:", propertyNFTAddr);

  await rentalNFT.setPropertyNFT(propertyNFTAddr);
  console.log("RentalNFT <-> PropertyNFT linked");

  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  const mockUSDCAddr = await mockUSDC.getAddress();
  console.log("MockUSDC:", mockUSDCAddr);

  const RentalAgreementFactory = await ethers.getContractFactory("RentalAgreementFactory");
  const factory = await RentalAgreementFactory.deploy();
  const factoryAddr = await factory.getAddress();
  console.log("RentalAgreementFactory:", factoryAddr);

  const Review = await ethers.getContractFactory("Review");
  const reviewSystem = await Review.deploy(propertyNFTAddr, rentalNFTAddr);
  const reviewSystemAddr = await reviewSystem.getAddress();
  console.log("Review:", reviewSystemAddr);

  console.log("\n=== Setting up scenario ===\n");

  const MINTER_ROLE = await propertyNFT.MINTER_ROLE();
  await propertyNFT.grantRole(MINTER_ROLE, landlordAddr);
  console.log("MINTER_ROLE granted to landlord:", landlordAddr);

  const tx = await propertyNFT.connect(landlord).mint(landlordAddr, "ipfs://property-1", 100000n, 200000n);
  await tx.wait();
  console.log("Property #1 minted to landlord");

  const tx2 = await propertyNFT.connect(landlord).mint(landlordAddr, "ipfs://property-2", 150000n, 250000n);
  await tx2.wait();
  console.log("Property #2 minted to landlord");

  await mockUSDC.mint(tenantAddr, ethers.parseUnits("100000", 6));
  console.log("USDC minted to tenant:", tenantAddr);

  const baseRent = ethers.parseUnits("1000", 6);
  const securityDeposit = ethers.parseUnits("2000", 6);
  const inflationBps = 500;
  const lateFeeBps = 1000;
  const gracePeriod = 5 * 24 * 60 * 60;
  const duration = 360 * 24 * 60 * 60;
  let block = await ethers.provider.getBlock("latest");
  const deadline = block!.timestamp + 7 * 24 * 60 * 60;

  console.log("Creating rental agreement for property #1...");
  const agreement1Addr = await factory.connect(landlord).createRentalAgreement.staticCall(
    propertyNFTAddr, 1, tenantAddr, mockUSDCAddr,
    rentalNFTAddr, baseRent, securityDeposit,
    inflationBps, lateFeeBps, gracePeriod, duration, deadline
  );
  await factory.connect(landlord).createRentalAgreement(
    propertyNFTAddr, 1, tenantAddr, mockUSDCAddr,
    rentalNFTAddr, baseRent, securityDeposit,
    inflationBps, lateFeeBps, gracePeriod, duration, deadline
  );
  console.log("Agreement #1:", agreement1Addr);

  const agreement1 = await ethers.getContractAt("RentalAgreement", agreement1Addr);

  await propertyNFT.connect(landlord).approve(agreement1Addr, 1);
  await mockUSDC.connect(tenant).approve(agreement1Addr, securityDeposit);
  console.log("USDC approved for agreement #1");

  await agreement1.connect(landlord).approveAgreement();
  console.log("Landlord approved agreement #1");

  await agreement1.connect(tenant).approveAgreement();
  console.log("Tenant approved agreement #1 → Active");

  const status1 = await agreement1.status();
  console.log("Status #1:", status1.toString(), "(2=Active)");

  console.log("\nCreating rental agreement for property #2...");
  block = await ethers.provider.getBlock("latest");
  const deadline2 = block!.timestamp + 7 * 24 * 60 * 60;
  const agreement2Addr = await factory.connect(landlord).createRentalAgreement.staticCall(
    propertyNFTAddr, 2, tenantAddr, mockUSDCAddr,
    rentalNFTAddr, baseRent, securityDeposit,
    inflationBps, lateFeeBps, gracePeriod, duration, deadline2
  );
  await factory.connect(landlord).createRentalAgreement(
    propertyNFTAddr, 2, tenantAddr, mockUSDCAddr,
    rentalNFTAddr, baseRent, securityDeposit,
    inflationBps, lateFeeBps, gracePeriod, duration, deadline2
  );
  console.log("Agreement #2:", agreement2Addr);

  const agreement2 = await ethers.getContractAt("RentalAgreement", agreement2Addr);

  await propertyNFT.connect(landlord).approve(agreement2Addr, 2);
  await mockUSDC.connect(tenant).approve(agreement2Addr, securityDeposit);
  console.log("USDC approved for agreement #2");

  await agreement2.connect(landlord).approveAgreement();
  console.log("Landlord approved agreement #2");

  await agreement2.connect(tenant).approveAgreement();
  console.log("Tenant approved agreement #2 → Active");

  const status2 = await agreement2.status();
  console.log("Status #2:", status2.toString(), "(2=Active)");

  console.log("\n=== Contract addresses for frontend ===\n");
  console.log(`VITE_PROPERTY_NFT_ADDRESS="${propertyNFTAddr}"`);
  console.log(`VITE_RENTAL_FACTORY_ADDRESS="${factoryAddr}"`);
  console.log(`VITE_RENTAL_NFT_ADDRESS="${rentalNFTAddr}"`);
  console.log(`VITE_REVIEW_SYSTEM_ADDRESS="${reviewSystemAddr}"`);
  console.log(`VITE_USDC_ADDRESS="${mockUSDCAddr}"`);

  console.log("\n=== Accounts ===\n");
  console.log("Landlord:", landlordAddr);
  console.log("Tenant:", tenantAddr);
  console.log("Tenant PK: 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a");
}

main().catch(console.error);
