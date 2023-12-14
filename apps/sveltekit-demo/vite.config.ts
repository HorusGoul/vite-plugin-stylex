import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import styleX from "vite-plugin-stylex";

export default defineConfig({
  plugins: [sveltekit(), styleX()],
});
