// Deploys TimeBank with the deployer as steward and prints the address.
// Usage: DEPLOYER_PRIVATE_KEY=0x... npx hardhat run scripts/deploy.js --network monadTestnet
const { ethers, network } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying TimeBank to ${network.name} from ${deployer.address}`);
  const bank = await (await ethers.getContractFactory("TimeBank")).deploy(deployer.address);
  await bank.waitForDeployment();
  console.log(`TimeBank deployed at ${await bank.getAddress()}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
