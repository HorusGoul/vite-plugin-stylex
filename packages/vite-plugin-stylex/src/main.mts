import type { Plugin, ViteDevServer, Rollup, AliasOptions } from "vite";
import * as babel from "@babel/core";
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

  /**
   * Whether to use CSS layers for StyleX styles.
   *
   * @default true
   */
  useCSSLayers?: boolean;
}

const STYLEX_REPLACE_RULE = "@stylex stylesheet;";

export default function styleXVitePlugin({
  unstable_moduleResolution = { type: "commonJS", rootDir: process.cwd() },
  stylexImports = ["@stylexjs/stylex"],
  libraries: inputLibraries = [],
  useCSSLayers = true,
  ...options
}: Omit<StyleXVitePluginOptions, "dev" | "fileName"> = {}) {
  const libraries = ["@stylexjs/open-props", ...inputLibraries];

  let stylexRules: Record<string, any> = {};
  let isProd = false;
  let cssPlugins: readonly Plugin[] = [];
  let lastStyleXCSS: {
    id: number;
    css: string;
  } = {
    id: 0,
    css: "",
  };
  let modulesToInvalidate = new Map<string, string>();
  let server: ViteDevServer;
  let aliases: Record<string, string[]> = {};
  let reloadCount = 0;

  async function reloadStyleX() {
    reloadCount++;

    if (!server || modulesToInvalidate.size === 0) {
      return;
    }

    for (const [id] of modulesToInvalidate.entries()) {
      const module = server.moduleGraph.getModuleById(id);

      if (!module) {
        return;
      }

      server.moduleGraph.invalidateModule(module);
      await server.reloadModule(module);
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
      rules.filter(Boolean),
      useCSSLayers
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

  // Transform the generated CSS to include the StyleX rules and apply
  // the Vite CSS plugin pipeline.
  async function transformWithPlugins(
    context: Rollup.PluginContext,
    id: string,
    css: string
  ) {
    let transformPluginContext = {
      ...context,
      getCombinedSourcemap: () => {
        throw new Error("getCombinedSourcemap not implemented");
      },
    };

    css = css.replace(STYLEX_REPLACE_RULE, compileStyleX());

    for (let plugin of cssPlugins) {
      if (!plugin.transform) continue;
      const transformHandler =
        "handler" in plugin.transform!
          ? plugin.transform.handler
          : plugin.transform!;

      try {
        // Directly call the plugin's transform function to process the
        // generated CSS. In build mode, this updates the chunks later used to
        // generate the bundle. In serve mode, the transformed souce should be
        // applied in transform.
        let result = await transformHandler.call(
          transformPluginContext,
          css,
          id
        );
        if (!result) continue;
        if (typeof result === "string") {
          css = result;
        } else if (result.code) {
          css = result.code;
        }
      } catch (e) {
        console.error(
          `Error running ${plugin.name} on Tailwind CSS output. Skipping.`
        );
      }
    }
    return css;
  }

  return [
    {
      name: "vite-plugin-stylex:pre",
      enforce: "pre",

      configResolved(config) {
        isProd = config.command === "build";

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
            const alias = viteAlias.find.concat("/*");
            aliases[alias] = [path.join(viteAlias.replacement, "*")];
          }
        }

        // Apply the vite:css plugin to generated CSS for transformations like
        // URL path rewriting and image inlining.
        //
        // In build mode, since renderChunk runs after all transformations, we
        // need to also apply vite:css-post.
        cssPlugins = config.plugins.filter((plugin) =>
          [
            "vite:css",
            ...(config.command === "build" ? ["vite:css-post"] : []),
          ].includes(plugin.name)
        );
      },

      buildStart() {
        stylexRules = {};
      },

      configureServer(_server) {
        server = _server;
      },

      async transform(inputCode, id, { ssr: isSSR = false } = {}) {
        if (/\.css/.test(id) && inputCode.includes(STYLEX_REPLACE_RULE)) {
          modulesToInvalidate.set(id, inputCode);

          if (server) {
            if (!isSSR) {
              await server?.waitForRequestsIdle?.(id);
            }

            return inputCode.replace(STYLEX_REPLACE_RULE, compileStyleX());
          }
        }
      },
    },
    {
      name: "vite-plugin-stylex",

      shouldTransformCachedModule({ id, meta }) {
        stylexRules[id] = meta.stylex;
        return false;
      },

      async transform(inputCode, id) {
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
                  runtimeInjection: false,
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

      // renderChunk runs in the bundle generation stage after all transforms.
      // We must run before `enforce: post` so the updated chunks are picked up
      // by vite:css-post.
      async renderChunk() {
        for (let [id, code] of modulesToInvalidate.entries()) {
          await transformWithPlugins(this, id, code);
        }
      },
    },
  ] satisfies Plugin[];
}
