import { unstable_vitePlugin as remix } from "@remix-run/dev";
import { Plugin, defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import styleX from "vite-plugin-stylex";

export default defineConfig({
  plugins: [remix(), tsconfigPaths(), styleX() as Plugin],
});
