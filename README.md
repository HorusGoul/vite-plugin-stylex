# vite-plugin-stylex

Unofficial Vite plugin for StyleX

## Install the package

```bash
npm install --save-dev vite-plugin-stylex

# or

yarn add --dev vite-plugin-stylex

# or

pnpm add --save-dev vite-plugin-stylex
```

## Setup

For a basic SPA setup, you only need to add the plugin to your Vite config:

```ts
// ... other imports

import styleX from "vite-plugin-stylex";

export default defineConfig({
  plugins: [react(), styleX()],
});
```

### Extra steps for frameworks or SSR

Other setups may require extra steps to get StyleX working. For example, Remix requires you to import the CSS output in your root component.

#### Remix

1. Create an index.css file in your app directory.
2. Include the following:

```css
@stylex stylesheet;

/* You can use other styles here */
```

3. Import the CSS file in your root component:

```tsx
import "./index.css";
```

#### Other Frameworks

It's possible that other frameworks don't work out of the box. If you find that this is the case, please open an issue.

# Acknowledgments

- [@stylexjs/rollup-plugin](https://github.com/facebook/stylex/tree/main/packages/rollup-plugin) for the base implementation for this Vite plugin.
