import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contracts = [
  { name: "PropertyNFT", path: "PropertyNFT.sol/PropertyNFT.json" },
  { name: "RentalNFT", path: "RentalNFT.sol/RentalNFT.json" },
  { name: "RentalAgreement", path: "RentalAgreement.sol/RentalAgreement.json" },
  { name: "RentalAgreementFactory", path: "RentalAgreementFactory.sol/RentalAgreementFactory.json" },
  { name: "MockUSDC", path: "mocks/MockUSDC.sol/MockUSDC.json" },
];

const artifactsDir = path.resolve(__dirname, "../../contracts/artifacts/contracts");
const outputDir = path.resolve(__dirname, "../app/lib/blockchain/abi");

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log("Starting ABI extraction...");

contracts.forEach((c) => {
  const artifactPath = path.join(artifactsDir, c.path);
  if (!fs.existsSync(artifactPath)) {
    console.error(`Error: Artifact not found for ${c.name} at: ${artifactPath}`);
    return;
  }

  try {
    const fileContent = fs.readFileSync(artifactPath, "utf8");
    const artifact = JSON.parse(fileContent);

    if (!artifact.abi) {
      console.error(`Error: No ABI property found in ${c.name} artifact`);
      return;
    }

    const outputABI = {
      abi: artifact.abi,
    };

    const outputPath = path.join(outputDir, `${c.name}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(outputABI, null, 2), "utf8");
    console.log(`✓ Synchronized ABI for ${c.name} -> ${outputPath}`);
  } catch (err) {
    console.error(`Failed to process ${c.name}:`, err);
  }
});

console.log("ABI extraction complete.");
