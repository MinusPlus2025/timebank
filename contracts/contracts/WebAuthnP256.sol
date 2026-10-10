// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice Verifies WebAuthn (passkey) assertions with the P256 signature
/// precompile at 0x0100 (EIP-7951 / RIP-7212), which Monad ships natively.
library WebAuthnP256 {
    address internal constant P256_VERIFIER = address(0x100);

    // clientDataJSON always starts with this for navigator.credentials.get()
    bytes internal constant CLIENT_DATA_PREFIX = '{"type":"webauthn.get","challenge":"';

    bytes1 internal constant FLAG_USER_PRESENT = 0x01;
    bytes1 internal constant FLAG_USER_VERIFIED = 0x04;

    struct Assertion {
        bytes authenticatorData;
        // Everything in clientDataJSON after the base64url challenge, starting with the closing quote.
        string clientDataSuffix;
        bytes32 r;
        bytes32 s;
    }

    /// @return true if `a` is a user-verified passkey signature over `challenge` by key (x, y).
    function verify(bytes32 challenge, Assertion memory a, bytes32 x, bytes32 y) internal view returns (bool) {
        bytes memory authData = a.authenticatorData;
        // rpIdHash (32) + flags (1) + signCount (4)
        if (authData.length < 37) return false;
        bytes1 flags = authData[32];
        // User verification means the device checked Face ID / fingerprint / PIN, not just a tap.
        if (flags & FLAG_USER_PRESENT == 0 || flags & FLAG_USER_VERIFIED == 0) return false;

        bytes memory clientDataJSON =
            abi.encodePacked(CLIENT_DATA_PREFIX, base64url(abi.encodePacked(challenge)), a.clientDataSuffix);
        bytes32 message = sha256(abi.encodePacked(authData, sha256(clientDataJSON)));

        (bool ok, bytes memory ret) = P256_VERIFIER.staticcall(abi.encode(message, a.r, a.s, x, y));
        // The precompile returns 32 bytes of 1 on success and empty data on failure.
        return ok && ret.length == 32 && abi.decode(ret, (uint256)) == 1;
    }

    function base64url(bytes memory data) internal pure returns (string memory) {
        bytes memory table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
        uint256 len = data.length;
        bytes memory out = new bytes((len * 4 + 2) / 3);
        uint256 j;
        for (uint256 i = 0; i < len; i += 3) {
            uint256 b1 = i + 1 < len ? uint8(data[i + 1]) : 0;
            uint256 b2 = i + 2 < len ? uint8(data[i + 2]) : 0;
            uint256 triple = (uint256(uint8(data[i])) << 16) | (b1 << 8) | b2;
            out[j++] = table[(triple >> 18) & 63];
            out[j++] = table[(triple >> 12) & 63];
            if (i + 1 < len) out[j++] = table[(triple >> 6) & 63];
            if (i + 2 < len) out[j++] = table[triple & 63];
        }
        return string(out);
    }
}
