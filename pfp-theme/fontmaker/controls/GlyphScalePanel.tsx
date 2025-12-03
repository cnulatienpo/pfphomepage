// GlyphScalePanel.tsx
// Per-letter scale controls, separate from nudging or rotation.

import React from "react";
import { uniformScale } from "@engine/shapeTools";

export default function GlyphScalePanel({ char, shape, onChange }) {
  function scale(factor) {
    if (!shape) return;
    const newShape = uniformScale(shape, factor);
    onChange(char, newShape);
  }

  function reset() {
    onChange(char, null);
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
      <button onClick={() => scale(1.05)}>bigger</button>
      <button onClick={() => scale(0.95)}>smaller</button>
      <button onClick={reset}>reset</button>
    </div>
  );
}
