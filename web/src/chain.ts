import { createPublicClient, defineChain, http, type Hex } from "viem";
import { timeBankAbi } from "./abi";
import type { Assertion } from "./passkey";
import { DEPLOYED } from "./deployment";

const chainId = Number(import.meta.env.VITE_CHAIN_ID || 10143);
export const TIMEBANK = (DEPLOYED[chainId] || import.meta.env.VITE_TIMEBANK_ADDRESS || "0x0000000000000000000000000000000000000000") as Hex;
export const EXPLORER = import.meta.env.VITE_EXPLORER_URL || "https://testnet.monadexplorer.com";

const rpcUrl = import.meta.env.VITE_RPC_URL || "https://testnet-rpc.monad.xyz";

export const chain = defineChain({
  id: chainId,
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

/** What both people sign for one seal; mirrors TimeBank.SealRequest. */
export type SealRequest = {
  helper: Hex;
  receiver: Hex;
  minutes_: number;
  category: number;
  redeem: boolean;
  visitId: Hex;
  deadline: number;
};

export const NO_VISIT = "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex;

export function sealDigest(q: SealRequest) {
  return client.readContract({ ...contract, functionName: "sealDigest", args: [{ ...q, deadline: BigInt(q.deadline) }] });
}

/** Seconds since 1970, the unit of seal deadlines. */
export const nowSeconds = () => Math.floor(Date.now() / 1000);

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

export function dependentDigest(guardian: Hex) {
  return client.readContract({ ...contract, functionName: "dependentDigest", args: [guardian] });
}

export function arriveDigest(tag: Hex, nonce: Hex, locationHash: Hex, challenge: Hex) {
  return client.readContract({ ...contract, functionName: "arriveDigest", args: [tag, nonce, locationHash, challenge] });
}

export async function getVisit(id: Hex) {
  const [visitor, start, closed, tag, nonce] = await client.readContract({ ...contract, functionName: "visits", args: [id] });
  return { visitor, start: Number(start), closed, tag, nonce };
}

export function getGuardian(id: Hex) {
  return client.readContract({ ...contract, functionName: "guardianOf", args: [id] });
}

export const hasGuardian = (g: Hex) => BigInt(g) !== 0n;

type RelayFn = "register" | "seal" | "gift" | "donate" | "checkIn" | "registerDependent" | "sealByGuardian" | "arrive";

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

/** Recent verified arrivals at any door; callers recognise their own household by its tag. */
export async function findArrivals(fromBlock: bigint) {
  const logs = await client.getContractEvents({ ...contract, eventName: "Arrived", fromBlock });
  return logs.map((l) => ({
    visitId: l.args.visitId!,
    visitor: l.args.visitor!,
    tag: l.args.tag!,
    nonce: l.args.nonce!,
    community: l.args.community!,
    block: l.blockNumber,
  }));
}
