import { createPublicClient, defineChain, http, type Hex } from "viem";
import { timeBankAbi } from "./abi";
import type { Assertion } from "./passkey";

export const TIMEBANK = (import.meta.env.VITE_TIMEBANK_ADDRESS || "0x0000000000000000000000000000000000000000") as Hex;
export const EXPLORER = import.meta.env.VITE_EXPLORER_URL || "https://testnet.monadexplorer.com";

const rpcUrl = import.meta.env.VITE_RPC_URL || "https://testnet-rpc.monad.xyz";

export const chain = defineChain({
  id: Number(import.meta.env.VITE_CHAIN_ID || 10143),
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl] } },
});

export const client = createPublicClient({ chain, transport: http(rpcUrl) });

const contract = { address: TIMEBANK, abi: timeBankAbi } as const;

export type Member = { exists: boolean; balance: number; nonce: number };

export async function getMember(id: Hex): Promise<Member> {
  const [, , balance, nonce, exists] = await client.readContract({ ...contract, functionName: "members", args: [id] });
  return { exists, balance: Number(balance), nonce: Number(nonce) };
}

export function memberId(x: Hex, y: Hex): Promise<Hex> {
  return client.readContract({ ...contract, functionName: "memberId", args: [x, y] });
}

export function sealDigest(helper: Hex, receiver: Hex, minutes: number, category: number, redeem: boolean) {
  return client.readContract({ ...contract, functionName: "sealDigest", args: [helper, receiver, minutes, category, redeem] });
}

export function giftDigest(from: Hex, to: Hex, minutes: number) {
  return client.readContract({ ...contract, functionName: "giftDigest", args: [from, to, minutes] });
}

export function donateDigest(from: Hex, minutes: number) {
  return client.readContract({ ...contract, functionName: "donateDigest", args: [from, minutes] });
}

export type SealRecord = {
  id: number;
  helper: Hex;
  receiver: Hex;
  minutes: number;
  category: number;
  redeemed: boolean;
  timestamp: number;
  seed: Hex;
};

export async function getSeal(id: number): Promise<SealRecord> {
  const [helper, receiver, minutes, category, redeemed, timestamp, seed] = await client.readContract({
    ...contract,
    functionName: "seals",
    args: [BigInt(id)],
  });
  return { id, helper, receiver, minutes: Number(minutes), category, redeemed, timestamp: Number(timestamp), seed };
}

export async function getSealsOf(id: Hex): Promise<SealRecord[]> {
  const ids = await client.readContract({ ...contract, functionName: "sealsOf", args: [id] });
  return Promise.all(ids.map((i) => getSeal(Number(i))));
}

export function getPoolBalance() {
  return client.readContract({ ...contract, functionName: "poolBalance" }).then(Number);
}

export function getCommunity(id: Hex) {
  return client.readContract({ ...contract, functionName: "certifiedCommunity", args: [id] });
}

type RelayFn = "register" | "seal" | "gift" | "donate" | "checkIn";

export async function relay(fn: RelayFn, args: unknown[]): Promise<{ hash: Hex }> {
  const res = await fetch("/api/relay", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ fn, args }, (_, v) => (typeof v === "bigint" ? v.toString() : v)),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Relay failed");
  return data;
}

export const toArgs = (a: Assertion) => [a.authenticatorData, a.clientDataSuffix, a.r, a.s] as const;

/** Polls for the PresenceVerified event matching a door challenge. */
export async function findCheckIn(challenge: Hex, fromBlock: bigint) {
  const logs = await client.getContractEvents({
    ...contract,
    eventName: "PresenceVerified",
    args: { challenge },
    fromBlock,
  });
  return logs[0]?.args;
}
