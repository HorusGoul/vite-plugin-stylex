<script context="module" lang="ts">
  import stylex from "@stylexjs/stylex";
  import { tokens } from "./theme.stylex";

  const styles = stylex.create({
    root: {
      backgroundColor: "white",
      borderRadius: 8,
      padding: 16,
      boxShadow: "0 0 16px rgba(0, 0, 0, 0.1)",
      color: tokens.primaryTextColor,
    },
  });
</script>

<div class={stylex(styles.root)} data-testid="card">
  <slot />
</div>
