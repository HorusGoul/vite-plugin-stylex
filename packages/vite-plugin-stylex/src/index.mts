import type { Plugin, ViteDevServer } from "vite";
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
  > {
  stylexImports?: string[];
}

export default function styleXVitePlugin({
  unstable_moduleResolution = { type: "commonJS", rootDir: process.cwd() },
  stylexImports = ["@stylexjs/stylex"],
  ...options
}: Omit<StyleXVitePluginOptions, "dev" | "fileName"> = {}): Plugin {
  let stylexRules: Record<string, any> = {};
  let isProd = false;
  let assetsDir = "assets";
  let publicBasePath = "/";
  let lastStyleXCSS: {
    id: number;
    css: string;
  } = {
    id: 0,
    css: "",
  };

  let outputFileName: string | null = null;

  const VIRTUAL_STYLEX_MODULE_ID = "virtual:stylex.css";
  const RESOLVED_STYLEX_MODULE_ID = "\0" + VIRTUAL_STYLEX_MODULE_ID;

  let server: ViteDevServer;

  let hasRemix = false;

  let reloadCount = 0;
  function reloadStyleX() {
    reloadCount++;

    if (!server) {
      return;
    }

    const module = server.moduleGraph.getModuleById(RESOLVED_STYLEX_MODULE_ID);

    if (!module) {
      return;
    }

    server.moduleGraph.invalidateModule(module);
    server.reloadModule(module);
  }

  function compileStyleX(): string {
    if (reloadCount === lastStyleXCSS.id) {
      return lastStyleXCSS.css;
    }

    const rules = Object.values(stylexRules).flat();

    if (rules.length === 0) {
      return "";
    }

    // @ts-ignore
    const stylexCSS = stylexBabelPlugin.processStylexRules(
      rules,
      true
    ) as string;

    lastStyleXCSS = {
      id: reloadCount,
      css: stylexCSS,
    };

    return stylexCSS;
  }

  return {
    name: "vite-plugin-stylex",

    config(config, env) {
      isProd = env.mode === "production" || config.mode === "production";
      assetsDir = config.build?.assetsDir || "assets";
      publicBasePath = config.base || "/";
      hasRemix =
        config.plugins?.flat().some((p) => {
          if (p && "name" in p) {
            return p.name.includes("remix") || p.name.includes("qwik");
          }
        }) ?? false;
    },

    buildStart() {
      stylexRules = {};
    },

    configureServer(_server) {
      server = _server;
    },

    resolveId(id) {
      if (id === VIRTUAL_STYLEX_MODULE_ID) {
        return RESOLVED_STYLEX_MODULE_ID;
      }
    },

    load(id) {
      if (id === RESOLVED_STYLEX_MODULE_ID) {
        return compileStyleX();
      }
    },

    shouldTransformCachedModule({ id, meta }) {
      stylexRules[id] = meta.stylex;
      return false;
    },

    generateBundle() {
      const stylexCSS = compileStyleX();

      const hash = crypto
        .createHash("sha1")
        .update(stylexCSS)
        .digest("hex")
        .slice(0, 8);

      outputFileName = path.join(assetsDir, `stylex.${hash}.css`);

      this.emitFile({
        fileName: outputFileName,
        source: stylexCSS,
        type: "asset",
      });
    },

    async transform(inputCode, id, { ssr: isSSR } = {}) {
      if (!stylexImports.some((importName) => inputCode.includes(importName))) {
        return;
      }

      const isJSLikeFile =
        id.endsWith(".js") ||
        id.endsWith(".jsx") ||
        id.endsWith(".ts") ||
        id.endsWith(".tsx");

      if (!isJSLikeFile) {
        return;
      }

      const isCompileMode = isProd || isSSR || hasRemix;

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
            {
              dev: !isProd,
              unstable_moduleResolution,
              importSources: stylexImports,
              runtimeInjection: !isCompileMode,
              ...options,
            },
          ],
        ],
      });

      if (!result) {
        return;
      }

      const { code, map, metadata } = result;

      if (
        isCompileMode &&
        // @ts-ignore
        metadata?.stylex != null &&
        // @ts-ignore
        metadata?.stylex.length > 0
      ) {
        // @ts-ignore
        stylexRules[id] = metadata.stylex;
        reloadStyleX();
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
