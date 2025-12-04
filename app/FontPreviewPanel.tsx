// FontPreviewPanel.tsx
// Live preview using the active font variable.

import React from "react";
import { useThemeFont } from "./ThemeFontContext";

export default function FontPreviewPanel() {
  const { activeFontName } = useThemeFont();

  const style = {
    fontFamily: "var(--theme-font)",
    padding: "20px",
    border: "1px solid var(--steel-300)",
    background: "var(--paper-100)"
  };

  return (
    <div style={style}>
      <h1 style={{ marginBottom: "16px" }}>Heading 1 — {activeFontName}</h1>
      <h2 style={{ marginBottom: "12px" }}>Heading 2 Example</h2>

      <p style={{ marginBottom: "12px" }}>
        This is body text showing how the chosen font feels in a paragraph.
        Letters bunch up, stretch out, curve, or sit tall depending on how you
        shaped them.
      </p>

      <label style={{ display: "block", marginBottom: "6px" }}>
        Label Example
      </label>

      <p style={{ fontSize: "13px", opacity: 0.7 }}>
        Small helper text. A good place to see spacing.
      </p>
    </div>
  );
}
