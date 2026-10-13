import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

function serveOrtRuntime(): Plugin {
  const root = path.resolve("public/ort");
  return {
    name: "serve-ort-runtime",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split("?")[0] ?? "";
        if (!url.startsWith("/ort/")) return next();
        const file = path.join(root, path.basename(url));
        if (!file.startsWith(root) || !fs.existsSync(file)) return next();
        res.setHeader("Content-Type", file.endsWith(".wasm") ? "application/wasm" : "text/javascript");
        fs.createReadStream(file).pipe(res);
      });
    },
  };
}

export default defineConfig({
  plugins: [serveOrtRuntime(), react()],
  optimizeDeps: {
    exclude: ["onnxruntime-web"],
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:8000",
    },
  },
});
