// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    port: 5300,
    proxy: {
      // ✅ API 요청을 Vercel dev 서버로 프록시
      "/api": {
        target: "http://localhost:3001", // Vercel dev 포트
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on("error", (err, _req, _res) => {
            console.log("📡 API 프록시 오류:", err.message);
          });
          proxy.on("proxyReq", (proxyReq, req, _res) => {
            console.log(
              `📡 프록시 요청: ${req.method} ${req.url} → ${proxyReq.path}`
            );
          });
        },
      },
      "/ws-proxy": {
        target: "wss://api.upbit.com",
        ws: true,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ws-proxy/, ""),
      },
    },
  },
});
