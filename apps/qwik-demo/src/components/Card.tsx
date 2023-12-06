import * as stylex from "@stylexjs/stylex";
import { tokens } from "./theme.stylex";

export default function Card({ children }: { children: any }) {
  const props = stylex.props(styles.root);

  return (
    <div class={props.className} style={props.style}>
      {children}
    </div>
  );
}

const styles = stylex.create({
  root: {
    backgroundColor: "blue",
    borderRadius: 8,
    padding: 16,
    boxShadow: "0 0 16px rgba(0, 0, 0, 0.1)",
    color: tokens.primaryTextColor,
  },
});
