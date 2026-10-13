import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

// Serves the api/ functions during `npm run dev`, mirroring the Vercel functions in production.
function devRelay(): Plugin {
  return {
    name: "dev-relay",
    configureServer(server) {
      for (const name of ["relay", "rpc"]) {
        server.middlewares.use(`/api/${name}`, async (req, res) => {
          const mod = await server.ssrLoadModule(`/api/${name}.ts`);
          await mod.default(req, res);
        });
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));
  return { plugins: [react(), devRelay()] };
});
