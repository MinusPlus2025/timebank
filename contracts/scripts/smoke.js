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

  const q = {
    helper: aliceId,
    receiver: bobId,
    minutes_: 60,
    category: 2,
    redeem: false,
    visitId: ethers.ZeroHash,
    deadline: Math.floor(Date.now() / 1000) + 600,
  };
  const digest = await bank.sealDigest(q);
  const t0 = Date.now();
  const tx = await bank.seal(q, alice.sign(digest), bob.sign(digest));
  const receipt = await tx.wait();
  console.log(`seal tx ${receipt.hash} gas=${receipt.gasUsed} confirmed in ${Date.now() - t0} ms`);
  console.log(`alice balance: ${(await bank.members(aliceId)).balance} minutes`);
  if (!ok || impostor) throw new Error("P256 verification did not behave as expected");

  // Face-to-face seal with a heartbeat code drawn at the latest block.
  const live = ethers.Wallet.createRandom();
  const q2 = { ...q, minutes_: 30, deadline: Math.floor(Date.now() / 1000) + 600 };
  const d2 = await bank.inPersonDigest(q2, live.address);
  const helperSig = alice.sign(d2);
  const receiverSig = bob.sign(d2);
  const codeBlock = BigInt(await ethers.provider.getBlockNumber());
  const beat = await live.signMessage(ethers.getBytes(await bank.liveCodeHash(d2, codeBlock)));
  const t1 = Date.now();
  // Explicit gas: Monad charges the declared limit, and estimating at "latest" adds a round trip.
  const r2 = await (await bank.sealInPerson(q2, live.address, codeBlock, beat, helperSig, receiverSig, { gasLimit: 450000 })).wait();
  console.log(
    `sealInPerson tx ${r2.hash} gas=${r2.gasUsed} confirmed in ${Date.now() - t1} ms, code was ${BigInt(r2.blockNumber) - codeBlock} blocks old`
  );

  // A photo of the code forwarded later: wait past LIVE_WINDOW and expect CodeExpired.
  const window = await bank.LIVE_WINDOW();
  const q3 = { ...q2, minutes_: 15 };
  const d3 = await bank.inPersonDigest(q3, live.address);
  const old = BigInt(await ethers.provider.getBlockNumber());
  const oldBeat = await live.signMessage(ethers.getBytes(await bank.liveCodeHash(d3, old)));
  while (BigInt(await ethers.provider.getBlockNumber()) <= old + window) await new Promise((r) => setTimeout(r, 1000));
  try {
    await bank.sealInPerson.staticCall(q3, live.address, old, oldBeat, alice.sign(d3), bob.sign(d3));
    throw new Error("stale heartbeat code was accepted");
  } catch (e) {
    // Hardhat's provider leaves the raw revert data on e.data instead of decoding it.
    const raw = typeof e.data === "string" ? e.data : e.data?.data;
    const decoded = raw ? bank.interface.parseError(raw)?.name : undefined;
    if (!/CodeExpired/.test(String(e.message) + JSON.stringify(e.revert ?? "") + (decoded ?? ""))) throw e;
    console.log(`stale code (${window}+ blocks old) rejected: CodeExpired`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
