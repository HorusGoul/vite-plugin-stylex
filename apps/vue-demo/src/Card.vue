
<script lang="ts" setup>
import stylex from "@stylexjs/stylex";
import { tokens } from "./theme.stylex";
</script>

<script lang="ts">
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

<template>
  <div v-bind="stylex.attrs(styles.root)"  data-testid="card">
    <slot />
  </div>
</template>

