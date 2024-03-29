import type { Plugin, ViteDevServer, Rollup, AliasOptions } from "vite";
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
import { createRequire } from "module";
import { satisfies } from "compare-versions";

const require = createRequire(import.meta.url);

const stylexPkg =
  require("@stylexjs/stylex/package.json") as typeof import("@stylexjs/stylex/package.json");

const pluginPkg =
  // @ts-ignore - no need to include package.json in the output
  require("../package.json") as typeof import("../package.json");

const stylePackageVersion = stylexPkg.version;
const pluginPackagePeerVersionRange =
  pluginPkg.peerDependencies["@stylexjs/stylex"];

interface StyleXVitePluginOptions
  extends Partial<
    Pick<
      StyleXOptions,
      | "test"
      | "classNamePrefix"
      | "unstable_moduleResolution"
      | "useRemForFontSize"
      | "importSources"
    >
  > {
  /**
   * @deprecated Use `importSources` instead. You should be able to just replace `stylexImports` with `importSources` in your config.
   */
  stylexImports?: string[];
  /**
   * A map of aliases to their respective paths.
   *
   * @example
   *
   * ```ts
   * {
   *   "@/*": [path.resolve(__dirname, "src", "*")]
   * }
   * ```
   *
   * Ensure that the paths are absolute and that you include the `*` at the end of the path.
   */
  aliases?: {
    [alias: string]: string[];
  };

  /**
   * Define external modules that export StyleX styles.
   *
   * This is useful when you want to pull UI tokens or components from a separate package, like a Design System.
   *
   * @default ["@stylexjs/open-props"]
   */
  libraries?: string[];
}

const STYLEX_REPLACE_RULE = "@stylex stylesheet;";

type Framework = "remix" | "sveltekit" | "qwik" | "none";

