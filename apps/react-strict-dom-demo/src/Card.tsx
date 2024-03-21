import { css, html } from "react-strict-dom";
import { tokens } from "./theme.stylex";
import { aliasedTokens } from "@/aliased-import-theme.stylex";
import { colors } from "@stylexjs/open-props/lib/colors.stylex";

export default function Card({ children }: { children: React.ReactNode }) {
  return (
    <html.div style={[styles.root]} data-testid="card">
      {children}
    </html.div>
  );
}

const styles = css.create({
  root: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 16,
    boxShadow: "0 0 16px rgba(0, 0, 0, 0.1)",
    color: tokens.primaryTextColor,
    border: `1px solid ${colors.blue1}`,
    outlineColor: aliasedTokens.primaryOutlineColor,
  },
});
