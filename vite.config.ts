import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import { fileURLToPath } from "node:url";
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [react(), VitePWA({ registerType: 'autoUpdate' })],
  resolve: { alias: { "@": fileURLToPath(new URL("/QuickScoutV3/src/", import.meta.url)) } },
  test: { include: ["src/**/*.test.ts"] },
});
