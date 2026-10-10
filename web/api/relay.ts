// Relayer: pays gas on behalf of passkey users so nobody needs a wallet.
// It can only call TimeBank's passkey-authorized functions, and the contract
// rejects anything without valid passkey signatures, so the relayer holds no power.
import type { IncomingMessage, ServerResponse } from "node:http";
import { createPublicClient, createWalletClient, defineChain, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { timeBankAbi } from "../src/abi.js";
import { DEPLOYED } from "../src/deployment.js";

const ALLOWED = new Set(["register", "seal", "gift", "donate", "checkIn", "registerDependent", "sealByGuardian", "arrive"]);

function clients() {
  const key = process.env.RELAYER_PRIVATE_KEY as Hex | undefined;
  const address = (DEPLOYED[Number(process.env.CHAIN_ID || 10143)] || process.env.TIMEBANK_ADDRESS) as Hex | undefined;
  if (!key || !address) throw new Error("Relayer is not configured");
  const chain = defineChain({
    id: Number(process.env.CHAIN_ID || 10143),
    name: "Monad Testnet",
    nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
    rpcUrls: { default: { http: [process.env.RPC_URL || "https://testnet-rpc.monad.xyz"] } },
  });
  const transport = http(process.env.RPC_URL || "https://testnet-rpc.monad.xyz");
  return {
    address,
    account: privateKeyToAccount(key),
    publicClient: createPublicClient({ chain, transport }),
    walletClient: createWalletClient({ chain, transport, account: privateKeyToAccount(key) }),
  };
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const body = (req as IncomingMessage & { body?: unknown }).body;
  if (body !== undefined) return typeof body === "string" ? JSON.parse(body) : body;
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function send(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(payload));
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST") return send(res, 405, { error: "POST only" });
  try {
    const { fn, args } = (await readBody(req)) as { fn: string; args: unknown[] };
    if (!ALLOWED.has(fn) || !Array.isArray(args)) return send(res, 400, { error: "Unsupported call" });
    const { address, account, publicClient, walletClient } = clients();
    // Simulate first so an invalid signature costs nothing and returns a readable error.
    const { request } = await publicClient.simulateContract({
      address,
      abi: timeBankAbi,
      functionName: fn as "register",
      args: args as never,
      account,
    });
    const hash = await walletClient.writeContract(request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    send(res, 200, { hash, status: receipt.status, blockNumber: receipt.blockNumber.toString() });
  } catch (err) {
    const e = err as { shortMessage?: string; message?: string };
    send(res, 400, { error: e.shortMessage || e.message || "Relay failed" });
  }
}
