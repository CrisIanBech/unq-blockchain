import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import hre from "hardhat";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const networkName = hre.network.name;
  console.log(`Connecting to network: ${networkName}...`);

  // Load custom connection manager to retrieve dynamic ethers instance
  const connection = await (hre.network as any).getOrCreate(networkName);
  const { ethers } = connection;

  const chainId = Number(await ethers.provider.send("eth_chainId", []));
  console.log(`Connection established on network: ${networkName} (Chain ID: ${chainId})`);

  // 1. Resolve Protocol Version
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  let nextVersion = 1;
  const files = fs.readdirSync(deploymentsDir);
  const versionFiles = files.filter(f => f.startsWith("deploy-v") && f.endsWith(".json"));

  if (versionFiles.length > 0) {
    const versions = versionFiles.map(f => {
      const match = f.match(/deploy-v(\d+)\.json/);
      return match ? parseInt(match[1], 10) : 0;
    });
    nextVersion = Math.max(...versions) + 1;
  }

  console.log(`Calculated Protocol Version: v${nextVersion}`);

  // 2. Deploy MockUSDC
  console.log("Deploying MockUSDC...");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  await mockUSDC.waitForDeployment();
  const mockUSDCAddress = await mockUSDC.getAddress();
  console.log(`MockUSDC deployed to: ${mockUSDCAddress}`);

  // 3. Deploy RentalNFT
  console.log("Deploying RentalNFT...");
  const RentalNFT = await ethers.getContractFactory("RentalNFT");
  const rentalNFT = await RentalNFT.deploy();
  await rentalNFT.waitForDeployment();
  const rentalNFTAddress = await rentalNFT.getAddress();
  console.log(`RentalNFT deployed to: ${rentalNFTAddress}`);

  // 4. Deploy PropertyNFT (passing RentalNFT address)
  console.log("Deploying PropertyNFT...");
  const PropertyNFT = await ethers.getContractFactory("PropertyNFT");
  const propertyNFT = await PropertyNFT.deploy(rentalNFTAddress);
  await propertyNFT.waitForDeployment();
  const propertyNFTAddress = await propertyNFT.getAddress();
  console.log(`PropertyNFT deployed to: ${propertyNFTAddress}`);

  // 5. Establish Bidirectional on-chain link
  console.log("Linking PropertyNFT to RentalNFT...");
  const linkTx = await rentalNFT.setPropertyNFT(propertyNFTAddress);
  await linkTx.wait();
  console.log("On-chain bidirectional link completed.");

  // 6. Deploy RentalAgreementFactory
  console.log("Deploying RentalAgreementFactory...");
  const RentalAgreementFactory = await ethers.getContractFactory("RentalAgreementFactory");
  const factory = await RentalAgreementFactory.deploy();
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log(`RentalAgreementFactory deployed to: ${factoryAddress}`);

  // 6.5 Deploy Review
  console.log("Deploying Review System...");
  const Review = await ethers.getContractFactory("Review");
  const review = await Review.deploy(propertyNFTAddress, factoryAddress);
  await review.waitForDeployment();
  const reviewAddress = await review.getAddress();
  console.log(`Review System deployed to: ${reviewAddress}`);

  // 7. On-chain Validation Checks
  console.log("Validating deployed configuration on-chain...");

  const rentalNFTInProp = await propertyNFT.rentalNFT();
  const propNFTInRental = await rentalNFT.propertyNFT();

  if (rentalNFTInProp !== rentalNFTAddress) {
    throw new Error(`Validation Failed: PropertyNFT's rentalNFT (${rentalNFTInProp}) does not match RentalNFT (${rentalNFTAddress})`);
  }
  if (propNFTInRental !== propertyNFTAddress) {
    throw new Error(`Validation Failed: RentalNFT's propertyNFT (${propNFTInRental}) does not match PropertyNFT (${propertyNFTAddress})`);
  }

  console.log("All on-chain configurations validated successfully!");

  // Fund accounts with MockUSDC
  console.log("Funding accounts with MockUSDC...");
  
  // Always mint to the deployer so they have funds to test
  const signers = await ethers.getSigners();
  const deployerAddress = await signers[0].getAddress();
  const amountToMint = ethers.parseUnits("10000", 6); // 10,000 USDC
  
  await mockUSDC.mint(deployerAddress, amountToMint);
  console.log(`Minted 10,000 MockUSDC to Deployer (${deployerAddress})`);

  // Only fund hardhat test accounts on local networks to save gas on public testnets
  if (networkName === "localhost" || networkName === "hardhat") {
    const landlordAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const tenantAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
    
    await mockUSDC.mint(landlordAddress, amountToMint);
    await mockUSDC.mint(tenantAddress, amountToMint);
    console.log(`Minted 10,000 MockUSDC to Landlord (${landlordAddress})`);
    console.log(`Minted 10,000 MockUSDC to Tenant (${tenantAddress})`);
  }


  // 8. Log Deployment Summary
  console.log("\n========================================");
  console.log(`Protocol Version: v${nextVersion}`);
  console.log("\nMockUSDC:");
  console.log(mockUSDCAddress);
  console.log("\nPropertyNFT:");
  console.log(propertyNFTAddress);
  console.log("\nRentalNFT:");
  console.log(rentalNFTAddress);
  console.log("\nRentalAgreementFactory:");
  console.log(factoryAddress);
  console.log("\nReview System:");
  console.log(reviewAddress);
  console.log("\nDeployment completed successfully.");
  console.log("========================================\n");

  // 9. Write Versioned Artifact
  const deploymentReport = {
    protocolVersion: nextVersion,
    network: networkName,
    chainId: chainId,
    deployedAt: new Date().toISOString(),
    contracts: {
      mockUSDC: mockUSDCAddress,
      propertyNFT: propertyNFTAddress,
      rentalNFT: rentalNFTAddress,
      rentalAgreementFactory: factoryAddress,
      reviewSystem: reviewAddress
    }
  };

  const reportPath = path.join(deploymentsDir, `deploy-v${nextVersion}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(deploymentReport, null, 2), "utf8");
  console.log(`Versioned deployment file written to: ${reportPath}`);

  // 10. Generate Frontend Example Config Files
  const frontendDir = path.join(__dirname, "../../frontend");
  if (fs.existsSync(frontendDir)) {
    // 10a. Write frontend/.env.example
    const envExampleContent = [
      `VITE_GOOGLE_MAPS_API_KEY=`,
      `VITE_PROPERTY_NFT_ADDRESS=${propertyNFTAddress}`,
      `VITE_RENTAL_FACTORY_ADDRESS=${factoryAddress}`,
      `VITE_USDC_ADDRESS=${mockUSDCAddress}`,
      `VITE_REVIEW_SYSTEM_ADDRESS=${reviewAddress}`
    ].join("\n") + "\n";

    const envExamplePath = path.join(frontendDir, ".env.example");
    fs.writeFileSync(envExamplePath, envExampleContent, "utf8");
    console.log(`Frontend example environment file written to: ${envExamplePath}`);

    // 10b. Write frontend/contracts-config.example.ts
    const configExampleContent = [
      `export const CONTRACTS_CONFIG = {`,
      `  mockUSDC: "${mockUSDCAddress}",`,
      `  propertyNFT: "${propertyNFTAddress}",`,
      `  rentalNFT: "${rentalNFTAddress}",`,
      `  rentalAgreementFactory: "${factoryAddress}",`,
      `  reviewSystem: "${reviewAddress}"`,
      `};`,
      ``
    ].join("\n");

    const configExamplePath = path.join(frontendDir, "contracts-config.example.ts");
    fs.writeFileSync(configExamplePath, configExampleContent, "utf8");
    console.log(`Frontend contracts config example written to: ${configExamplePath}`);
  } else {
    console.log("Warning: Frontend directory not found; skipping example configuration exports.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
