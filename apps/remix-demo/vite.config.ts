import { unstable_vitePlugin as remix } from "@remix-run/dev";
import { Plugin, defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import styleX from "vite-plugin-stylex";

const OVERRIDE_ASSETS_BUILD_DIRECTORY = process.env.ASSETS_BUILD_DIRECTORY;
const OVERRIDE_SERVER_BUILD_PATH = process.env.SERVER_BUILD_PATH;

export default defineConfig({
  plugins: [
    remix({
      assetsBuildDirectory: OVERRIDE_ASSETS_BUILD_DIRECTORY,
      serverBuildPath: OVERRIDE_SERVER_BUILD_PATH,
    }),
    tsconfigPaths(),
    styleX() as Plugin,
  ],
});
