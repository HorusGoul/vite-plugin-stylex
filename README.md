# vite-plugin-stylex

Unofficial Vite plugin for StyleX

> [!WARNING]  
> This plugin is in early development and may not work as expected. Please report any issues you find.

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

- [Remix](#remix)
- [SvelteKit](#sveltekit)
- [Vue](#vue)
- [Qwik](#qwik)

#### Remix

1. Create an `index.css` file in your `app` directory.
2. Include the following:

```css
@stylex stylesheet;

/* You can use other styles here */
```

3. Import the CSS file in your `app/root.tsx` component:

```tsx
import "./index.css";
```

#### SvelteKit

Create a `+layout.svelte` file in your `src/routes` directory:

```svelte
<slot />

<style>
  @stylex stylesheet;
</style>
```

#### Vue

Vue doesn't require any extra setup steps, but here's an example of how you can use StyleX in your Vue components:

```html
<script lang="ts" setup>
  import stylex from "@stylexjs/stylex";
</script>

<script lang="ts">
  // StyleX styles need to be defined at the top level of the module
  // so that StyleX can extract them.
  const styles = stylex.create({
    root: {
      backgroundColor: "white",
      borderRadius: 8,
      padding: 16,
      boxShadow: "0 0 16px rgba(0, 0, 0, 0.1)",
    },
  });
</script>

<template>
  <div :class="stylex(styles.root)">
    <slot />
  </div>
</template>
```

#### Qwik

Open the `src/global.css` file and add the following:

```css
@stylex stylesheet;
```

> [!NOTE]
> If you don't have a `src/global.css` file, create one and import it in your `src/root.tsx` file.

#### Other Frameworks

It's possible that other frameworks don't work out of the box. If you find that this is the case, please open an issue.

## Working with external StyleX files and libraries

If you want to use StyleX styles from another package, we need to tell Vite to not optimize the dependency so that the plugin can process them. To do this, the plugin provides a `libraries` option that you can use to provide a list of packages that provide StyleX styles.

```ts
import styleX from "vite-plugin-stylex";

export default defineConfig({
  plugins: [
    react(),
    styleX({
      libraries: ["cool-stylex-package"],
    }),
  ],
});
```

> [!NOTE]
> This is done by default for `@stylexjs/open-props`, if you want more libraries to be excluded by default, please submit an issue.

# Acknowledgments

- [@stylexjs/rollup-plugin](https://github.com/facebook/stylex/tree/main/packages/rollup-plugin) for the base implementation for this Vite plugin.
