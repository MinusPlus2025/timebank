// Where TimeBank lives on public networks. Kept in code (not only in hosting env vars)
// so a contract upgrade ships with the commit that needs it. Local chains use env vars.
export const DEPLOYED: Record<number, `0x${string}`> = {
  10143: "0xA15f3aBeABE823726070dF8Cea0e4E52d8bd234d", // Monad testnet (v3)
};
