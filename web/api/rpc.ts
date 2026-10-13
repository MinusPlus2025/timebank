// Read-only RPC proxy: the app reads Monad through its own domain, so a phone that can
// open the page can also read the chain, even where the public RPC host is slow or blocked.
import type { IncomingMessage, ServerResponse } from "node:http";

const READS = new Set([
  "eth_chainId",
  "eth_blockNumber",
  "eth_call",
  "eth_getBlockByNumber",
  "eth_getTransactionReceipt",
  "eth_getTransactionByHash",
  "eth_getLogs",
  "eth_getBalance",
  "eth_getCode",
  "eth_estimateGas",
  "eth_gasPrice",
]);

type Call = { jsonrpc: string; id: unknown; method: string; params?: unknown[] };

async function readBody(req: IncomingMessage): Promise<unknown> {
  const body = (req as IncomingMessage & { body?: unknown }).body;
  if (body !== undefined) return typeof body === "string" ? JSON.parse(body) : body;
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("content-type", "application/json");
  if (req.method !== "POST") {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: "POST only" }));
  }
  try {
    const body = (await readBody(req)) as Call | Call[];
    const calls = Array.isArray(body) ? body : [body];
    if (calls.length > 20 || calls.some((c) => !READS.has(c?.method))) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: "Read-only methods only" }));
    }
    const upstream = await fetch(process.env.RPC_URL || "https://testnet-rpc.monad.xyz", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    res.statusCode = upstream.status;
    res.end(await upstream.text());
  } catch (e) {
    res.statusCode = 502;
    res.end(JSON.stringify({ error: (e as Error).message }));
  }
}
