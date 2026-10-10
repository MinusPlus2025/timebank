// Passkeys (WebAuthn) without any wallet SDK. The phone's secure chip holds the key;
// Face ID / fingerprint unlocks it. Signatures are verified on-chain by Monad's P256 precompile.
import { p256 } from "@noble/curves/p256";
import { bytesToHex, hexToBytes, sha256, type Hex } from "viem";

export type Assertion = { authenticatorData: Hex; clientDataSuffix: string; r: Hex; s: Hex };

const PREFIX = '{"type":"webauthn.get","challenge":"';
const N = p256.CURVE.n;

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export function passkeysSupported() {
  return typeof window !== "undefined" && !!window.PublicKeyCredential && !!navigator.credentials;
}

/** Creates a passkey and returns its public key coordinates. */
export async function createPasskey(displayName: string): Promise<{ x: Hex; y: Hex }> {
  const cred = (await navigator.credentials.create({
    publicKey: {
      rp: { name: "时间银行 TimeBank" },
      user: { id: crypto.getRandomValues(new Uint8Array(16)), name: displayName, displayName },
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      pubKeyCredParams: [{ type: "public-key", alg: -7 }], // ES256 = P-256
      authenticatorSelection: { residentKey: "required", userVerification: "required" },
      timeout: 120_000,
    },
  })) as PublicKeyCredential | null;
  if (!cred) throw new Error("cancelled");
  const spki = (cred.response as AuthenticatorAttestationResponse).getPublicKey();
  if (!spki) throw new Error("This browser cannot export the passkey public key");
  const key = await crypto.subtle.importKey("spki", spki, { name: "ECDSA", namedCurve: "P-256" }, true, ["verify"]);
  const jwk = await crypto.subtle.exportKey("jwk", key);
  const toHex = (s: string) => bytesToHex(Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)));
  return { x: toHex(jwk.x!), y: toHex(jwk.y!) };
}

function parseDer(sig: Uint8Array): { r: bigint; s: bigint } {
  // SEQUENCE { INTEGER r, INTEGER s }
  let i = 2;
  const read = () => {
    if (sig[i++] !== 0x02) throw new Error("Bad signature encoding");
    const len = sig[i++];
    const v = BigInt(bytesToHex(sig.slice(i, i + len)));
    i += len;
    return v;
  };
  const r = read();
  const s = read();
  return { r, s };
}

const pad32 = (v: bigint) => `0x${v.toString(16).padStart(64, "0")}` as Hex;

export type SignResult = { assertion: Assertion; publicKeys: { x: Hex; y: Hex }[] };

/**
 * Asks the user to sign `challenge` with any of their passkeys for this site.
 * Also returns the two public keys the signature could belong to, so the caller
 * can tell which member signed without storing credential IDs anywhere.
 */
export async function signWithPasskey(challenge: Hex): Promise<SignResult> {
  const cred = (await navigator.credentials.get({
    publicKey: { challenge: hexToBytes(challenge), userVerification: "required", timeout: 120_000 },
  })) as PublicKeyCredential | null;
  if (!cred) throw new Error("cancelled");
  const resp = cred.response as AuthenticatorAssertionResponse;
  const authData = new Uint8Array(resp.authenticatorData);
  const clientDataJSON = new TextDecoder().decode(resp.clientDataJSON);
  const expected = PREFIX + b64url(hexToBytes(challenge));
  if (!clientDataJSON.startsWith(expected)) throw new Error("Unexpected passkey response format");

  let { r, s } = parseDer(new Uint8Array(resp.signature));
  if (s > N / 2n) s = N - s; // low-s form; both are valid for the same key

  const message = sha256(new Uint8Array([...authData, ...hexToBytes(sha256(new TextEncoder().encode(clientDataJSON)))]));
  const publicKeys = [0, 1].map((bit) => {
    const point = new p256.Signature(r, s).addRecoveryBit(bit).recoverPublicKey(message.slice(2));
    const raw = point.toRawBytes(false); // 0x04 || x || y
    return { x: bytesToHex(raw.slice(1, 33)), y: bytesToHex(raw.slice(33)) };
  });

  return {
    assertion: {
      authenticatorData: bytesToHex(authData),
      clientDataSuffix: clientDataJSON.slice(expected.length),
      r: pad32(r),
      s: pad32(s),
    },
    publicKeys,
  };
}
