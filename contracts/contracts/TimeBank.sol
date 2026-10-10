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

    uint32 public constant MAX_MINUTES_PER_SEAL = 8 hours / 1 minutes;

    address public immutable steward;

    mapping(bytes32 => Member) public members;
    mapping(bytes32 => bytes32) public certifiedCommunity;
    mapping(bytes32 => uint256[]) private _sealsOf;
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

    error NotSteward();
    error AlreadyRegistered();
    error UnknownMember(bytes32 id);
    error InvalidMinutes();
    error SameMember();
    error BadSignature(bytes32 id);
    error InsufficientHours(bytes32 id);

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

    function sealDigest(bytes32 helper, bytes32 receiver, uint32 minutes_, uint8 category, bool redeem)
        public
        view
        returns (bytes32)
    {
        return keccak256(
            abi.encode(
                "TimeBank.seal",
                block.chainid,
                address(this),
                helper,
                receiver,
                minutes_,
                category,
                redeem,
                members[helper].nonce,
                members[receiver].nonce
            )
        );
    }

    /// @notice Record an hour of help. Both people sign the same digest with their passkeys,
    /// so time cannot be invented by one side or by the operator.
    function seal(
        bytes32 helper,
        bytes32 receiver,
        uint32 minutes_,
        uint8 category,
        bool redeem,
        WebAuthnP256.Assertion calldata helperSig,
        WebAuthnP256.Assertion calldata receiverSig
    ) external returns (uint256 sealId) {
        if (minutes_ == 0 || minutes_ > MAX_MINUTES_PER_SEAL) revert InvalidMinutes();
        if (helper == receiver) revert SameMember();
        Member storage h = _member(helper);
        Member storage r = _member(receiver);

        bytes32 digest = sealDigest(helper, receiver, minutes_, category, redeem);
        if (!digest.verify(helperSig, h.x, h.y)) revert BadSignature(helper);
        if (!digest.verify(receiverSig, r.x, r.y)) revert BadSignature(receiver);
        h.nonce++;
        r.nonce++;

        if (redeem) {
            if (r.balance < minutes_) revert InsufficientHours(receiver);
            r.balance -= minutes_;
        }
        h.balance += minutes_;

        sealId = seals.length;
        bytes32 seed = keccak256(abi.encode(helperSig.r, receiverSig.r, sealId));
        seals.push(Seal(helper, receiver, minutes_, category, redeem, uint64(block.timestamp), seed));
        _sealsOf[helper].push(sealId);
        _sealsOf[receiver].push(sealId);
        emit Sealed(sealId, helper, receiver, minutes_, category, redeem, seed);
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
