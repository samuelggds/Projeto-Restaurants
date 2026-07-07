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

          if (id.includes("react") || id.includes("scheduler")) {
            return "react-vendor";
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
});
