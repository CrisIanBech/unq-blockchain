import hre from "hardhat";

async function main() {
  const connection = await hre.network.connect("localhost");
  const ethers = connection.ethers;

  const [deployer, landlord, tenant] = await ethers.getSigners();
  const landlordAddr = await landlord.getAddress();
  const tenantAddr = await tenant.getAddress();

  console.log("=== Deploying BlockRent ===\n");

  const PropertyNFT = await ethers.getContractFactory("PropertyNFT");
  const propertyNFT = await PropertyNFT.deploy();
  const propertyNFTAddr = await propertyNFT.getAddress();
  console.log("PropertyNFT:", propertyNFTAddr);

  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  const mockUSDCAddr = await mockUSDC.getAddress();
  console.log("MockUSDC:", mockUSDCAddr);

  const RentalAgreementFactory = await ethers.getContractFactory("RentalAgreementFactory");
  const factory = await RentalAgreementFactory.deploy(propertyNFTAddr, mockUSDCAddr);
  const factoryAddr = await factory.getAddress();
  console.log("RentalAgreementFactory:", factoryAddr);

  const ReviewSystem = await ethers.getContractFactory("ReviewSystem");
  const reviewSystem = await ReviewSystem.deploy(propertyNFTAddr, factoryAddr);
  const reviewSystemAddr = await reviewSystem.getAddress();
  console.log("ReviewSystem:", reviewSystemAddr);

  console.log("\n=== Setting up scenario ===\n");

  const MINTER_ROLE = await propertyNFT.MINTER_ROLE();
  await propertyNFT.grantRole(MINTER_ROLE, landlordAddr);
  console.log("MINTER_ROLE granted to landlord:", landlordAddr);

  const tx = await propertyNFT.connect(landlord).mint(landlordAddr, "ipfs://property-1");
  await tx.wait();
  console.log("Property #1 minted to landlord");

  const tx2 = await propertyNFT.connect(landlord).mint(landlordAddr, "ipfs://property-2");
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
  const tx1 = await factory.connect(landlord).createRentalAgreement(
    1, tenantAddr, baseRent, securityDeposit,
    inflationBps, lateFeeBps, gracePeriod, duration, deadline
  );
  await tx1.wait();

  const agreement1Addr = await factory.getAgreementAt(0);
  console.log("Agreement #1:", agreement1Addr);

  const agreement1 = await ethers.getContractAt("RentalAgreement", agreement1Addr);

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
  const tx3 = await factory.connect(landlord).createRentalAgreement(
    2, tenantAddr, baseRent, securityDeposit,
    inflationBps, lateFeeBps, gracePeriod, duration, deadline2
  );
  await tx3.wait();

  const agreement2Addr = await factory.getAgreementAt(1);
  console.log("Agreement #2:", agreement2Addr);

  const agreement2 = await ethers.getContractAt("RentalAgreement", agreement2Addr);

  await mockUSDC.connect(tenant).approve(agreement2Addr, securityDeposit);
  console.log("USDC approved for agreement #2");

  await agreement2.connect(landlord).approveAgreement();
  console.log("Landlord approved agreement #2");

  await agreement2.connect(tenant).approveAgreement();
  console.log("Tenant approved agreement #2 → Active");

  const status2 = await agreement2.status();
  console.log("Status #2:", status2.toString(), "(2=Active)");

  console.log("\n=== Contract addresses for frontend ===\n");
  console.log(`propertyNFT: "${propertyNFTAddr}"`);
  console.log(`factory: "${factoryAddr}"`);
  console.log(`reviewSystem: "${reviewSystemAddr}"`);
  console.log(`mockUsdc: "${mockUSDCAddr}"`);

  console.log("\n=== Accounts ===\n");
  console.log("Landlord:", landlordAddr);
  console.log("Tenant:", tenantAddr);
  console.log("Tenant PK: 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a");
}

main().catch(console.error);
