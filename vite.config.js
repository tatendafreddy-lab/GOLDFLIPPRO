import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiKey = env.VITE_GOLD_API_KEY ?? "";

  console.log("[vite] Gold API key loaded:", apiKey ? `${apiKey.slice(0, 8)}...` : "MISSING");

  return {
    plugins: [react()],
    server: {
      port: 5314,
      strictPort: true,
      host: "0.0.0.0",
      proxy: {
        "/api/gold": {
          target: "https://api.gold-api.com",
          changeOrigin: true,
          secure: false,
          rewrite: () => "/price/XAU/USD",
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              if (apiKey) proxyReq.setHeader("x-access-token", apiKey);
              proxyReq.setHeader("accept", "application/json");
              proxyReq.setHeader("user-agent", "GoldFlipPro/1.0");
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
      port: 5315,
      strictPort: true,
      host: "0.0.0.0",
    },
  };
});
