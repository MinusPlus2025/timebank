import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

// Serves api/relay.ts during `npm run dev`, mirroring the Vercel function in production.
function devRelay(): Plugin {
  return {
    name: "dev-relay",
    configureServer(server) {
      server.middlewares.use("/api/relay", async (req, res) => {
        const mod = await server.ssrLoadModule("/api/relay.ts");
        await mod.default(req, res);
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));
  return { plugins: [react(), devRelay()] };
});
