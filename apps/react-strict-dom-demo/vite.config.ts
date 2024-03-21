import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import styleX from "vite-plugin-stylex";
import { resolve } from "node:path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    styleX({
      importSources: [{ from: "react-strict-dom", as: "css" }],
    }),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
