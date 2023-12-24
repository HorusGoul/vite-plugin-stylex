"use client";

import * as stylex from "@stylexjs/stylex";
import { tokens } from "./theme.stylex";

export default function Card({ children }: { children: React.ReactNode }) {
  return (
    <div {...stylex.props(styles.root)} data-testid="card">
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
  },
});
