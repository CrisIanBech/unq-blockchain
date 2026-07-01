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
  const factory = await RentalAgreementFactory.deploy(propertyNFTAddress, mockUSDCAddress, rentalNFTAddress);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log(`RentalAgreementFactory deployed to: ${factoryAddress}`);

  // 7. On-chain Validation Checks
  console.log("Validating deployed configuration on-chain...");

  const rentalNFTInProp = await propertyNFT.rentalNFT();
  const propNFTInRental = await rentalNFT.propertyNFT();
  const propNFTInFactory = await factory.propertyNFT();
  const usdcInFactory = await factory.usdcToken();
  const rentalNFTInFactory = await factory.rentalNFT();

  if (rentalNFTInProp !== rentalNFTAddress) {
    throw new Error(`Validation Failed: PropertyNFT's rentalNFT (${rentalNFTInProp}) does not match RentalNFT (${rentalNFTAddress})`);
  }
  if (propNFTInRental !== propertyNFTAddress) {
    throw new Error(`Validation Failed: RentalNFT's propertyNFT (${propNFTInRental}) does not match PropertyNFT (${propertyNFTAddress})`);
  }
  if (propNFTInFactory !== propertyNFTAddress) {
    throw new Error(`Validation Failed: Factory's propertyNFT (${propNFTInFactory}) does not match PropertyNFT (${propertyNFTAddress})`);
  }
  if (usdcInFactory !== mockUSDCAddress) {
    throw new Error(`Validation Failed: Factory's usdcToken (${usdcInFactory}) does not match MockUSDC (${mockUSDCAddress})`);
  }
  if (rentalNFTInFactory !== rentalNFTAddress) {
    throw new Error(`Validation Failed: Factory's rentalNFT (${rentalNFTInFactory}) does not match RentalNFT (${rentalNFTAddress})`);
  }

  console.log("All on-chain configurations validated successfully!");

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
      rentalAgreementFactory: factoryAddress
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
      `VITE_USDC_ADDRESS=${mockUSDCAddress}`
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
      `  rentalAgreementFactory: "${factoryAddress}"`,
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
