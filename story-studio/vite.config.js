import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The local server (server/index.js) runs on 8787 and handles voices, AI writing and MP4 conversion.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { "/api": { target: "http://localhost:8787", changeOrigin: true } } },
});
