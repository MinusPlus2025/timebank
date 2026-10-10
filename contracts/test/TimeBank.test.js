const { expect } = require("chai");
const { ethers } = require("hardhat");
const { Passkey } = require("./passkey");

const CARE = 1;
const REPAIR = 2;

describe("TimeBank", () => {
  let bank, steward, other;
  let alice, bob, mom;
  let aliceId, bobId, momId;

  async function register(pk) {
    await bank.register(pk.x, pk.y);
    return bank.memberId(pk.x, pk.y);
  }

  async function sealHelp(helperPk, helperId, receiverPk, receiverId, minutes, category, redeem) {
    const digest = await bank.sealDigest(helperId, receiverId, minutes, category, redeem);
    return bank.seal(helperId, receiverId, minutes, category, redeem, helperPk.sign(digest), receiverPk.sign(digest));
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
      const digest = await bank.sealDigest(aliceId, bobId, 60, REPAIR, false);
      const stranger = new Passkey();
      await expect(
        bank.seal(aliceId, bobId, 60, REPAIR, false, alice.sign(digest), stranger.sign(digest))
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
      const digest = await bank.sealDigest(aliceId, bobId, 60, REPAIR, false);
      const a = alice.sign(digest);
      const b = bob.sign(digest);
      await bank.seal(aliceId, bobId, 60, REPAIR, false, a, b);
      await expect(bank.seal(aliceId, bobId, 60, REPAIR, false, a, b)).to.be.revertedWithCustomError(
        bank,
        "BadSignature"
      );
    });

    it("rejects signatures over different minutes", async () => {
      const digest = await bank.sealDigest(aliceId, bobId, 60, REPAIR, false);
      await expect(
        bank.seal(aliceId, bobId, 480, REPAIR, false, alice.sign(digest), bob.sign(digest))
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

    it("rejects a signature over a different challenge", async () => {
      const challenge = ethers.hexlify(ethers.randomBytes(32));
      const stale = ethers.hexlify(ethers.randomBytes(32));
      const [ok] = await bank.verifyPresence(bobId, challenge, bob.sign(stale));
      expect(ok).to.equal(false);
    });
  });
});
