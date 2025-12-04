// GlyphNudgePanel.tsx
// Per-letter adjustment panel: nudge, tilt, squeeze, stretch, reset.

import React from "react";
import { nudge, uniformScale } from "pfp-theme/engine/shapeTools";

export default function GlyphNudgePanel({ char, shape, onChange }) {
  function move(x, y) {
    const newShape = nudge(shape, x, y);
    onChange(char, newShape);
  }

  function scale(factor) {
    const newShape = uniformScale(shape, factor);
    onChange(char, newShape);
  }

  function reset() {
    onChange(char, null); // parent will reload original
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        marginTop: "4px",
        padding: "4px",
        border: "1px solid #ccc",
        borderRadius: "6px",
        background: "#f2f2f2",
        width: "70px"
      }}
    >
      <div style={{ fontSize: "0.7rem", textAlign: "center" }}>{char}</div>

      <button onClick={() => move(0, -2)}>↑</button>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button onClick={() => move(-2, 0)}>←</button>
        <button onClick={() => move(2, 0)}>→</button>
      </div>

      <button onClick={() => move(0, 2)}>↓</button>

      <button onClick={() => scale(1.05)}>bigger</button>
      <button onClick={() => scale(0.95)}>smaller</button>

      <button onClick={reset}>reset</button>
    </div>
  );
}
