---
"vite-plugin-stylex": minor
---

Add support for react-strict-dom. Fixes #51.

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
