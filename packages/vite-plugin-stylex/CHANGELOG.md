# vite-plugin-stylex

## 0.8.2

### Patch Changes

- a5b5ae3: Fixes building projects that include assets and use LightningCSS. Fixes #60.

## 0.8.1

### Patch Changes

- 46c32cd: ?url import fix for Remix

## 0.8.0

### Minor Changes

- 41bc4f9: Apply Vite CSS processing and post-processing

  This enables minification and other optimizations for CSS files.

## 0.7.0

### Minor Changes

- 36291b7: Add support for react-strict-dom. Fixes #51.

  **`importSources`**
  We're exposing the `importSources` option to allow you to configure alternative import sources for `stylex`, like `react-strict-dom`.

  By default, we include `@stylexjs/stylex` as import source. If you want to use `css` from `react-strict-dom`, you can configure it like this:

  ```ts
  import { defineConfig } from "vite";
  import styleX from "vite-plugin-stylex";

  export default defineConfig({
    plugins: [
      styleX({
        importSources: [{ from: "react-strict-dom", as: "css" }],
      }),
    ],
  });
  ```

  Also, if we detect that you're using `react-strict-dom`, we'll automatically add it to the list of `libraries` for you, so you don't have to worry about it.

  **Deprecations:**

  - `stylexImports` option is deprecated. Use `importSources` instead (you should be able to just replace `stylexImports` with `importSources` in your config).

## 0.6.0

### Minor Changes

- 2f0f5af: Add `libraries` configuration option

### Patch Changes

- f44405a: Support Remix Vite plugin stable

## 0.5.1

### Patch Changes

- 5c3523a: Make vite-plugin-stylex run in production mode only when the command is "build". Fixes #42.
- 0dc6fb9: Resolve Vite aliases. Allow users to specify aliases through StyleX plugin options as well. Fixes #41.

## 0.5.0

### Minor Changes

- d81aad6: Support @stylexjs/stylex 0.5.1. Fixes #24, #29, #31.

## 0.4.1

### Patch Changes

- e66e8a8: Fix importing external StyleX files like @stylexjs/open-props. Fixes #23

## 0.4.0

### Minor Changes

- 05cf519: Add support for Qwik

## 0.3.1

### Patch Changes

- 2ebc08f: Use posix paths for the href of the injected StyleX stylesheet to fix a Windows issue

## 0.3.0

### Minor Changes

- 35daa75: Add SvelteKit support

## 0.2.0

### Minor Changes

- d5e2642: **BREAKING CHANGE**: New approach for using StyleX with Remix

## 0.1.0

### Minor Changes

- 01cc461: Remix Vite Support

## 0.0.2

### Patch Changes

- 96fb721: Some package.json changes

## 0.0.1

### Patch Changes

- 741f79c: Initial release
