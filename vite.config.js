import { defineConfig } from "vite";

// Na GitHub Pages projekt jest pod https://user.github.io/NAZWA_REPO/ — ustaw VITE_BASE_PATH=/NAZWA_REPO/
// Workflow CI ustawia to automatycznie. Lokalnie zwykle zostaw "/".
const base = process.env.VITE_BASE_PATH ?? "/";

export default defineConfig({
  base,
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3456",
        changeOrigin: true,
      },
    },
  },
});
