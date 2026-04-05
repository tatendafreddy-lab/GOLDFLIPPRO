import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiKey = env.VITE_GOLD_API_KEY ?? "";

  console.log("[vite] Gold API key loaded:", apiKey ? `${apiKey.slice(0, 8)}...` : "MISSING");

  return {
    plugins: [react()],
    server: {
      port: 5290,
      strictPort: true,
      host: "0.0.0.0",
      proxy: {
        "/api/gold": {
          target: "https://www.gold-api.com",
          changeOrigin: true,
          secure: true,
          rewrite: () => "/price/XAU",
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              proxyReq.setHeader("x-access-token", apiKey);
            });
            proxy.on("error", (err) => {
              console.error("[proxy error]", err.message);
            });
            proxy.on("proxyRes", (proxyRes) => {
              console.log("[proxy] Gold-API responded:", proxyRes.statusCode);
            });
          },
        },
      },
    },
    preview: {
      port: 5291,
      strictPort: true,
      host: "0.0.0.0",
    },
  };
});
