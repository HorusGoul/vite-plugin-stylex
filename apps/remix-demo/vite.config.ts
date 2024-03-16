import { vitePlugin as remix } from "@remix-run/dev";
import { installGlobals } from "@remix-run/node";
import { Plugin, defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import styleX from "vite-plugin-stylex";

installGlobals();

const OVERRIDE_BUILD_DIRECTORY = process.env.OVERRIDE_BUILD_DIRECTORY;
const OVERRIDE_SERVER_BUILD_FILE = process.env.OVERRIDE_SERVER_BUILD_FILE;

export default defineConfig({
  plugins: [
    remix({
      buildDirectory: OVERRIDE_BUILD_DIRECTORY || "build",
      serverBuildFile: OVERRIDE_SERVER_BUILD_FILE || "build/server/index.mjs",
    }),
    tsconfigPaths(),
    styleX() as Plugin,
  ],
});
