import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    // Asset producers replace large binary files while the app is running.
    // Watching those files can hit Windows file locks and crash the dev server.
    watch: {
      ignored: [
        "**/assets/**",
        "**/public/**",
        "**/qa/**",
        "**/test-results/**",
        "**/tools/**",
      ],
    },
  },
  build: {
    rolldownOptions: {
      output: {
        manualChunks: (id) =>
          id.includes("/node_modules/three/") ? "three" : undefined,
      },
    },
  },
});
