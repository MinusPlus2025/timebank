// Simulates a phone passkey in Node: a P-256 key that produces real WebAuthn assertions.
const crypto = require("crypto");

const CLIENT_DATA_PREFIX = '{"type":"webauthn.get","challenge":"';
const ORIGIN_SUFFIX = '","origin":"https://timebank.example","crossOrigin":false}';

const b64urlToHex = (s) => "0x" + Buffer.from(s, "base64url").toString("hex");

class Passkey {
  constructor({ userVerified = true } = {}) {
    const { privateKey, publicKey } = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
    this.privateKey = privateKey;
    const jwk = publicKey.export({ format: "jwk" });
    this.x = b64urlToHex(jwk.x);
    this.y = b64urlToHex(jwk.y);
    this.userVerified = userVerified;
  }

  sign(challengeHex) {
    const rpIdHash = crypto.createHash("sha256").update("timebank.example").digest();
    const flags = Buffer.from([this.userVerified ? 0x05 : 0x01]);
    const authenticatorData = Buffer.concat([rpIdHash, flags, Buffer.from([0, 0, 0, 1])]);
    const challenge = Buffer.from(challengeHex.slice(2), "hex").toString("base64url");
    const clientDataJSON = CLIENT_DATA_PREFIX + challenge + ORIGIN_SUFFIX;
    const clientDataHash = crypto.createHash("sha256").update(clientDataJSON).digest();
    const sig = crypto.sign("sha256", Buffer.concat([authenticatorData, clientDataHash]), {
      key: this.privateKey,
      dsaEncoding: "ieee-p1363",
    });
    return {
      authenticatorData: "0x" + authenticatorData.toString("hex"),
      clientDataSuffix: ORIGIN_SUFFIX,
      r: "0x" + sig.subarray(0, 32).toString("hex"),
      s: "0x" + sig.subarray(32).toString("hex"),
    };
  }
}

module.exports = { Passkey };
