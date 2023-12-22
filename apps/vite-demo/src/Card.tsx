import * as stylex from "@stylexjs/stylex";
import { tokens } from "./theme.stylex";
import { grayOKLCH } from "@stylexjs/open-props/lib/grayOKLCH.stylex";

export default function Card({ children }: { children: React.ReactNode }) {
  return (
    <div {...stylex.props(styles.root)} data-testId="card">
      {children}
    </div>
  );
}

const styles = stylex.create({
  root: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 16,
    boxShadow: "0 0 16px rgba(0, 0, 0, 0.1)",
    color: tokens.primaryTextColor,
    ":hover": {
      backgroundColor: `oklch(${grayOKLCH.grey1} 0 0)`,
    },
  },
});
