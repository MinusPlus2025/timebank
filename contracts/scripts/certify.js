// Steward-only: vouch for a member as a community volunteer (shown at door checks).
// Usage: MEMBER_ID=0x... COMMUNITY="Sunrise Community" npx hardhat run scripts/certify.js --network monadTestnet
const { ethers } = require("hardhat");

async function main() {
  const { MEMBER_ID, COMMUNITY, TIMEBANK_ADDRESS } = process.env;
  if (!MEMBER_ID || !COMMUNITY) throw new Error("Set MEMBER_ID and COMMUNITY");
  const address = TIMEBANK_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const bank = await ethers.getContractAt("TimeBank", address);
  const name = ethers.toUtf8Bytes(COMMUNITY);
  if (name.length > 32) throw new Error("Community name must fit in 32 bytes");
  await (await bank.certify(MEMBER_ID, ethers.zeroPadBytes(name, 32))).wait();
  console.log(`Certified ${MEMBER_ID} for ${COMMUNITY}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