export default function styleXVitePlugin({
  unstable_moduleResolution = { type: "commonJS", rootDir: process.cwd() },
  stylexImports = ["@stylexjs/stylex"],
  libraries: inputLibraries = [],
  ...options
}: Omit<StyleXVitePluginOptions, "dev" | "fileName"> = {}): Plugin {
  const libraries = ["@stylexjs/open-props", ...inputLibraries];

  let stylexRules: Record<string, any> = {};
  let isProd = false;
  let isSSR = false;
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
  let modulesToInvalidate = new Set<string>();

  let server: ViteDevServer;
  let framework: Framework = "none";
  let aliases: Record<string, string[]> = {};

  let reloadCount = 0;
  function reloadStyleX() {
    reloadCount++;

    if (!server || modulesToInvalidate.size === 0) {
      return;
    }

    for (const id of modulesToInvalidate) {
      const module = server.moduleGraph.getModuleById(id);

      if (!module) {
        return;
      }

      server.moduleGraph.invalidateModule(module);
      server.reloadModule(module);
    }
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

  let warned = false;
  function warnIfVersionMismatch(ctx: Rollup.TransformPluginContext) {
    if (warned) {
      return;
    }

    if (!satisfies(stylePackageVersion, pluginPackagePeerVersionRange)) {
      ctx.warn(
        `The installed version of @stylexjs/styles might not be compatible with this version of vite-plugin-stylex, if you run into any issues please check for a newer version of either package, or open an issue in the vite-plugin-stylex repository.
        
- Expected version range of @stylexjs/stylex by vite-plugin-stylex: ${pluginPackagePeerVersionRange}
- Installed version of @stylexjs/stylex: ${stylePackageVersion}
        `
      );
    }

    warned = true;
  }

  const styleXRelatedModules = new Set([...stylexImports]);
  const importSourcesSet = new Set<StyleXOptions["importSources"][number]>([
    ...stylexImports,
  ]);

  if (options.importSources) {
    for (const source of options.importSources) {
      if (typeof source === "string") {
        styleXRelatedModules.add(source);
      } else {
        styleXRelatedModules.add(source.from);
      }

      importSourcesSet.add(source);
    }
  }

  options.importSources = Array.from(importSourcesSet);

  const hasReactStrictDom = styleXRelatedModules.has("react-strict-dom");

  if (hasReactStrictDom) {
    libraries.push("react-strict-dom");
  }

  let viteCssPlugin: Plugin;
  let viteCssPostPlugin: Plugin;

  return {
    name: "vite-plugin-stylex",

    config(config) {
      assetsDir = config.build?.assetsDir || "assets";
      publicBasePath = config.base || "/";
    },

    configResolved(config) {
      isProd = config.command === "build";
      isSSR = !!config.build.ssr;

      config.optimizeDeps.exclude = config.optimizeDeps.exclude || [];
      config.ssr.optimizeDeps.exclude = config.ssr.optimizeDeps.exclude || [];
      config.ssr.noExternal = Array.isArray(config.ssr.noExternal)
        ? config.ssr.noExternal
        : [];

      config.optimizeDeps.exclude.push(...libraries);
      config.ssr.optimizeDeps.exclude.push(...libraries);
      config.ssr.noExternal.push(...libraries);

      for (const viteAlias of config.resolve.alias) {
        if (typeof viteAlias.find === "string") {
          // We need to convert Vite format to this plugin's format:
          // Example: @ -> @/*
          const alias = path.join(viteAlias.find, "*");
          aliases[alias] = [path.join(viteAlias.replacement, "*")];
        }
      }

      for (const plugin of config.plugins) {
        if (!plugin || !("name" in plugin)) {
          continue;
        }

        const name = plugin.name;

        if (name === "vite:css") {
          viteCssPlugin = plugin;
        }

        if (name === "vite:css-post") {
          viteCssPostPlugin = plugin;
        }
      }

      for (const plugin of config.plugins) {
        if (!plugin || !("name" in plugin)) {
          continue;
        }

        const name = plugin.name;

        if (name.includes("remix")) {
          framework = "remix";
          break;
        }

        if (name.includes("sveltekit")) {
          framework = "sveltekit";
          break;
        }

        if (name.includes("qwik")) {
          framework = "qwik";
          break;
        }
      }
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

    async generateBundle(_, bundle) {
      let stylexCSS = compileStyleX();

      if (
        typeof viteCssPlugin.transform === "function" &&
        typeof viteCssPostPlugin.transform === "function"
      ) {
        const cssResult = await viteCssPlugin.transform?.call(
          this as Rollup.TransformPluginContext,
          stylexCSS,
          "stylex.css"
        );
        const cssResultCode =
          typeof cssResult === "string"
            ? cssResult
            : !!cssResult
            ? cssResult.code
            : null;

        if (cssResultCode) {
          const cssPostResult = await viteCssPostPlugin.transform?.call(
            this as Rollup.TransformPluginContext,
            cssResultCode,
            "stylex.css?inline-css&used"
          );

          const cssPostResultCode =
            typeof cssPostResult === "string"
              ? cssPostResult
              : !!cssPostResult
              ? cssPostResult.code
              : null;

          try {
            const css = cssPostResultCode
              ? JSON.parse(
                  cssPostResultCode.replace("export default", "").trim()
                ).trim()
              : null;

            stylexCSS = css;
          } catch {}
        }
      }

      const hashContents = (contents: string) =>
        crypto.createHash("sha1").update(contents).digest("hex").slice(0, 8);

      if (framework === "remix") {
        const values = Object.values(bundle);

        const cssFilesWithStyleX = values.filter(
          (b): b is Rollup.OutputAsset =>
            b.type === "asset" &&
            b.fileName.endsWith(".css") &&
            b.source.toString().includes(STYLEX_REPLACE_RULE)
        );

        if (cssFilesWithStyleX.length === 0) {
          this.warn(
            "Could not find any CSS files with the stylex comment. Did you import styles in the root.tsx of your Remix app?"
          );
          return;
        }

        for (const cssFile of cssFilesWithStyleX) {
          let relatedJsChunk = values.find(
            (b): b is Rollup.OutputChunk =>
              b.type === "chunk" &&
              !!b.viteMetadata?.importedCss.has(cssFile.fileName)
          );
          let shouldReplaceAssetUrl = false;

          if (!relatedJsChunk) {
            relatedJsChunk = values.find(
              (b): b is Rollup.OutputChunk =>
                b.type === "chunk" && b.code.includes(cssFile.fileName)
            );

            if (!relatedJsChunk) {
              this.error(
                `Could not find related JS chunk for CSS file ${cssFile.fileName}.`
              );
            }

            shouldReplaceAssetUrl = true;
          }

          let css = cssFile.source.toString();
          css = css.replace(STYLEX_REPLACE_RULE, stylexCSS);

          const hash = hashContents(css);

          const dir = path.dirname(cssFile.fileName);
          const basename = path.basename(cssFile.fileName);
          delete bundle[cssFile.fileName];

          // Remix uses dashes as separator for CSS file names.
          // If we have `layout-HASH.css` we can replace the HASH part with the new hash.
          const newCssFileName = path.join(
            dir,
            basename.replace(/\-([^.]+)\.css$/, `-${hash}.css`)
          );

          if (!isSSR) {
            // Remove CSS assets from the SSR build
            relatedJsChunk?.viteMetadata?.importedCss?.delete(cssFile.fileName);
            this.emitFile({
              ...cssFile,
              fileName: newCssFileName,
              source: css,
            });
          }

          if (shouldReplaceAssetUrl) {
            const newJsChunkCode = relatedJsChunk.code.replaceAll(
              cssFile.fileName,
              newCssFileName
            );
            const hash = hashContents(newJsChunkCode);
            const dir = path.dirname(relatedJsChunk.fileName);
            const basename = path.basename(relatedJsChunk.fileName);
            const newJsChunkFileName = path.join(
              dir,
              basename.replace(/\-([^.]+)\.js$/, `-${hash}.js`)
            );

            delete bundle[relatedJsChunk.fileName];
            bundle[newJsChunkFileName] = {
              ...relatedJsChunk,
              fileName: newJsChunkFileName,
              code: newJsChunkCode,
            };
          } else {
            relatedJsChunk?.viteMetadata?.importedCss?.delete(cssFile.fileName);
            relatedJsChunk?.viteMetadata?.importedCss?.add(newCssFileName);
          }
        }

        return;
      }

      if (framework === "sveltekit") {
        const values = Object.values(bundle);

        const cssFilesWithStyleX = values.filter(
          (b): b is Rollup.OutputAsset =>
            b.type === "asset" &&
            b.fileName.endsWith(".css") &&
            b.source.toString().includes(STYLEX_REPLACE_RULE)
        );

        if (cssFilesWithStyleX.length === 0) {
          this.warn(
            "Could not find any CSS files with the stylex comment. Did you import styles in the root of your SvelteKit app?"
          );
          return;
        }

        for (const cssFile of cssFilesWithStyleX) {
          const relatedJsChunk = values.find(
            (b): b is Rollup.OutputChunk =>
              b.type === "chunk" &&
              !!b.viteMetadata?.importedCss.has(cssFile.fileName)
          );

          if (!relatedJsChunk) {
            this.error(
              `Could not find related JS chunk for CSS file ${cssFile.fileName}.`
            );
            return;
          }

          let css = cssFile.source.toString();
          css = css.replace(STYLEX_REPLACE_RULE, stylexCSS);

          const hash = hashContents(css);

          const dir = path.dirname(cssFile.fileName);
          const basename = path.basename(cssFile.fileName);
          delete bundle[cssFile.fileName];

          // Svelte uses dots as separator for CSS file names.
          // If we have `layout.HASH.css` we can replace the HASH part with the new hash.
          const newCssFileName = path.join(
            dir,
            basename.replace(/\.([^.]+)\.css$/, `.${hash}.css`)
          );

          this.emitFile({
            ...cssFile,
            fileName: newCssFileName,
            source: css,
          });

          relatedJsChunk.viteMetadata?.importedCss?.delete(cssFile.fileName);
          relatedJsChunk.viteMetadata?.importedCss?.add(newCssFileName);
        }

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
      if (framework === "qwik" && isProd && /\.css/.test(id)) {
        // For Qwik, the SPA behavior works fine,
        // but we need to remove the stylex comment from all CSS files
        // during builds, otherwise we'll emit it.
        return inputCode.replace(STYLEX_REPLACE_RULE, "");
      }

      if (
        !isProd &&
        /\.css/.test(id) &&
        inputCode.includes(STYLEX_REPLACE_RULE)
      ) {
        modulesToInvalidate.add(id);
        return inputCode.replace(STYLEX_REPLACE_RULE, compileStyleX());
      }

      if (
        !Array.from(styleXRelatedModules).some(
          (importName) =>
            inputCode.includes(`"${importName}"`) ||
            inputCode.includes(`'${importName}'`)
        )
      ) {
        return;
      }

      warnIfVersionMismatch(this);

      const isCompileMode = isProd || isSSR || framework !== "none";
      const dir = path.dirname(id);
      const filename = path.basename(id).split("?")[0];
      const filePath = path.join(dir, filename);

      const result = await babel
        .transformAsync(inputCode, {
          babelrc: false,
          filename: filePath,
          plugins: [
            /\.jsx?/.test(path.extname(id))
              ? flowSyntaxPlugin
              : typescriptSyntaxPlugin,
            jsxSyntaxPlugin,
            hasReactStrictDom ? require("react-strict-dom/babel") : null,
            [
              stylexBabelPlugin,
              {
                dev: !isProd,
                unstable_moduleResolution,
                runtimeInjection: !isCompileMode,
                aliases: {
                  ...options.aliases,
                  ...aliases,
                },
                ...options,
              },
            ],
          ].filter((plugin) => plugin !== null),
        })
        .catch((error) => {
          if (
            error.message.includes(
              "Only static values are allowed inside of a stylex.create() call."
            )
          ) {
            this.error(`StyleX Error: ${error.message}
  
💡 If you're importing StyleX tokens or styles from another file using aliases, make sure to define those in your Vite config or in the StyleX Plugin options.
`);
          }

          throw error;
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

      // In Windows, we need to ensure we use posix paths to generate the correct URL for the <link> tag.
      const publicPath = path.posix.join(
        publicBasePath,
        fileName.replace(/\\/g, "/")
      );

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
