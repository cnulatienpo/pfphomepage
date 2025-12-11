// GlyphDeletePanel.tsx
// Lets you remove a letter from the font entirely.

import React from "react";

export default function GlyphDeletePanel({ char, onDelete }) {
  return (
    <div
      style={{
        width: "70px",
        padding: "4px",
        background: "#ffecec",
        border: "1px solid #cc8888",
        borderRadius: "6px",
        marginTop: "4px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "4px"
      }}
    >
      <div style={{ fontSize: "0.7rem", opacity: 0.6 }}>{char}</div>

      <button
        onClick={() => onDelete(char)}
        style={{
          background: "#ff5555",
          color: "#fff",
          padding: "4px",
          borderRadius: "4px",
          border: "none",
          width: "100%"
        }}
      >
        remove
      </button>
    </div>
  );
}
