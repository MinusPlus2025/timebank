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

/** What the person being thanked hands to their helper: everything needed to co-sign the seal. */
export type SealPayload = { h: Hex; r: Hex; m: number; c: number; d: boolean; a: Assertion };

const toB64url = (b: Uint8Array) =>
  btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

// Packed binary keeps the QR code sparse enough for older phone cameras:
// helper(32) receiver(32) minutes(2) category(1) redeem(1) authDataLen(1) authData r(32) s(32) clientDataSuffix(utf8)
export function encodeSealPayload(p: SealPayload): string {
  const auth = hexToBytes(p.a.authenticatorData);
  const suffix = new TextEncoder().encode(p.a.clientDataSuffix);
  const out = new Uint8Array(32 + 32 + 2 + 1 + 1 + 1 + auth.length + 64 + suffix.length);
  let i = 0;
  const put = (b: Uint8Array) => {
    out.set(b, i);
    i += b.length;
  };
  put(hexToBytes(p.h));
  put(hexToBytes(p.r));
  put(new Uint8Array([p.m >> 8, p.m & 0xff, p.c, p.d ? 1 : 0, auth.length]));
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
  const [m1, m2, c, d, authLen] = take(5);
  const authenticatorData = bytesToHex(take(authLen));
  const sigR = bytesToHex(take(32));
  const sigS = bytesToHex(take(32));
  const clientDataSuffix = new TextDecoder().decode(b.slice(i));
  return { h, r, m: (m1 << 8) | m2, c, d: d === 1, a: { authenticatorData, clientDataSuffix, r: sigR, s: sigS } };
}

// Relatives this device looks after as guardian. Names stay local, like the user's own name.
export type FamilyMember = { id: Hex; name: string };
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
