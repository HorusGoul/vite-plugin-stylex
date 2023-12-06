import type { Plugin } from "vite";
import babel from "@babel/core";
import stylexBabelPlugin, {
  Options as StyleXOptions,
} from "@stylexjs/babel-plugin";

// @ts-ignore
import flowSyntaxPlugin from "@babel/plugin-syntax-flow";
// @ts-ignore
import jsxSyntaxPlugin from "@babel/plugin-syntax-jsx";
// @ts-ignore
import typescriptSyntaxPlugin from "@babel/plugin-syntax-typescript";
import path from "path";
import crypto from "crypto";

interface StyleXVitePluginOptions
  extends Partial<
    Pick<
      StyleXOptions,
      | "test"
      | "classNamePrefix"
      | "unstable_moduleResolution"
      | "useRemForFontSize"
    >
  > {}

export default function styleXVitePlugin({
  unstable_moduleResolution = { type: "commonJS", rootDir: process.cwd() },
  ...options
}: Omit<StyleXVitePluginOptions, "dev" | "fileName"> = {}): Plugin {
  let stylexRules: Record<string, any> = {};
  let isProd = false;
  let assetsDir = "assets";
  let publicBasePath = "/";

  let outputFileName: string | null = null;

  return {
    name: "vite-plugin-stylex",

    config(config, env) {
      isProd = env.mode === "production" || config.mode === "production";
      assetsDir = config.build?.assetsDir || "assets";
      publicBasePath = config.base || "/";
    },

    buildStart() {
      stylexRules = {};
    },

    shouldTransformCachedModule({ id, meta }) {
      stylexRules[id] = meta.stylex;
      return false;
    },

    generateBundle() {
      const rules = Object.values(stylexRules).flat();

      if (rules.length > 0) {
        // @ts-ignore
        const collectedCSS = stylexBabelPlugin.processStylexRules(rules, true);

        const hash = crypto
          .createHash("sha1")
          .update(collectedCSS)
          .digest("hex")
          .slice(0, 8);

        outputFileName = path.join(assetsDir, `stylex.${hash}.css`);

        this.emitFile({
          fileName: outputFileName,
          source: collectedCSS,
          type: "asset",
        });
      }
    },

    async transform(inputCode, id) {
      this.setAssetSource;

      const isJSLikeFile =
        id.endsWith(".js") ||
        id.endsWith(".jsx") ||
        id.endsWith(".ts") ||
        id.endsWith(".tsx");

      if (!isJSLikeFile) {
        return;
      }

      const result = await babel.transformAsync(inputCode, {
        babelrc: false,
        filename: id,
        plugins: [
          /\.jsx?/.test(path.extname(id))
            ? flowSyntaxPlugin
            : typescriptSyntaxPlugin,
          jsxSyntaxPlugin,
          [
            stylexBabelPlugin,
            { dev: !isProd, unstable_moduleResolution, ...options },
          ],
        ],
      });

      if (!result) {
        return;
      }

      const { code, map, metadata } = result;

      // @ts-ignore
      if (isProd && metadata?.stylex != null && metadata?.stylex.length > 0) {
        // @ts-ignore
        stylexRules[id] = metadata.stylex;
      }

      return { code: code ?? undefined, map, meta: metadata };
    },

    transformIndexHtml(html, ctx) {
      if (!isProd || !outputFileName) {
        return html;
      }

      const asset = ctx.bundle?.[outputFileName];

      if (!asset) {
        return html;
      }

      const { fileName } = asset;
      const publicPath = path.join(publicBasePath, fileName);

      return [
        {
          tag: "link",
          attrs: {
            rel: "stylesheet",
            href: publicPath,
          },
          injectTo: "head",
        },
      ];
    },
  };
}
