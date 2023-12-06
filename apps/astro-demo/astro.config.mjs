import { defineConfig } from "astro/config";

import react from "@astrojs/react";
import styleX from "vite-plugin-stylex";

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  vite: {
    plugins: [styleX()],
  },
});
