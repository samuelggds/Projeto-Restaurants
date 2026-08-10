/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }

          if (
            id.includes("react-router") ||
            id.includes("@remix-run") ||
            id.includes("history")
          ) {
            return "router-vendor";
          }

          if (
            id.includes("react-toastify") ||
            id.includes("react-qr-code") ||
            id.includes("lucide-react")
          ) {
            return "react-ui-vendor";
          }

          if (
            id.includes("react-dom") ||
            id.includes("react/") ||
            id.includes("scheduler")
          ) {
            return "react-core-vendor";
          }

          if (id.includes("styled-components")) {
            return "styled-vendor";
          }

          if (id.includes("socket.io-client")) {
            return "socket-vendor";
          }

          if (id.includes("@sentry")) {
            return "sentry-vendor";
          }

          return "vendor";
        },
      },
    },
  },
  server: {
    host: true,
    allowedHosts: true,
  },
  test: {
    globals: true,
    environment: "jsdom",
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "src/main.tsx", "src/vite-env.d.ts"],
    },
  },
});
