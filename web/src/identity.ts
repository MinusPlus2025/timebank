import { bytesToHex, encodeAbiParameters, hexToBytes, keccak256, type Hex } from "viem";
import type { Assertion } from "./passkey";

// Who "I" am on this device. The passkey itself lives in the phone's secure chip;
// this only remembers which on-chain member it belongs to and a local nickname.
export type Me = { id: Hex; x: Hex; y: Hex; name: string };

const KEY = "timebank.me";

export function loadMe(): Me | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Me) : null;
  } catch {
    return null;
  }
}

export function saveMe(me: Me) {
  try {
    localStorage.setItem(KEY, JSON.stringify(me));
  } catch {
    // Private mode: the user can still act, they just re-identify via Face ID next time.
  }
}

export function idOf(x: Hex, y: Hex): Hex {
  return keccak256(encodeAbiParameters([{ type: "bytes32" }, { type: "bytes32" }], [x, y]));
}

/** A short, friendly label for a member id, e.g. "A3F2". Names are never stored on-chain. */
export const shortId = (id: Hex) => id.slice(2, 6).toUpperCase();

/** What the first signer hands to the second: everything needed to co-sign the seal.
 * v: the helper's door arrival (zero if none); t: deadline in seconds since 1970. */
export type SealPayload = { h: Hex; r: Hex; m: number; c: number; d: boolean; v: Hex; t: number; a: Assertion };

const ZERO32 = "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex;

const toB64url = (b: Uint8Array) =>
  btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

// Packed binary keeps the QR code sparse enough for older phone cameras:
// helper(32) receiver(32) minutes(2) category(1) flags(1) deadline(4) [visit(32) if flag] authDataLen(1) authData r(32) s(32) clientDataSuffix(utf8)
// flags: bit0 redeem, bit1 has visit
export function encodeSealPayload(p: SealPayload): string {
  const auth = hexToBytes(p.a.authenticatorData);
  const suffix = new TextEncoder().encode(p.a.clientDataSuffix);
  const hasVisit = p.v !== ZERO32;
  const out = new Uint8Array(32 + 32 + 2 + 1 + 1 + 4 + (hasVisit ? 32 : 0) + 1 + auth.length + 64 + suffix.length);
  let i = 0;
  const put = (b: Uint8Array) => {
    out.set(b, i);
    i += b.length;
  };
  put(hexToBytes(p.h));
  put(hexToBytes(p.r));
  put(new Uint8Array([p.m >> 8, p.m & 0xff, p.c, (p.d ? 1 : 0) | (hasVisit ? 2 : 0)]));
  put(new Uint8Array([p.t >>> 24, (p.t >>> 16) & 0xff, (p.t >>> 8) & 0xff, p.t & 0xff]));
  if (hasVisit) put(hexToBytes(p.v));
  put(new Uint8Array([auth.length]));
  put(auth);
  put(hexToBytes(p.a.r));
  put(hexToBytes(p.a.s));
  put(suffix);
  return toB64url(out);
}

export function decodeSealPayload(s: string): SealPayload {
  const b = fromB64url(s);
  let i = 0;
  const take = (n: number) => b.slice(i, (i += n));
  const h = bytesToHex(take(32));
  const r = bytesToHex(take(32));
  const [m1, m2, c, flags] = take(4);
  const [t1, t2, t3, t4] = take(4);
  const v = flags & 2 ? bytesToHex(take(32)) : ZERO32;
  const [authLen] = take(1);
  const authenticatorData = bytesToHex(take(authLen));
  const sigR = bytesToHex(take(32));
  const sigS = bytesToHex(take(32));
  const clientDataSuffix = new TextDecoder().decode(b.slice(i));
  const t = ((t1 << 24) | (t2 << 16) | (t3 << 8) | t4) >>> 0;
  return { h, r, m: (m1 << 8) | m2, c, d: (flags & 1) === 1, v, t, a: { authenticatorData, clientDataSuffix, r: sigR, s: sigS } };
}

// Relatives this device looks after as guardian. Names stay local, like the user's own name.
// secret: printed only on the family card; it blinds door arrivals so the chain does not
// reveal when this household has a visitor.
export type FamilyMember = { id: Hex; name: string; secret: Hex };
const FAMILY_KEY = "timebank.family";

export function loadFamily(): FamilyMember[] {
  try {
    return JSON.parse(localStorage.getItem(FAMILY_KEY) || "[]") as FamilyMember[];
  } catch {
    return [];
  }
}

export function addFamily(f: FamilyMember) {
  try {
    localStorage.setItem(FAMILY_KEY, JSON.stringify([...loadFamily().filter((x) => x.id !== f.id), f]));
  } catch {
    /* private mode: the account still exists on-chain */
  }
}

const pack = (types: string[], values: unknown[]) =>
  keccak256(encodeAbiParameters(types.map((type) => ({ type })), values));

/** The blinded tag the contract records for an arrival: keccak256(secret, nonce). */
export const arrivalTag = (secret: Hex, nonce: Hex) => pack(["bytes32", "bytes32"], [secret, nonce]);

/** visitId as the contract derives it: keccak256(visitor, challenge). */
export const visitIdOf = (visitor: Hex, challenge: Hex) => pack(["bytes32", "bytes32"], [visitor, challenge]);

/** Where the helper was, as a commitment only someone with the card secret can check (~100 m). */
export async function locationCommitment(secret: Hex, nonce: Hex): Promise<Hex> {
  const pos = await new Promise<GeolocationPosition | null>((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { timeout: 5000, maximumAge: 60000 });
  });
  if (!pos) return ZERO32;
  const e3 = (v: number) => BigInt(Math.round(v * 1000));
  return pack(["bytes32", "bytes32", "int256", "int256"], [secret, nonce, e3(pos.coords.latitude), e3(pos.coords.longitude)]);
}

// The helper's own open arrival per household, so the seal can point at it.
const VISITS_KEY = "timebank.visits";
export function rememberVisit(receiver: Hex, visitId: Hex) {
  try {
    const all = JSON.parse(localStorage.getItem(VISITS_KEY) || "{}");
    localStorage.setItem(VISITS_KEY, JSON.stringify({ ...all, [receiver]: visitId }));
  } catch {
    /* without it the seal simply carries no arrival */
  }
}
export function recalledVisit(receiver: Hex): Hex | null {
  try {
    return (JSON.parse(localStorage.getItem(VISITS_KEY) || "{}")[receiver] as Hex) ?? null;
  } catch {
    return null;
  }
}
