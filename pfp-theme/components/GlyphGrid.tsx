// GlyphGrid.tsx
// Lays out all glyph tiles in a responsive grid.
// Each tile renders its own vector shape through GlyphTile.

import React from "react";
import GlyphTile from "./GlyphTile";

export default function GlyphGrid({ glyphs, onUpdate }) {
  const letters = Object.keys(glyphs).sort();

  function handleChange(char, newShape) {
    const updated = { ...glyphs, [char]: newShape };
    if (onUpdate) onUpdate(updated, char, newShape);
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, 70px)",
        gap: "0.5rem",
        padding: "0.5rem",
      }}
    >
      {letters.map((char) => (
        <GlyphTile
          key={char}
          char={char}
          shape={glyphs[char]}
          onChange={handleChange}
        />
      ))}
    </div>
  );
}
