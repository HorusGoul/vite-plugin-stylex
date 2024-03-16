import { vitePlugin as remix } from "@remix-run/dev";
import { installGlobals } from "@remix-run/node";
import { Plugin, defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import styleX from "vite-plugin-stylex";

installGlobals();

const OVERRIDE_BUILD_DIRECTORY = process.env.OVERRIDE_BUILD_DIRECTORY;

export default defineConfig({
  plugins: [
    remix({
      buildDirectory: OVERRIDE_BUILD_DIRECTORY || "build",
      serverBuildFile: "index.mjs",
    }),
    tsconfigPaths(),
    styleX() as Plugin,
  ],
});
