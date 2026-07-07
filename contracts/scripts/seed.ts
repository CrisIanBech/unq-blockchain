import hre from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
    const networkName = hre.network.name;
    console.log(`Connecting to network: ${networkName}...`);

    const connection = await (hre.network as any).getOrCreate(networkName);
    const { ethers } = connection;

    const [landlord, tenant] = await ethers.getSigners();
    const landlordAddr = await landlord.getAddress();
    const tenantAddr = await tenant.getAddress();

    console.log("=== Deploying BlockRent ===\n");

    const RentalNFT = await ethers.getContractFactory("RentalNFT");
    const rentalNFT = await RentalNFT.deploy();
    await rentalNFT.waitForDeployment();
    const rentalNFTAddr = await rentalNFT.getAddress();

    const PropertyNFT = await ethers.getContractFactory("PropertyNFT");
    const propertyNFT = await PropertyNFT.deploy(rentalNFTAddr);
    await propertyNFT.waitForDeployment();
    const propertyNFTAddr = await propertyNFT.getAddress();

    await rentalNFT.setPropertyNFT(propertyNFTAddr);
    
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();
    const mockUSDCAddr = await mockUSDC.getAddress();
    
    const RentalAgreementFactory = await ethers.getContractFactory("RentalAgreementFactory");
    const factory = await RentalAgreementFactory.deploy();
    await factory.waitForDeployment();
    const factoryAddr = await factory.getAddress();

    console.log("\n=== Setting up scenarios ===\n");

    const MINTER_ROLE = await propertyNFT.MINTER_ROLE();
    await propertyNFT.grantRole(MINTER_ROLE, landlordAddr);
    
    for (let i = 1; i <= 8; i++) {
        const tx = await propertyNFT.connect(landlord).mint(landlordAddr, `ipfs://mock-property-${i}`, BigInt(100000 + i), BigInt(200000 + i));
        await tx.wait();
    }
    console.log("Minted 8 properties");

    await mockUSDC.mint(tenantAddr, ethers.parseUnits("1000000", 6));

    const baseRent = ethers.parseUnits("1000", 6);
    const securityDeposit = ethers.parseUnits("2000", 6);
    const inflationBps = 500;
    const lateFeeBps = 1000;
    const gracePeriod = 5 * 24 * 60 * 60;
    const paymentPeriod = 30 * 24 * 60 * 60;
    const inflationAdjustmentInterval = 12;
    const duration = 360 * 24 * 60 * 60;

    async function createAgreement(propId: number, dl: number) {
        const addr = await factory.connect(landlord).createRentalAgreement.staticCall(
            propertyNFTAddr, propId, tenantAddr, mockUSDCAddr, rentalNFTAddr,
            baseRent, securityDeposit, inflationBps, lateFeeBps, gracePeriod, paymentPeriod, inflationAdjustmentInterval, duration, dl
        );
        const tx = await factory.connect(landlord).createRentalAgreement(
            propertyNFTAddr, propId, tenantAddr, mockUSDCAddr, rentalNFTAddr,
            baseRent, securityDeposit, inflationBps, lateFeeBps, gracePeriod, paymentPeriod, inflationAdjustmentInterval, duration, dl
        );
        await tx.wait();
        return await ethers.getContractAt("RentalAgreement", addr);
    }

    let block = await ethers.provider.getBlock("latest");

    // 6. Atrasado (Active, time jumped > 30 days so late fees apply)
    console.log("\n6. Creating 'Atrasado' Agreement (Property #6)...");
    let dl = block!.timestamp + 7 * 24 * 60 * 60;
    const agrAtrasado = await createAgreement(6, dl);
    await propertyNFT.connect(landlord).approve(await agrAtrasado.getAddress(), 6);
    await mockUSDC.connect(tenant).approve(await agrAtrasado.getAddress(), securityDeposit);
    await agrAtrasado.connect(landlord).approveAgreement();
    await agrAtrasado.connect(tenant).approveAgreement();
    console.log("Advancing time by 30 days...");
    await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine", []);

    block = await ethers.provider.getBlock("latest");

    // 1. Por pagar (Active, time jumped 2 days, rent due but no late fees)
    console.log("\n1. Creating 'Por Pagar' Agreement (Property #1)...");
    dl = block!.timestamp + 7 * 24 * 60 * 60;
    const agrPorPagar = await createAgreement(1, dl);
    await propertyNFT.connect(landlord).approve(await agrPorPagar.getAddress(), 1);
    await mockUSDC.connect(tenant).approve(await agrPorPagar.getAddress(), securityDeposit);
    await agrPorPagar.connect(landlord).approveAgreement();
    await agrPorPagar.connect(tenant).approveAgreement();
    
    console.log("Advancing time by 2 days...");
    await ethers.provider.send("evm_increaseTime", [2 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine", []);

    block = await ethers.provider.getBlock("latest");

    // 2. Vencido (Expired) -> Prop 2
    console.log("\n2. Creating 'Vencido' Agreement (Property #2)...");
    const shortDeadline = block!.timestamp + 3600; // 1 hour
    const agrVencido = await createAgreement(2, shortDeadline);
    console.log("Advancing time by 2 hours...");
    await ethers.provider.send("evm_increaseTime", [2 * 3600]);
    await ethers.provider.send("evm_mine", []);
    await agrVencido.checkExpiration();
    const statusVencido = await agrVencido.status();
    console.log("Status:", statusVencido.toString(), "(6=Expired)");

    block = await ethers.provider.getBlock("latest");
    dl = block!.timestamp + 7 * 24 * 60 * 60;

    // 3. Por firmar (PendingSignatures) -> Prop 3
    console.log("\n3. Creating 'Por Firmar' Agreement (Property #3)...");
    const agrPorFirmar = await createAgreement(3, dl);
    const statusPorFirmar = await agrPorFirmar.status();
    console.log("Status:", statusPorFirmar.toString(), "(1=PendingSignatures)");

    // 7. Por firmar (Falta Inquilino) -> Prop 7
    console.log("\n7. Creating 'Por Firmar (Falta Inquilino)' Agreement (Property #7)...");
    const agrPorFirmarInq = await createAgreement(7, dl);
    await propertyNFT.connect(landlord).approve(await agrPorFirmarInq.getAddress(), 7);
    await agrPorFirmarInq.connect(landlord).approveAgreement();
    const statusPorFirmarInq = await agrPorFirmarInq.status();
    console.log("Status:", statusPorFirmarInq.toString(), "(1=PendingSignatures)");

    // 4. Cancelado -> Prop 4
    console.log("\n4. Creating 'Cancelado' Agreement (Property #4)...");
    const agrCancelado = await createAgreement(4, dl);
    await agrCancelado.connect(landlord).cancelAgreement();
    const statusCancel = await agrCancelado.status();
    console.log("Status:", statusCancel.toString(), "(4=Cancelled)");

    // 5. Pago (Active, paid up to date) -> Prop 5
    console.log("\n5. Creating 'Pago' Agreement (Property #5)...");
    const agrPago = await createAgreement(5, dl);
    await propertyNFT.connect(landlord).approve(await agrPago.getAddress(), 5);
    await mockUSDC.connect(tenant).approve(await agrPago.getAddress(), securityDeposit);
    await agrPago.connect(landlord).approveAgreement();
    await agrPago.connect(tenant).approveAgreement();
    // Pay the rent for the first month to make it "Pago"
    // tenant has already approved enough USDC for the security deposit, but needs more for rent
    await mockUSDC.connect(tenant).approve(await agrPago.getAddress(), baseRent);
    await agrPago.connect(tenant).payRent();
    const statusPago = await agrPago.status();
    console.log("Status:", statusPago.toString(), "(2=Active, rent paid)");

    // 8. Cancelación en progreso (Landlord canceló, falta Tenant) -> Prop 8
    console.log("\n8. Creating 'Cancelación en progreso' Agreement (Property #8)...");
    const agrCancelProgress = await createAgreement(8, dl);
    await propertyNFT.connect(landlord).approve(await agrCancelProgress.getAddress(), 8);
    await mockUSDC.connect(tenant).approve(await agrCancelProgress.getAddress(), securityDeposit);
    await agrCancelProgress.connect(landlord).approveAgreement();
    await agrCancelProgress.connect(tenant).approveAgreement();
    // It's active now. Landlord initiates cancel.
    await agrCancelProgress.connect(landlord).cancelAgreement();
    const statusCancelProgress = await agrCancelProgress.status();
    console.log("Status:", statusCancelProgress.toString(), "(2=Active, Cancel in progress)");


    console.log("\n=== Contract addresses for frontend ===\n");
    console.log(`propertyNFT: "${propertyNFTAddr}"`);
    console.log(`rentalNFT: "${rentalNFTAddr}"`);
    console.log(`factory: "${factoryAddr}"`);
    console.log(`mockUsdc: "${mockUSDCAddr}"`);

    console.log("\n=== Rental Agreements ===");
    console.log("1. Por Pagar (A tiempo):", await agrPorPagar.getAddress());
    console.log("2. Vencido:             ", await agrVencido.getAddress());
    console.log("3. Por Firmar:          ", await agrPorFirmar.getAddress());
    console.log("4. Cancelado:           ", await agrCancelado.getAddress());
    console.log("5. Pago (Al día):       ", await agrPago.getAddress());
    console.log("6. Atrasado (Multa):    ", await agrAtrasado.getAddress());
    console.log("7. Por Firmar (Falta Inq):", await agrPorFirmarInq.getAddress());
    console.log("8. Cancelando (Falta Inq):", await agrCancelProgress.getAddress());

    console.log("\n=== Accounts ===\n");
    console.log("Landlord:", landlordAddr);
    console.log("Landlord PK: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"); // Hardhat Account #0
    console.log("Tenant:", tenantAddr);
    console.log("Tenant PK: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"); // Hardhat Account #1

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