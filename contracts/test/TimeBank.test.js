const { expect } = require("chai");
const { ethers } = require("hardhat");
const { Passkey } = require("./passkey");

const CARE = 1;
const REPAIR = 2;
const FAR = 4102444800n; // year 2100: a deadline that never bites unless a test wants it to

const req = (helper, receiver, minutes_, category, redeem, extra = {}) => ({
  helper,
  receiver,
  minutes_,
  category,
  redeem,
  visitId: ethers.ZeroHash,
  deadline: FAR,
  ...extra,
});

describe("TimeBank", () => {
  let bank, steward, other;
  let alice, bob, mom;
  let aliceId, bobId, momId;

  async function register(pk) {
    await bank.register(pk.x, pk.y);
    return bank.memberId(pk.x, pk.y);
  }

  async function sealHelp(helperPk, helperId, receiverPk, receiverId, minutes, category, redeem, extra) {
    const q = req(helperId, receiverId, minutes, category, redeem, extra);
    const digest = await bank.sealDigest(q);
    return bank.seal(q, helperPk.sign(digest), receiverPk.sign(digest));
  }

  beforeEach(async () => {
    [steward, other] = await ethers.getSigners();
    bank = await (await ethers.getContractFactory("TimeBank")).deploy(steward.address);
    alice = new Passkey();
    bob = new Passkey();
    mom = new Passkey();
    aliceId = await register(alice);
    bobId = await register(bob);
    momId = await register(mom);
  });

  describe("register", () => {
    it("rejects a duplicate key", async () => {
      await expect(bank.register(alice.x, alice.y)).to.be.revertedWithCustomError(bank, "AlreadyRegistered");
    });
  });

  describe("seal", () => {
    it("credits the helper when both passkeys sign", async () => {
      await expect(sealHelp(alice, aliceId, bob, bobId, 60, REPAIR, false)).to.emit(bank, "Sealed");
      expect((await bank.members(aliceId)).balance).to.equal(60);
      expect(await bank.sealCount()).to.equal(1);
      expect(await bank.sealsOf(aliceId)).to.deep.equal([0n]);
      expect(await bank.sealsOf(bobId)).to.deep.equal([0n]);
    });

    it("rejects a seal signed by only one side", async () => {
      const digest = await bank.sealDigest(req(aliceId, bobId, 60, REPAIR, false));
      const stranger = new Passkey();
      await expect(
        bank.seal(req(aliceId, bobId, 60, REPAIR, false), alice.sign(digest), stranger.sign(digest))
      ).to.be.revertedWithCustomError(bank, "BadSignature").withArgs(bobId);
    });

    it("rejects an assertion without user verification", async () => {
      const lazy = new Passkey({ userVerified: false });
      const lazyId = await register(lazy);
      await expect(sealHelp(alice, aliceId, lazy, lazyId, 60, CARE, false))
        .to.be.revertedWithCustomError(bank, "BadSignature")
        .withArgs(lazyId);
    });

    it("rejects replaying the same signatures", async () => {
      const digest = await bank.sealDigest(req(aliceId, bobId, 60, REPAIR, false));
      const a = alice.sign(digest);
      const b = bob.sign(digest);
      await bank.seal(req(aliceId, bobId, 60, REPAIR, false), a, b);
      await expect(bank.seal(req(aliceId, bobId, 60, REPAIR, false), a, b)).to.be.revertedWithCustomError(
        bank,
        "BadSignature"
      );
    });

    it("rejects signatures over different minutes", async () => {
      const digest = await bank.sealDigest(req(aliceId, bobId, 60, REPAIR, false));
      await expect(
        bank.seal(req(aliceId, bobId, 480, REPAIR, false), alice.sign(digest), bob.sign(digest))
      ).to.be.revertedWithCustomError(bank, "BadSignature");
    });

    it("enforces minute bounds and distinct members", async () => {
      await expect(sealHelp(alice, aliceId, bob, bobId, 0, CARE, false)).to.be.revertedWithCustomError(
        bank,
        "InvalidMinutes"
      );
      await expect(sealHelp(alice, aliceId, bob, bobId, 481, CARE, false)).to.be.revertedWithCustomError(
        bank,
        "InvalidMinutes"
      );
      await expect(sealHelp(alice, aliceId, alice, aliceId, 60, CARE, false)).to.be.revertedWithCustomError(
        bank,
        "SameMember"
      );
    });

    it("debits the receiver when they redeem their own hours", async () => {
      await sealHelp(alice, aliceId, bob, bobId, 120, REPAIR, false);
      await sealHelp(bob, bobId, alice, aliceId, 90, CARE, true);
      expect((await bank.members(aliceId)).balance).to.equal(30);
      expect((await bank.members(bobId)).balance).to.equal(90);
    });

    it("rejects redeeming more hours than the receiver has", async () => {
      await expect(sealHelp(alice, aliceId, bob, bobId, 60, CARE, true))
        .to.be.revertedWithCustomError(bank, "InsufficientHours")
        .withArgs(bobId);
    });
  });

  describe("gift", () => {
    it("lets a daughter give hours to her mother, who redeems them locally", async () => {
      await sealHelp(alice, aliceId, bob, bobId, 120, CARE, false);
      const digest = await bank.giftDigest(aliceId, momId, 60);
      await expect(bank.gift(aliceId, momId, 60, alice.sign(digest)))
        .to.emit(bank, "Gifted")
        .withArgs(aliceId, momId, 60);

      // A local volunteer (bob) accompanies mom to the hospital; mom pays with the gifted hours.
      await sealHelp(bob, bobId, mom, momId, 60, CARE, true);
      expect((await bank.members(momId)).balance).to.equal(0);
      expect((await bank.members(bobId)).balance).to.equal(60);
    });

    it("rejects a gift not signed by the giver", async () => {
      await sealHelp(alice, aliceId, bob, bobId, 120, CARE, false);
      const digest = await bank.giftDigest(aliceId, momId, 60);
      await expect(bank.gift(aliceId, momId, 60, mom.sign(digest))).to.be.revertedWithCustomError(
        bank,
        "BadSignature"
      );
    });

    it("rejects gifting more than the balance", async () => {
      const digest = await bank.giftDigest(aliceId, momId, 60);
      await expect(bank.gift(aliceId, momId, 60, alice.sign(digest))).to.be.revertedWithCustomError(
        bank,
        "InsufficientHours"
      );
    });
  });

  describe("pool", () => {
    it("accepts donations and lets the steward grant from them", async () => {
      await sealHelp(alice, aliceId, bob, bobId, 120, CARE, false);
      const digest = await bank.donateDigest(aliceId, 30);
      await expect(bank.donate(aliceId, 30, alice.sign(digest))).to.emit(bank, "Donated").withArgs(30);
      expect(await bank.poolBalance()).to.equal(30);

      await bank.grantFromPool(momId, 30);
      expect((await bank.members(momId)).balance).to.equal(30);
      expect(await bank.poolBalance()).to.equal(0);
    });

    it("only lets the steward grant and certify", async () => {
      await expect(bank.connect(other).grantFromPool(momId, 1)).to.be.revertedWithCustomError(bank, "NotSteward");
      await expect(bank.connect(other).certify(bobId, ethers.encodeBytes32String("Sunrise"))).to.be.revertedWithCustomError(
        bank,
        "NotSteward"
      );
    });
  });

  describe("verifyPresence", () => {
    it("confirms a certified volunteer at the door", async () => {
      const community = ethers.encodeBytes32String("Sunrise Community");
      await bank.certify(bobId, community);
      const challenge = ethers.hexlify(ethers.randomBytes(32));
      const [ok, got] = await bank.verifyPresence(bobId, challenge, bob.sign(challenge));
      expect(ok).to.equal(true);
      expect(got).to.equal(community);
    });

    it("rejects an impostor", async () => {
      const challenge = ethers.hexlify(ethers.randomBytes(32));
      const impostor = new Passkey();
      const [ok, got] = await bank.verifyPresence(bobId, challenge, impostor.sign(challenge));
      expect(ok).to.equal(false);
      expect(got).to.equal(ethers.ZeroHash);
    });

    it("publishes a check-in the host can watch for", async () => {
      const community = ethers.encodeBytes32String("Sunrise Community");
      await bank.certify(bobId, community);
      const challenge = ethers.hexlify(ethers.randomBytes(32));
      await expect(bank.checkIn(bobId, challenge, bob.sign(challenge)))
        .to.emit(bank, "PresenceVerified")
        .withArgs(challenge, bobId, community);
    });

    it("rejects an impostor check-in", async () => {
      const challenge = ethers.hexlify(ethers.randomBytes(32));
      await expect(bank.checkIn(bobId, challenge, new Passkey().sign(challenge)))
        .to.be.revertedWithCustomError(bank, "BadSignature")
        .withArgs(bobId);
    });

    it("rejects a signature over a different challenge", async () => {
      const challenge = ethers.hexlify(ethers.randomBytes(32));
      const stale = ethers.hexlify(ethers.randomBytes(32));
      const [ok] = await bank.verifyPresence(bobId, challenge, bob.sign(stale));
      expect(ok).to.equal(false);
    });
  });

  describe("guardian", () => {
    async function dependentOf(guardianPk, guardianId) {
      const digest = await bank.dependentDigest(guardianId);
      await bank.registerDependent(guardianId, guardianPk.sign(digest));
      return digest;
    }

    async function sealForDependent(helperPk, helperId, depId, guardianPk, minutes, redeem) {
      const digest = await bank.sealDigest(req(helperId, depId, minutes, CARE, redeem));
      return bank.sealByGuardian(req(helperId, depId, minutes, CARE, redeem), helperPk.sign(digest), guardianPk.sign(digest));
    }

    it("lets a daughter open an account for a parent without a phone and confirm help for them", async () => {
      const dadId = await dependentOf(alice, aliceId);
      expect(await bank.guardianOf(dadId)).to.equal(aliceId);

      await sealHelp(alice, aliceId, bob, bobId, 120, CARE, false);
      await bank.gift(aliceId, dadId, 60, alice.sign(await bank.giftDigest(aliceId, dadId, 60)));

      // A volunteer visits dad; alice confirms remotely and dad's gifted hour pays for it.
      await expect(sealForDependent(bob, bobId, dadId, alice, 60, true)).to.emit(bank, "ConfirmedByGuardian");
      expect((await bank.members(dadId)).balance).to.equal(0);
      expect((await bank.members(bobId)).balance).to.equal(60);
    });

    it("rejects confirmation by anyone but the guardian", async () => {
      const dadId = await dependentOf(alice, aliceId);
      await expect(sealForDependent(bob, bobId, dadId, mom, 60, false))
        .to.be.revertedWithCustomError(bank, "BadSignature")
        .withArgs(aliceId);
    });

    it("does not let the guardian be their own witness", async () => {
      const dadId = await dependentOf(alice, aliceId);
      await expect(sealForDependent(alice, aliceId, dadId, alice, 60, false)).to.be.revertedWithCustomError(
        bank,
        "SameMember"
      );
    });

    it("rejects guardian sealing for members without a guardian", async () => {
      await expect(sealForDependent(alice, aliceId, momId, bob, 60, false))
        .to.be.revertedWithCustomError(bank, "NoGuardian")
        .withArgs(momId);
    });

    it("lets a member choose a guardian with their own passkey", async () => {
      const digest = await bank.guardianDigest(momId, aliceId);
      await expect(bank.setGuardian(momId, aliceId, mom.sign(digest))).to.emit(bank, "GuardianSet").withArgs(momId, aliceId);
      await expect(bank.setGuardian(momId, bobId, alice.sign(await bank.guardianDigest(momId, bobId))))
        .to.be.revertedWithCustomError(bank, "BadSignature");
      await expect(bank.connect(other).appointGuardian(momId, bobId)).to.be.revertedWithCustomError(bank, "NotSteward");
    });
  });

  describe("visits", () => {
    const tagFor = (secret, nonce) => ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["bytes32", "bytes32"], [secret, nonce]));

    async function arrive(pk, id, secret) {
      const nonce = ethers.hexlify(ethers.randomBytes(32));
      const challenge = ethers.hexlify(ethers.randomBytes(32));
      const tag = tagFor(secret, nonce);
      const digest = await bank.arriveDigest(tag, nonce, ethers.ZeroHash, challenge);
      const tx = await bank.arrive(id, tag, nonce, ethers.ZeroHash, challenge, pk.sign(digest));
      const visitId = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["bytes32", "bytes32"], [id, challenge]));
      return { tx, visitId, tag, nonce };
    }

    it("records an arrival under a blinded tag that only the card secret can recognise", async () => {
      const community = ethers.encodeBytes32String("Sunrise Community");
      await bank.certify(bobId, community);
      const secret = ethers.hexlify(ethers.randomBytes(32));
      const { tx, visitId, tag, nonce } = await arrive(bob, bobId, secret);
      await expect(tx).to.emit(bank, "Arrived").withArgs(visitId, bobId, tag, nonce, ethers.ZeroHash, community);
      expect(tagFor(secret, nonce)).to.equal(tag);
      expect(tagFor(ethers.hexlify(ethers.randomBytes(32)), nonce)).to.not.equal(tag);
      expect(await bank.openVisitOf(bobId)).to.equal(visitId);
      const stored = await bank.visits(visitId);
      expect(stored.tag).to.equal(tag);
      expect(stored.nonce).to.equal(nonce);
    });

    it("rejects an arrival signed by someone else", async () => {
      const challenge = ethers.hexlify(ethers.randomBytes(32));
      const digest = await bank.arriveDigest(ethers.ZeroHash, ethers.ZeroHash, ethers.ZeroHash, challenge);
      await expect(bank.arrive(bobId, ethers.ZeroHash, ethers.ZeroHash, ethers.ZeroHash, challenge, alice.sign(digest)))
        .to.be.revertedWithCustomError(bank, "BadSignature")
        .withArgs(bobId);
    });

    it("keeps one open visit per helper: arriving elsewhere closes the previous one", async () => {
      const first = await arrive(bob, bobId, ethers.ZeroHash);
      const second = await arrive(bob, bobId, ethers.ZeroHash);
      await expect(second.tx).to.emit(bank, "VisitClosed").withArgs(first.visitId, await bank.NO_SEAL(), 0, 0);
      expect(await bank.openVisitOf(bobId)).to.equal(second.visitId);
      // The superseded visit can no longer back a seal.
      await expect(sealHelp(bob, bobId, alice, aliceId, 60, CARE, false, { visitId: first.visitId }))
        .to.be.revertedWithCustomError(bank, "BadVisit")
        .withArgs(first.visitId);
    });

    it("links a seal to the arrival and reports the minutes actually present", async () => {
      const { visitId } = await arrive(bob, bobId, ethers.ZeroHash);
      await ethers.provider.send("evm_increaseTime", [45 * 60]);
      const tx = sealHelp(bob, bobId, alice, aliceId, 60, CARE, false, { visitId });
      // Claimed 60, present ~45: recorded for audit rather than rejected.
      await expect(tx).to.emit(bank, "VisitClosed").withArgs(visitId, 0, 60, 45);
      expect(await bank.visitOfSeal(0)).to.equal(visitId);
      expect(await bank.openVisitOf(bobId)).to.equal(ethers.ZeroHash);
      await expect(sealHelp(bob, bobId, alice, aliceId, 30, CARE, false, { visitId }))
        .to.be.revertedWithCustomError(bank, "BadVisit");
    });

    it("does not let one helper use another helper's arrival", async () => {
      const { visitId } = await arrive(bob, bobId, ethers.ZeroHash);
      await expect(sealHelp(alice, aliceId, mom, momId, 60, CARE, false, { visitId }))
        .to.be.revertedWithCustomError(bank, "BadVisit")
        .withArgs(visitId);
    });

    it("rejects a confirmation used after its deadline", async () => {
      const now = BigInt((await ethers.provider.getBlock("latest")).timestamp);
      await expect(sealHelp(alice, aliceId, bob, bobId, 60, CARE, false, { deadline: now + 60n })).to.emit(bank, "Sealed");
      await ethers.provider.send("evm_increaseTime", [120]);
      await expect(sealHelp(alice, aliceId, bob, bobId, 60, CARE, false, { deadline: now + 60n })).to.be.revertedWithCustomError(
        bank,
        "Expired"
      );
    });
  });

  describe("sealInPerson (heartbeat code)", () => {
    // The receiver's phone makes a throwaway key, signs the seal once with Face ID, then
    // draws a fresh code every block by signing (digest, blockNumber) with the throwaway key.
    async function heartbeat(q, { live = ethers.Wallet.createRandom(), ageBlocks = 0 } = {}) {
      const digest = await bank.inPersonDigest(q, live.address);
      const receiverSig = bob.sign(digest);
      const codeBlock = BigInt(await ethers.provider.getBlockNumber());
      const liveSig = await live.signMessage(ethers.getBytes(await bank.liveCodeHash(digest, codeBlock)));
      if (ageBlocks) await ethers.provider.send("hardhat_mine", ["0x" + ageBlocks.toString(16)]);
      return { digest, receiverSig, codeBlock, liveSig, live };
    }

    it("seals when the helper scans a fresh code and records it as face to face", async () => {
      const q = req(aliceId, bobId, 60, CARE, false);
      const c = await heartbeat(q);
      const tx = bank.sealInPerson(q, c.live.address, c.codeBlock, c.liveSig, alice.sign(c.digest), c.receiverSig);
      await expect(tx).to.emit(bank, "Sealed");
      await expect(tx).to.emit(bank, "SealedInPerson").withArgs(0, c.codeBlock, c.codeBlock + 1n);
      expect(await bank.liveCodeBlock(0)).to.equal(c.codeBlock);
      expect(await bank.inPersonMinutes(aliceId)).to.equal(60);
      expect((await bank.members(aliceId)).balance).to.equal(60);
    });

    it("accepts a code up to LIVE_WINDOW blocks old", async () => {
      const q = req(aliceId, bobId, 30, CARE, false);
      const window = Number(await bank.LIVE_WINDOW());
      const c = await heartbeat(q, { ageBlocks: window - 1 });
      await expect(bank.sealInPerson(q, c.live.address, c.codeBlock, c.liveSig, alice.sign(c.digest), c.receiverSig)).to.emit(
        bank,
        "SealedInPerson"
      );
    });

    it("rejects a forwarded photo of the code once it is older than LIVE_WINDOW", async () => {
      const q = req(aliceId, bobId, 60, CARE, false);
      const window = Number(await bank.LIVE_WINDOW());
      const c = await heartbeat(q, { ageBlocks: window });
      await expect(
        bank.sealInPerson(q, c.live.address, c.codeBlock, c.liveSig, alice.sign(c.digest), c.receiverSig)
      ).to.be.revertedWithCustomError(bank, "CodeExpired");
    });

    it("rejects a code dated in the future to stretch its life", async () => {
      const q = req(aliceId, bobId, 60, CARE, false);
      const live = ethers.Wallet.createRandom();
      const digest = await bank.inPersonDigest(q, live.address);
      const future = BigInt(await ethers.provider.getBlockNumber()) + 100n;
      const liveSig = await live.signMessage(ethers.getBytes(await bank.liveCodeHash(digest, future)));
      await expect(
        bank.sealInPerson(q, live.address, future, liveSig, alice.sign(digest), bob.sign(digest))
      ).to.be.revertedWithCustomError(bank, "CodeFromFuture");
    });

    it("rejects a code not drawn by the receiver's screen", async () => {
      const q = req(aliceId, bobId, 60, CARE, false);
      const c = await heartbeat(q);
      const forger = ethers.Wallet.createRandom();
      const forged = await forger.signMessage(ethers.getBytes(await bank.liveCodeHash(c.digest, c.codeBlock)));
      await expect(
        bank.sealInPerson(q, c.live.address, c.codeBlock, forged, alice.sign(c.digest), c.receiverSig)
      ).to.be.revertedWithCustomError(bank, "BadLiveCode");
    });

    it("rejects a code re-dated to a newer block without the screen's key", async () => {
      const q = req(aliceId, bobId, 60, CARE, false);
      const c = await heartbeat(q, { ageBlocks: 40 });
      const now = BigInt(await ethers.provider.getBlockNumber());
      await expect(
        bank.sealInPerson(q, c.live.address, now, c.liveSig, alice.sign(c.digest), c.receiverSig)
      ).to.be.revertedWithCustomError(bank, "BadLiveCode");
    });

    it("binds the receiver's Face ID to this one screen key", async () => {
      const q = req(aliceId, bobId, 60, CARE, false);
      const c = await heartbeat(q);
      const other = ethers.Wallet.createRandom();
      const liveSig = await other.signMessage(ethers.getBytes(await bank.liveCodeHash(c.digest, c.codeBlock)));
      await expect(
        bank.sealInPerson(q, other.address, c.codeBlock, liveSig, alice.sign(c.digest), c.receiverSig)
      ).to.be.revertedWithCustomError(bank, "BadSignature").withArgs(bobId);
    });

    it("does not accept an ordinary seal signature on the face-to-face path", async () => {
      const q = req(aliceId, bobId, 60, CARE, false);
      const plain = await bank.sealDigest(q);
      const c = await heartbeat(q);
      await expect(
        bank.sealInPerson(q, c.live.address, c.codeBlock, c.liveSig, alice.sign(plain), bob.sign(plain))
      ).to.be.revertedWithCustomError(bank, "BadSignature").withArgs(bobId);
    });

    it("cannot be replayed", async () => {
      const q = req(aliceId, bobId, 60, CARE, false);
      const c = await heartbeat(q);
      const h = alice.sign(c.digest);
      await bank.sealInPerson(q, c.live.address, c.codeBlock, c.liveSig, h, c.receiverSig);
      await expect(
        bank.sealInPerson(q, c.live.address, c.codeBlock, c.liveSig, h, c.receiverSig)
      ).to.be.revertedWithCustomError(bank, "BadSignature");
    });

    it("leaves ordinary seals unmarked", async () => {
      await sealHelp(alice, aliceId, bob, bobId, 60, CARE, false);
      expect(await bank.liveCodeBlock(0)).to.equal(0);
      expect(await bank.inPersonMinutes(aliceId)).to.equal(0);
    });
  });
});
