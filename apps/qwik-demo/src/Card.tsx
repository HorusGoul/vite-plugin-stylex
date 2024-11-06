import stylex from "@stylexjs/stylex";
import { tokens } from "./theme.stylex";
import { Slot, component$ } from "@builder.io/qwik";

const Card = component$(() => {
  return (
    <div {...stylex.attrs(styles.root)} data-testid="card">
      <Slot />
    </div>
  );
});

export default Card;

const styles = stylex.create({
  root: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 16,
    boxShadow: "0 0 16px rgba(0, 0, 0, 0.1)",
    color: tokens.primaryTextColor,
  },
});
