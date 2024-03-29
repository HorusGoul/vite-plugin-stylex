---
"vite-plugin-stylex": minor
---

Refactor Plugin to delegate more work to Vite itself

- Use Vite's CSS pipeline for all CSS processing
- Use Vite's `waitForRequestsIdle` experimental API to wait before generating the StyleX StyleSheet
- Move to use `renderChunk` hook to generate the StyleX StyleSheet during builds.

This change should make the plugin more robust and easier to maintain in the future.

**BREAKING CHANGES**

- The plugin now requires Vite 5.2.7 or higher
- There's no more implicit CSS processing, you need to include the `@stylex stylesheet;` rule in a CSS file to generate the StyleX StyleSheet

To migrate, add the `@stylex stylesheet;` rule to a CSS file in your project. Import that CSS file in your entrypoint.

```css
/* stylex.css */
@stylex stylesheet;

...
```

```ts
// main.ts
import './stylex.css';

...
```
