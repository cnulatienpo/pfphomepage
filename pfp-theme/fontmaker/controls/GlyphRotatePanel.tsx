// GlyphRotatePanel.tsx
// Per-letter tilt / rotation control.

import React from "react";
import { setupPaper } from "pfp-theme/engine/paperSetup";

export default function GlyphRotatePanel({ char, shape, onChange }) {
  function rotate(deg) {
    if (!shape) return;
    const paper = setupPaper();
    const clone = shape.clone();
    clone.rotate(deg);
    onChange(char, clone);
  }

  function reset() {
    onChange(char, null); // parent supplies original
  }

  return (
    <div
      style={{
        width: "70px",
        padding: "4px",
        background: "#f2f2f2",
        border: "1px solid #ccc",
        borderRadius: "6px",
        marginTop: "4px",
        display: "flex",
        flexDirection: "column",
        gap: "4px"
      }}
    >
      <div style={{ fontSize: "0.7rem", textAlign: "center" }}>{char}</div>

      <button onClick={() => rotate(-3)}>tilt ←</button>
      <button onClick={() => rotate(3)}>tilt →</button>

      <button onClick={reset}>reset</button>
    </div>
  );
}
