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

const STYLEX_REPLACE_RULE = "@stylex stylesheet;";

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
  let moduleToInvalidate: string | null = null;

  let server: ViteDevServer;

  let hasRemix = false;

  let reloadCount = 0;
  function reloadStyleX() {
    reloadCount++;

    if (!server || !moduleToInvalidate) {
      return;
    }

    const module = server.moduleGraph.getModuleById(moduleToInvalidate);

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
        config.plugins
          ?.flat()
          .some((p) => p && "name" in p && p.name.includes("remix")) ?? false;
    },

    buildStart() {
      stylexRules = {};
    },

    configureServer(_server) {
      server = _server;
    },

    shouldTransformCachedModule({ id, meta }) {
      stylexRules[id] = meta.stylex;
      return false;
    },

    generateBundle(_, bundle) {
      const stylexCSS = compileStyleX();

      const hashContents = (contents: string) =>
        crypto.createHash("sha1").update(contents).digest("hex").slice(0, 8);

      if (hasRemix) {
        const rootCssFile = Object.values(bundle).find(
          (b) => b.name === "root.css"
        );

        if (!rootCssFile) {
          this.warn(
            "Could not find root.css file. Did you import styles in the root of your Remix app?"
          );
          return;
        }

        if (rootCssFile.type !== "asset") {
          this.error("root.css file is not an asset.");
          return;
        }

        let rootCss = rootCssFile.source.toString();
        rootCss = rootCss.replace(STYLEX_REPLACE_RULE, stylexCSS);

        const hash = hashContents(rootCss);

        const dir = path.dirname(rootCssFile.fileName);
        delete bundle[rootCssFile.fileName];
        const newCssFileName = path.join(dir, `root-${hash}.css`);

        this.emitFile({
          ...rootCssFile,
          fileName: newCssFileName,
          source: rootCss,
        });

        const rootJsFile = Object.values(bundle).find((b) => b.name === "root");

        if (rootJsFile?.type !== "chunk") {
          this.error("Could not find root chunk.");
          return;
        }

        rootJsFile.viteMetadata?.importedCss?.delete(rootCssFile.fileName);
        rootJsFile.viteMetadata?.importedCss?.add(newCssFileName);
        return;
      }

      // SPA behavior
      const hash = hashContents(stylexCSS);

      outputFileName = path.join(assetsDir, `stylex.${hash}.css`);

      this.emitFile({
        fileName: outputFileName,
        source: stylexCSS,
        type: "asset",
        name: "stylex.css",
      });
    },

    async transform(inputCode, id, { ssr: isSSR } = {}) {
      if (
        !isProd &&
        id.endsWith(".css") &&
        inputCode.includes(STYLEX_REPLACE_RULE)
      ) {
        if (moduleToInvalidate && moduleToInvalidate !== id) {
          this.error("Multiple CSS imports with the stylex comment detected.");
        }

        moduleToInvalidate = id;
        return inputCode.replace(STYLEX_REPLACE_RULE, compileStyleX());
      }

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
