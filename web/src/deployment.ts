// Where TimeBank lives on public networks. Kept in code (not only in hosting env vars)
// so a contract upgrade ships with the commit that needs it. Local chains use env vars.
export const DEPLOYED: Record<number, `0x${string}`> = {
  10143: "0xb2dD5D6A8681aA7CC298fb29FF5b3fd2d4E5C176", // Monad testnet (v4: heartbeat seals)
};
