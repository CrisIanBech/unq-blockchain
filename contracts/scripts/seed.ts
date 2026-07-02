import hre from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
    const networkName = hre.network.name;
    console.log(`Connecting to network: ${networkName}...`);

    // Load custom connection manager to retrieve dynamic ethers instance
    const connection = await (hre.network as any).getOrCreate(networkName);
    const { ethers } = connection;

    const [deployer, landlord, tenant] = await ethers.getSigners();
    const landlordAddr = await landlord.getAddress();
    const tenantAddr = await tenant.getAddress();

    console.log("=== Deploying BlockRent ===\n");

    // 1. Deploy RentalNFT
    const RentalNFT = await ethers.getContractFactory("RentalNFT");
    const rentalNFT = await RentalNFT.deploy();
    await rentalNFT.waitForDeployment();
    const rentalNFTAddr = await rentalNFT.getAddress();
    console.log("RentalNFT:", rentalNFTAddr);

    // 2. Deploy PropertyNFT (passing RentalNFT address)
    const PropertyNFT = await ethers.getContractFactory("PropertyNFT");
    const propertyNFT = await PropertyNFT.deploy(rentalNFTAddr);
    await propertyNFT.waitForDeployment();
    const propertyNFTAddr = await propertyNFT.getAddress();
    console.log("PropertyNFT:", propertyNFTAddr);

    // 3. Establish Bidirectional on-chain link
    await rentalNFT.setPropertyNFT(propertyNFTAddr);
    console.log("Linked PropertyNFT and RentalNFT");

    // 4. Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();
    const mockUSDCAddr = await mockUSDC.getAddress();
    console.log("MockUSDC:", mockUSDCAddr);

    // 5. Deploy RentalAgreementFactory (stateless, no constructor arguments)
    const RentalAgreementFactory = await ethers.getContractFactory("RentalAgreementFactory");
    const factory = await RentalAgreementFactory.deploy();
    await factory.waitForDeployment();
    const factoryAddr = await factory.getAddress();
    console.log("RentalAgreementFactory:", factoryAddr);

    console.log("\n=== Setting up scenario ===\n");

    const MINTER_ROLE = await propertyNFT.MINTER_ROLE();
    await propertyNFT.grantRole(MINTER_ROLE, landlordAddr);
    console.log("MINTER_ROLE granted to landlord:", landlordAddr);

    // Mint property tokens with Mercator coordinates (e.g. 100000n, 200000n)
    const tx = await propertyNFT.connect(landlord).mint(landlordAddr, "ipfs://mock-property-1", 100000n, 200000n);
    await tx.wait();
    console.log("Property #1 minted to landlord");

    const tx2 = await propertyNFT.connect(landlord).mint(landlordAddr, "ipfs://mock-property-2", 300000n, 400000n);
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
    // Predict agreement address via staticCall
    const agreement1Addr = await factory.connect(landlord).createRentalAgreement.staticCall(
        propertyNFTAddr, 1, tenantAddr, mockUSDCAddr, rentalNFTAddr,
        baseRent, securityDeposit, inflationBps, lateFeeBps, gracePeriod, duration, deadline
    );

    const tx1 = await factory.connect(landlord).createRentalAgreement(
        propertyNFTAddr, 1, tenantAddr, mockUSDCAddr, rentalNFTAddr,
        baseRent, securityDeposit, inflationBps, lateFeeBps, gracePeriod, duration, deadline
    );
    await tx1.wait();
    console.log("Agreement #1 created at:", agreement1Addr);

    const agreement1 = await ethers.getContractAt("RentalAgreement", agreement1Addr);

    // Delegate PropertyNFT approval to the agreement contract for activation
    await propertyNFT.connect(landlord).approve(agreement1Addr, 1);
    console.log("PropertyNFT #1 approved for agreement #1");

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

    // Predict agreement address via staticCall
    const agreement2Addr = await factory.connect(landlord).createRentalAgreement.staticCall(
        propertyNFTAddr, 2, tenantAddr, mockUSDCAddr, rentalNFTAddr,
        baseRent, securityDeposit, inflationBps, lateFeeBps, gracePeriod, duration, deadline2
    );

    const tx3 = await factory.connect(landlord).createRentalAgreement(
        propertyNFTAddr, 2, tenantAddr, mockUSDCAddr, rentalNFTAddr,
        baseRent, securityDeposit, inflationBps, lateFeeBps, gracePeriod, duration, deadline2
    );
    await tx3.wait();
    console.log("Agreement #2 created at:", agreement2Addr);

    const agreement2 = await ethers.getContractAt("RentalAgreement", agreement2Addr);

    // Delegate PropertyNFT approval to the agreement contract for activation
    await propertyNFT.connect(landlord).approve(agreement2Addr, 2);
    console.log("PropertyNFT #2 approved for agreement #2");

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
    console.log(`rentalNFT: "${rentalNFTAddr}"`);
    console.log(`factory: "${factoryAddr}"`);
    console.log(`mockUsdc: "${mockUSDCAddr}"`);

    console.log("\n=== Accounts ===\n");
    console.log("Landlord:", landlordAddr);
    console.log("Tenant:", tenantAddr);
    console.log("Tenant PK: 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a");

    // Automatically update frontend/.env file
    const envPath = path.resolve(process.cwd(), "../frontend/.env");

    if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, "utf8");

        envContent = envContent.replace(/VITE_PROPERTY_NFT_ADDRESS=.*/, `VITE_PROPERTY_NFT_ADDRESS=${propertyNFTAddr}`);
        envContent = envContent.replace(/VITE_RENTAL_FACTORY_ADDRESS=.*/, `VITE_RENTAL_FACTORY_ADDRESS=${factoryAddr}`);
        envContent = envContent.replace(/VITE_USDC_ADDRESS=.*/, `VITE_USDC_ADDRESS=${mockUSDCAddr}`);

        fs.writeFileSync(envPath, envContent, "utf8");
        console.log("\n[Auto] Updated frontend/.env with deployed addresses!");
    } else {
        console.log("\n[Warning] frontend/.env file not found, skipping auto-update.");
    }
}

main().catch(console.error);