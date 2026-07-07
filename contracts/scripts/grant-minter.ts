import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import hre from "hardhat";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function latestDeploymentReport(): { contracts: { propertyNFT: string } } {
  const deploymentsDir = path.join(__dirname, "../deployments");
  const files = fs
    .readdirSync(deploymentsDir)
    .filter((file) => file.startsWith("deploy-v") && file.endsWith(".json"))
    .sort();

  if (files.length === 0) {
    throw new Error("No deployment report found. Run scripts/deploy.ts first.");
  }

  const reportPath = path.join(deploymentsDir, files[files.length - 1]);
  return JSON.parse(fs.readFileSync(reportPath, "utf8"));
}

async function main() {
  const rawTargetAddress = (process.env.GRANT_MINTER_TO ?? process.argv[2] ?? "").trim();
  if (!rawTargetAddress) {
    throw new Error(
      "Set GRANT_MINTER_TO or pass a wallet address when running scripts/grant-minter.ts.",
    );
  }

  const networkName = hre.network.name;
  const connection = await (hre.network as any).getOrCreate(networkName);
  const { ethers } = connection;

  const targetAddress = ethers.getAddress(rawTargetAddress);

  const { contracts } = latestDeploymentReport();
  const propertyNFT = await ethers.getContractAt("PropertyNFT", contracts.propertyNFT);
  const minterRole = await propertyNFT.MINTER_ROLE();

  const alreadyGranted = await propertyNFT.hasRole(minterRole, targetAddress);
  if (alreadyGranted) {
    console.log(`${targetAddress} already has MINTER_ROLE on PropertyNFT.`);
    return;
  }

  const grantTx = await propertyNFT.grantRole(minterRole, targetAddress);
  await grantTx.wait();
  console.log(`Granted MINTER_ROLE to ${targetAddress} on ${contracts.propertyNFT}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
