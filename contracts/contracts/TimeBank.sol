// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {WebAuthnP256} from "./WebAuthnP256.sol";

/// @title TimeBank
/// @notice A time bank where every hour of help is sealed by two people's passkeys.
/// Members are identified by their passkey public key, not by a wallet. Any relayer
/// may submit transactions; authority comes only from the passkey signatures.
/// Hours can be earned, gifted (e.g. to parents far away) or donated, never sold.
contract TimeBank {
    using WebAuthnP256 for bytes32;

    struct Member {
        bytes32 x;
        bytes32 y;
        uint64 balance; // minutes
        uint64 nonce;
        bool exists;
    }

    struct Seal {
        bytes32 helper;
        bytes32 receiver;
        uint32 minutes_;
        uint8 category;
        bool redeemed; // true: the receiver paid with their own hours
        uint64 timestamp;
        bytes32 seed; // drives the generated seal artwork
    }

    /// @notice What both people sign for one seal.
    /// visitId links the seal to the helper's door arrival (0 if none); deadline limits how long
    /// a signature stays usable, so a confirmation cannot be collected now and replayed much later.
    struct SealRequest {
        bytes32 helper;
        bytes32 receiver;
        uint32 minutes_;
        uint8 category;
        bool redeem;
        bytes32 visitId;
        uint64 deadline;
    }

    /// @notice A helper's arrival at a door. Who lives there is not on-chain: `tag` is
    /// keccak256(secret, nonce) using a secret only the household's family card holds.
    struct Visit {
        bytes32 visitor;
        uint64 start;
        bool closed;
        // Kept so a guardian can check, with their card secret, that the arrival was at their door.
        bytes32 tag;
        bytes32 nonce;
    }

    uint32 public constant MAX_MINUTES_PER_SEAL = 8 hours / 1 minutes;
    uint256 public constant NO_SEAL = type(uint256).max;
    /// @notice How many blocks a heartbeat code stays valid. At Monad's sub-second blocks this is
    /// a few seconds: enough for the helper to scan and confirm, too short for a photo to be
    /// forwarded over chat and used somewhere else.
    uint256 public constant LIVE_WINDOW = 30;

    address public immutable steward;

    mapping(bytes32 => Member) public members;
    mapping(bytes32 => bytes32) public certifiedCommunity;
    mapping(bytes32 => uint256[]) private _sealsOf;
    /// @notice A family member who may confirm help on behalf of someone who cannot use a phone.
    mapping(bytes32 => bytes32) public guardianOf;
    mapping(bytes32 => Visit) public visits;
    /// @notice The one visit a helper has open; arriving somewhere else closes it.
    mapping(bytes32 => bytes32) public openVisitOf;
    mapping(uint256 => bytes32) public visitOfSeal;
    /// @notice For seals made face to face: the block the receiver's heartbeat code was drawn at (0 otherwise).
    mapping(uint256 => uint256) public liveCodeBlock;
    /// @notice Minutes each member has helped with that were proven face to face by a heartbeat code.
    mapping(bytes32 => uint64) public inPersonMinutes;
    Seal[] public seals;
    uint64 public poolBalance;

    event Registered(bytes32 indexed id);
    event Sealed(
        uint256 indexed sealId,
        bytes32 indexed helper,
        bytes32 indexed receiver,
        uint32 minutes_,
        uint8 category,
        bool redeemed,
        bytes32 seed
    );
    event Gifted(bytes32 indexed from, bytes32 indexed to, uint32 minutes_);
    // Donor intentionally not emitted: giving to the pool is meant to be quiet.
    event Donated(uint32 minutes_);
    event Granted(bytes32 indexed to, uint32 minutes_);
    event Certified(bytes32 indexed id, bytes32 community);
    event PresenceVerified(bytes32 indexed challenge, bytes32 indexed id, bytes32 community);
    event GuardianSet(bytes32 indexed member, bytes32 indexed guardian);
    // Emitted alongside Sealed when a guardian, not the receiver, confirmed the help.
    event ConfirmedByGuardian(uint256 indexed sealId, bytes32 indexed guardian);
    // A verified helper at a door. Only the family card's secret links `tag` to a household.
    event Arrived(bytes32 indexed visitId, bytes32 indexed visitor, bytes32 tag, bytes32 nonce, bytes32 locationHash, bytes32 community);
    // presentMinutes is measured from arrival; a claim above it is left for audit, not rejected.
    /// @notice The seal was confirmed from a live code on the receiver's screen, drawn at codeBlock.
    event SealedInPerson(uint256 indexed sealId, uint256 codeBlock, uint256 includedBlock);
    event VisitClosed(bytes32 indexed visitId, uint256 sealId, uint32 claimedMinutes, uint32 presentMinutes);

    error NotSteward();
    error AlreadyRegistered();
    error UnknownMember(bytes32 id);
    error InvalidMinutes();
    error SameMember();
    error BadSignature(bytes32 id);
    error InsufficientHours(bytes32 id);
    error NoGuardian(bytes32 id);
    error Expired();
    error BadVisit(bytes32 visitId);
    error CodeExpired();
    error CodeFromFuture();
    error BadLiveCode();

    constructor(address steward_) {
        steward = steward_;
    }

    function memberId(bytes32 x, bytes32 y) public pure returns (bytes32) {
        return keccak256(abi.encode(x, y));
    }

    /// @notice Register a passkey public key. No proof of possession is needed:
    /// registering someone else's key gives no power, since every action needs their signature.
    function register(bytes32 x, bytes32 y) external returns (bytes32 id) {
        id = memberId(x, y);
        if (members[id].exists) revert AlreadyRegistered();
        members[id] = Member({x: x, y: y, balance: 0, nonce: 0, exists: true});
        emit Registered(id);
    }

    function sealDigest(SealRequest calldata q) public view returns (bytes32) {
        return keccak256(
            abi.encode(
                "TimeBank.seal",
                block.chainid,
                address(this),
                q,
                members[q.helper].nonce,
                members[q.receiver].nonce
            )
        );
    }

    /// @notice Record an hour of help. Both people sign the same digest with their passkeys,
    /// so time cannot be invented by one side or by the operator.
    function seal(
        SealRequest calldata q,
        WebAuthnP256.Assertion calldata helperSig,
        WebAuthnP256.Assertion calldata receiverSig
    ) external returns (uint256 sealId) {
        Member storage r = _member(q.receiver);
        bytes32 digest = sealDigest(q);
        if (!digest.verify(receiverSig, r.x, r.y)) revert BadSignature(q.receiver);
        sealId = _seal(q, digest, helperSig, receiverSig.r);
    }

    /// @notice What both people sign for a face-to-face seal. Same as sealDigest, plus the
    /// throwaway key the receiver's phone uses to draw heartbeat codes, so only that screen can draw them.
    function inPersonDigest(SealRequest calldata q, address liveKey) public view returns (bytes32) {
        return keccak256(
            abi.encode(
                "TimeBank.sealInPerson",
                block.chainid,
                address(this),
                q,
                liveKey,
                members[q.helper].nonce,
                members[q.receiver].nonce
            )
        );
    }

    /// @notice What the receiver's live key signs (EIP-191) for the heartbeat code shown at codeBlock.
    function liveCodeHash(bytes32 digest, uint256 codeBlock) public pure returns (bytes32) {
        return keccak256(abi.encode("TimeBank.heartbeat", digest, codeBlock));
    }

    /// @notice Record an hour of help that both people confirmed standing together. The receiver's
    /// screen shows a code that changes every block; the helper must scan one that is at most
    /// LIVE_WINDOW blocks old. A photo of the code forwarded over chat goes stale in seconds.
    /// This stops remote confirmation by a forwarded picture; it does not stop a live video call
    /// or two people who agree to cheat.
    function sealInPerson(
        SealRequest calldata q,
        address liveKey,
        uint256 codeBlock,
        bytes calldata liveSig,
        WebAuthnP256.Assertion calldata helperSig,
        WebAuthnP256.Assertion calldata receiverSig
    ) external returns (uint256 sealId) {
        if (codeBlock > block.number) revert CodeFromFuture();
        if (block.number - codeBlock > LIVE_WINDOW) revert CodeExpired();
        Member storage r = _member(q.receiver);
        bytes32 digest = inPersonDigest(q, liveKey);
        if (!digest.verify(receiverSig, r.x, r.y)) revert BadSignature(q.receiver);
        if (liveKey == address(0) || _recover(liveCodeHash(digest, codeBlock), liveSig) != liveKey) revert BadLiveCode();
        sealId = _seal(q, digest, helperSig, receiverSig.r);
        liveCodeBlock[sealId] = codeBlock;
        inPersonMinutes[q.helper] += q.minutes_;
        emit SealedInPerson(sealId, codeBlock, block.number);
    }

    function _recover(bytes32 hash, bytes calldata sig) private pure returns (address) {
        if (sig.length != 65) return address(0);
        bytes32 r = bytes32(sig[0:32]);
        bytes32 s = bytes32(sig[32:64]);
        uint8 v = uint8(sig[64]);
        if (v < 27) v += 27;
        // Reject malleable high-s signatures.
        if (uint256(s) > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0) return address(0);
        bytes32 ethHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
        return ecrecover(ethHash, v, r, s);
    }

    /// @notice Same as seal, but the receiver's guardian confirms instead of the receiver,
    /// for people who cannot use a phone. The helper can never be their own witness.
    function sealByGuardian(
        SealRequest calldata q,
        WebAuthnP256.Assertion calldata helperSig,
        WebAuthnP256.Assertion calldata guardianSig
    ) external returns (uint256 sealId) {
        _member(q.receiver);
        bytes32 guardian = guardianOf[q.receiver];
        if (guardian == bytes32(0)) revert NoGuardian(q.receiver);
        if (guardian == q.helper) revert SameMember();
        Member storage g = _member(guardian);
        bytes32 digest = sealDigest(q);
        if (!digest.verify(guardianSig, g.x, g.y)) revert BadSignature(guardian);
        sealId = _seal(q, digest, helperSig, guardianSig.r);
        emit ConfirmedByGuardian(sealId, guardian);
    }

    function _seal(SealRequest calldata q, bytes32 digest, WebAuthnP256.Assertion calldata helperSig, bytes32 witnessR)
        private
        returns (uint256 sealId)
    {
        if (q.minutes_ == 0 || q.minutes_ > MAX_MINUTES_PER_SEAL) revert InvalidMinutes();
        if (q.helper == q.receiver) revert SameMember();
        if (block.timestamp > q.deadline) revert Expired();
        Member storage h = _member(q.helper);
        Member storage r = members[q.receiver];
        if (!digest.verify(helperSig, h.x, h.y)) revert BadSignature(q.helper);
        h.nonce++;
        r.nonce++;

        if (q.redeem) {
            if (r.balance < q.minutes_) revert InsufficientHours(q.receiver);
            r.balance -= q.minutes_;
        }
        h.balance += q.minutes_;

        sealId = seals.length;
        bytes32 seed = keccak256(abi.encode(helperSig.r, witnessR, sealId));
        seals.push(Seal(q.helper, q.receiver, q.minutes_, q.category, q.redeem, uint64(block.timestamp), seed));
        _sealsOf[q.helper].push(sealId);
        _sealsOf[q.receiver].push(sealId);
        emit Sealed(sealId, q.helper, q.receiver, q.minutes_, q.category, q.redeem, seed);
        if (q.visitId != bytes32(0)) _closeVisit(q.visitId, q.helper, sealId, q.minutes_);
    }

    function _closeVisit(bytes32 visitId, bytes32 helper, uint256 sealId, uint32 claimed) private {
        Visit storage v = visits[visitId];
        if (v.visitor != helper || v.closed) revert BadVisit(visitId);
        v.closed = true;
        if (openVisitOf[helper] == visitId) openVisitOf[helper] = bytes32(0);
        if (sealId != NO_SEAL) visitOfSeal[sealId] = visitId;
        emit VisitClosed(visitId, sealId, claimed, uint32((block.timestamp - v.start) / 60));
    }

    function dependentDigest(bytes32 guardian) public view returns (bytes32) {
        return keccak256(abi.encode("TimeBank.dependent", block.chainid, address(this), guardian, members[guardian].nonce));
    }

    /// @notice A family member opens an account for someone without a phone (e.g. a parent with dementia).
    /// The account has no key of its own, so only its guardian can ever confirm for it.
    function registerDependent(bytes32 guardian, WebAuthnP256.Assertion calldata sig) external returns (bytes32 id) {
        Member storage g = _member(guardian);
        bytes32 digest = dependentDigest(guardian);
        if (!digest.verify(sig, g.x, g.y)) revert BadSignature(guardian);
        g.nonce++;
        id = digest; // unique per guardian and nonce, and never equal to a key-derived id
        members[id] = Member({x: 0, y: 0, balance: 0, nonce: 0, exists: true});
        guardianOf[id] = guardian;
        emit Registered(id);
        emit GuardianSet(id, guardian);
    }

    function guardianDigest(bytes32 member, bytes32 guardian) public view returns (bytes32) {
        return keccak256(abi.encode("TimeBank.guardian", block.chainid, address(this), member, guardian, members[member].nonce));
    }

    /// @notice A member who has a passkey chooses (or removes, with 0) a guardian while they still can.
    function setGuardian(bytes32 member, bytes32 guardian, WebAuthnP256.Assertion calldata sig) external {
        Member storage m = _member(member);
        if (guardian == member) revert SameMember();
        if (guardian != bytes32(0)) _member(guardian);
        if (!guardianDigest(member, guardian).verify(sig, m.x, m.y)) revert BadSignature(member);
        m.nonce++;
        guardianOf[member] = guardian;
        emit GuardianSet(member, guardian);
    }

    /// @notice For people who can no longer consent, the community steward records the guardian.
    function appointGuardian(bytes32 member, bytes32 guardian) external onlySteward {
        _member(member);
        if (guardian != bytes32(0)) _member(guardian);
        guardianOf[member] = guardian;
        emit GuardianSet(member, guardian);
    }

    function giftDigest(bytes32 from, bytes32 to, uint32 minutes_) public view returns (bytes32) {
        return keccak256(abi.encode("TimeBank.gift", block.chainid, address(this), from, to, minutes_, members[from].nonce));
    }

    /// @notice Give hours to another member, e.g. parents in another city who redeem them locally.
    function gift(bytes32 from, bytes32 to, uint32 minutes_, WebAuthnP256.Assertion calldata sig) external {
        if (minutes_ == 0) revert InvalidMinutes();
        if (from == to) revert SameMember();
        Member storage f = _member(from);
        Member storage t = _member(to);
        if (!giftDigest(from, to, minutes_).verify(sig, f.x, f.y)) revert BadSignature(from);
        if (f.balance < minutes_) revert InsufficientHours(from);
        f.nonce++;
        f.balance -= minutes_;
        t.balance += minutes_;
        emit Gifted(from, to, minutes_);
    }

    function donateDigest(bytes32 from, uint32 minutes_) public view returns (bytes32) {
        return keccak256(abi.encode("TimeBank.donate", block.chainid, address(this), from, minutes_, members[from].nonce));
    }

    /// @notice Donate hours to the community pool, which the steward grants to people in need.
    function donate(bytes32 from, uint32 minutes_, WebAuthnP256.Assertion calldata sig) external {
        if (minutes_ == 0) revert InvalidMinutes();
        Member storage f = _member(from);
        if (!donateDigest(from, minutes_).verify(sig, f.x, f.y)) revert BadSignature(from);
        if (f.balance < minutes_) revert InsufficientHours(from);
        f.nonce++;
        f.balance -= minutes_;
        poolBalance += minutes_;
        emit Donated(minutes_);
    }

    function grantFromPool(bytes32 to, uint32 minutes_) external onlySteward {
        if (minutes_ == 0 || poolBalance < minutes_) revert InvalidMinutes();
        Member storage t = _member(to);
        poolBalance -= minutes_;
        t.balance += minutes_;
        emit Granted(to, minutes_);
    }

    /// @notice Mark a member as a volunteer vouched for by a community, for door-side checks.
    function certify(bytes32 id, bytes32 community) external onlySteward {
        _member(id);
        certifiedCommunity[id] = community;
        emit Certified(id, community);
    }

    /// @notice Door-side check: is the person in front of me really this member, right now?
    /// The caller picks a fresh random challenge; the visitor signs it with their passkey.
    /// Called with eth_call, so it costs nothing and needs no transaction.
    function verifyPresence(bytes32 id, bytes32 challenge, WebAuthnP256.Assertion calldata sig)
        external
        view
        returns (bool ok, bytes32 community)
    {
        Member storage m = members[id];
        if (!m.exists) return (false, bytes32(0));
        ok = challenge.verify(sig, m.x, m.y);
        community = ok ? certifiedCommunity[id] : bytes32(0);
    }

    /// @notice Same check as verifyPresence, but published on-chain so the host's screen,
    /// which only knows the challenge it displayed, sees the result within a block.
    function checkIn(bytes32 id, bytes32 challenge, WebAuthnP256.Assertion calldata sig) external {
        Member storage m = _member(id);
        if (!challenge.verify(sig, m.x, m.y)) revert BadSignature(id);
        emit PresenceVerified(challenge, id, certifiedCommunity[id]);
    }

    function arriveDigest(bytes32 tag, bytes32 nonce, bytes32 locationHash, bytes32 challenge) public view returns (bytes32) {
        return keccak256(abi.encode("TimeBank.arrive", block.chainid, address(this), tag, nonce, locationHash, challenge));
    }

    /// @notice A helper proves with their passkey that they are at a door right now.
    /// The household is identified only by a blinded tag, so watching the chain does not reveal
    /// when someone's home has a visitor; their guardian, holding the card secret, recognises it.
    /// A helper has at most one open visit: arriving elsewhere closes the previous one.
    function arrive(
        bytes32 visitor,
        bytes32 tag,
        bytes32 nonce,
        bytes32 locationHash,
        bytes32 challenge,
        WebAuthnP256.Assertion calldata sig
    ) external returns (bytes32 visitId) {
        Member storage m = _member(visitor);
        if (!arriveDigest(tag, nonce, locationHash, challenge).verify(sig, m.x, m.y)) revert BadSignature(visitor);
        visitId = keccak256(abi.encode(visitor, challenge));
        if (visits[visitId].start != 0) revert BadVisit(visitId);
        bytes32 previous = openVisitOf[visitor];
        if (previous != bytes32(0)) _closeVisit(previous, visitor, NO_SEAL, 0);
        visits[visitId] = Visit({visitor: visitor, start: uint64(block.timestamp), closed: false, tag: tag, nonce: nonce});
        openVisitOf[visitor] = visitId;
        bytes32 community = certifiedCommunity[visitor];
        emit PresenceVerified(challenge, visitor, community);
        emit Arrived(visitId, visitor, tag, nonce, locationHash, community);
    }

    function sealsOf(bytes32 id) external view returns (uint256[] memory) {
        return _sealsOf[id];
    }

    function sealCount() external view returns (uint256) {
        return seals.length;
    }

    function _member(bytes32 id) private view returns (Member storage m) {
        m = members[id];
        if (!m.exists) revert UnknownMember(id);
    }

    modifier onlySteward() {
        if (msg.sender != steward) revert NotSteward();
        _;
    }
}
