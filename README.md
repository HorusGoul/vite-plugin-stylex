# vite-plugin-stylex

Vite plugin for StyleX

## Install the package

```bash
npm install --save-dev vite-plugin-stylex

# or

yarn add --dev vite-plugin-stylex

# or

pnpm add --save-dev vite-plugin-stylex
```

## Setup

1. Import the plugin in your `vite.config.ts` file:

```ts
// ... other imports

import styleX from "vite-plugin-stylex";

export default defineConfig({
  plugins: [react(), styleX()],
});
```

2. That's it! You can now use StyleX in your Vite project 😄

# Acknowledgments

- [@stylexjs/rollup-plugin](https://github.com/facebook/stylex/tree/main/packages/rollup-plugin) for the base implementation for this Vite plugin.
