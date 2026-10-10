// Live check on a deployed TimeBank: registers two simulated passkeys, seals an hour,
// and checks door verification. Proves the P256 precompile path works on the target chain.
// Usage: TIMEBANK_ADDRESS=0x... npx hardhat run scripts/smoke.js --network monadTestnet
const { ethers } = require("hardhat");
const { Passkey } = require("../test/passkey");

async function main() {
  const bank = await ethers.getContractAt("TimeBank", process.env.TIMEBANK_ADDRESS);
  const alice = new Passkey();
  const bob = new Passkey();
  for (const pk of [alice, bob]) await (await bank.register(pk.x, pk.y)).wait();
  const aliceId = await bank.memberId(alice.x, alice.y);
  const bobId = await bank.memberId(bob.x, bob.y);

  const challenge = ethers.hexlify(ethers.randomBytes(32));
  const [ok] = await bank.verifyPresence(bobId, challenge, bob.sign(challenge));
  const [impostor] = await bank.verifyPresence(bobId, challenge, new Passkey().sign(challenge));
  console.log(`door check: real=${ok} impostor=${impostor}`);

  const digest = await bank.sealDigest(aliceId, bobId, 60, 2, false);
  const t0 = Date.now();
  const tx = await bank.seal(aliceId, bobId, 60, 2, false, alice.sign(digest), bob.sign(digest));
  const receipt = await tx.wait();
  console.log(`seal tx ${receipt.hash} gas=${receipt.gasUsed} confirmed in ${Date.now() - t0} ms`);
  console.log(`alice balance: ${(await bank.members(aliceId)).balance} minutes`);
  if (!ok || impostor) throw new Error("P256 verification did not behave as expected");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
