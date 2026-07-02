import hre from "hardhat";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

async function main() {
    const networkName = hre.network.name;
    console.log(`Connecting to network: ${networkName}...`);

    // Load custom connection manager to retrieve dynamic ethers instance
    const connection = await (hre.network as any).getOrCreate(networkName);
    const { ethers } = connection;

    const [deployer, landlord, tenant] = await ethers.getSigners();
    const tenantAddr = await tenant.getAddress();

    // Read addresses from frontend/.env
    const envPath = path.resolve(process.cwd(), "../frontend/.env");
    if (!fs.existsSync(envPath)) {
        throw new Error("frontend/.env not found. Please run seed script first.");
    }
    
    // Parse env file
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    const factoryAddress = envConfig.VITE_RENTAL_FACTORY_ADDRESS;
    const usdcAddress = envConfig.VITE_USDC_ADDRESS;
    
    if (!factoryAddress || !usdcAddress) {
        throw new Error("Contract addresses not found in frontend/.env");
    }

    console.log("Using Factory Address:", factoryAddress);
    console.log("Using MockUSDC Address:", usdcAddress);

    // Get factory contract instance
    const factory = await ethers.getContractAt("RentalAgreementFactory", factoryAddress);
    
    // Find RentalAgreementCreated events to get deployed agreements
    const filter = factory.filters.RentalAgreementCreated();
    const events = await factory.queryFilter(filter, 0, "latest");

    if (events.length === 0) {
        console.log("No rental agreements found.");
        return;
    }

    const usdc = await ethers.getContractAt("MockUSDC", usdcAddress);

    for (const event of events) {
        const eventArgs = (event as any).args;
        const agreementAddress = eventArgs.agreementAddress;
        const propertyId = eventArgs.propertyId;
        const agreement = await ethers.getContractAt("RentalAgreement", agreementAddress);
        
        const tenantOfAgreement = await agreement.tenant();
        const status = await agreement.status();
        
        // Only pay if the agreement is Active (status === 2) and belongs to our tenant
        if (Number(status) === 2 && tenantOfAgreement.toLowerCase() === tenantAddr.toLowerCase()) {
            console.log(`\nProcessing payment for Property #${propertyId} at Agreement ${agreementAddress}...`);
            
            // Get amount to pay
            const [currentRent, lateFee, totalAmount] = await agreement.getRentAmountToPay();
            console.log(`Amount to pay: ${ethers.formatUnits(totalAmount, 6)} USDC (Rent: ${ethers.formatUnits(currentRent, 6)}, Late fee: ${ethers.formatUnits(lateFee, 6)})`);
            
            if (totalAmount === 0n) {
                console.log("No rent due at the moment.");
                continue;
            }

            // Approve MockUSDC to agreement
            console.log("Approving USDC...");
            const approveTx = await usdc.connect(tenant).approve(agreementAddress, totalAmount);
            await approveTx.wait();
            
            // Pay Rent
            console.log("Paying rent...");
            const payTx = await agreement.connect(tenant).payRent();
            await payTx.wait();
            
            console.log(`[Success] Paid rent for Property #${propertyId}!`);
        }
    }
}

main().catch(console.error);
