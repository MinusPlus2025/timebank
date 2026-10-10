// Copies the compiled TimeBank ABI into the web app. Run after `npx hardhat compile`.
const fs = require("fs");
const path = require("path");

const artifact = require("../artifacts/contracts/TimeBank.sol/TimeBank.json");
const out = path.join(__dirname, "../../web/src/abi.ts");
fs.writeFileSync(
  out,
  "// Generated from contracts/artifacts by scripts/export-abi.js. Do not edit.\n" +
    `export const timeBankAbi = ${JSON.stringify(artifact.abi, null, 2)} as const;\n`
);
console.log(`Wrote ${out}`);
