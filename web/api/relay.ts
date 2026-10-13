// Relayer: pays gas on behalf of passkey users so nobody needs a wallet.
// It can only call TimeBank's passkey-authorized functions, and the contract
// rejects anything without valid passkey signatures, so the relayer holds no power.
import type { IncomingMessage, ServerResponse } from "node:http";
import { createPublicClient, createWalletClient, defineChain, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { timeBankAbi } from "../src/abi.js";
import { DEPLOYED } from "../src/deployment.js";

const ALLOWED = new Set(["register", "seal", "sealInPerson", "gift", "donate", "checkIn", "registerDependent", "sealByGuardian", "arrive"]);

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

// Everyone shares one relayer key, so two requests at the same moment can pick the same nonce
// and the node rejects the later one. Retry those with a fresh nonce after a short random wait.
const NONCE_CLASH = /nonce|invalid parameters|replacement|already known|underpriced/i;
async function sendWithFreshNonce(nextNonce: () => Promise<number>, send: (nonce: number) => Promise<Hex>): Promise<Hex> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await send(await nextNonce());
    } catch (err) {
      const e = err as { shortMessage?: string; message?: string };
      if (attempt >= 5 || !NONCE_CLASH.test(`${e.shortMessage} ${e.message}`)) throw err;
      await new Promise((r) => setTimeout(r, 200 + Math.random() * 600));
    }
  }
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
    const hash = await sendWithFreshNonce(() => publicClient.getTransactionCount({ address: account.address, blockTag: "pending" }), (nonce) =>
      walletClient.writeContract({ ...request, nonce })
    );
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    send(res, 200, { hash, status: receipt.status, blockNumber: receipt.blockNumber.toString() });
  } catch (err) {
    const e = err as { shortMessage?: string; message?: string; walk?: (fn: (e: unknown) => boolean) => unknown };
    // Name the contract's custom error (e.g. CodeExpired) so the app can react to it.
    const revert = e.walk?.((x) => !!(x as { data?: { errorName?: string } })?.data?.errorName) as { data?: { errorName?: string } } | undefined;
    const name = revert?.data?.errorName;
    send(res, 400, { error: name ? `${e.shortMessage || "Reverted"} (${name})` : e.shortMessage || e.message || "Relay failed" });
  }
}
