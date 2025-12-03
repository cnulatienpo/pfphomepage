// GlyphTagEditor.tsx
// Lets you assign tags to each glyph (categories, flags, whatever).
// Tags stored as simple arrays: { A: ["tall", "wide"], b: ["curvy"], ... }

import React, { useState } from "react";

export default function GlyphTagEditor({ char, tags, onChange }) {
  const [newTag, setNewTag] = useState("");

  function addTag() {
    if (!newTag.trim()) return;

    const updated = [...(tags[char] || []), newTag.trim()];
    onChange(char, updated);
    setNewTag("");
  }

  function removeTag(tag) {
    const updated = (tags[char] || []).filter(t => t !== tag);
    onChange(char, updated);
  }

  return (
    <div
      style={{
        width: "140px",
        padding: "8px",
        border: "1px solid #ccc",
        borderRadius: "6px",
        background: "#f8f8f8",
        marginTop: "8px"
      }}
    >
      <div
        style={{
          fontSize: "0.8rem",
          fontWeight: 700,
          marginBottom: "4px"
        }}
      >
        {char} tags
      </div>

      {/* Tag list */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "4px",
          marginBottom: "6px"
        }}
      >
        {(tags[char] || []).map(tag => (
          <span
            key={tag}
            style={{
              background: "#ddd",
              padding: "2px 4px",
              borderRadius: "4px",
              fontSize: "0.7rem",
              display: "flex",
              alignItems: "center",
              gap: "4px"
            }}
          >
            {tag}
            <button
              onClick={() => removeTag(tag)}
              style={{
                background: "transparent",
                border: "none",
                fontSize: "0.7rem",
                cursor: "pointer"
              }}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      {/* Add tag */}
      <div style={{ display: "flex", gap: "4px" }}>
        <input
          type="text"
          placeholder="new tag"
          value={newTag}
          onChange={e => setNewTag(e.target.value)}
          style={{ flex: 1, fontSize: "0.8rem" }}
        />
        <button
          onClick={addTag}
          style={{ fontSize: "0.8rem", padding: "2px 6px" }}
        >
          +
        </button>
      </div>
    </div>
  );
}
