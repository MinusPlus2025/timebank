// Where TimeBank lives on public networks. Kept in code (not only in hosting env vars)
// so a contract upgrade ships with the commit that needs it. Local chains use env vars.
export const DEPLOYED: Record<number, `0x${string}`> = {
  10143: "0x3AE397E6dc65F8918F8C6d264Dc459D6fa939Db5", // Monad testnet
};
