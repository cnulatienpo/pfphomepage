// FontMetadataForm.tsx
// Small form for entering font metadata before building.

import React from "react";

export default function FontMetadataForm({ metadata, onChange }) {
  const { fontName, styleName, unitsPerEm, ascender, descender, padding } =
    metadata || {};

  function update(key, value) {
    const next = { ...metadata, [key]: value };
    onChange(next);
  }

  return (
    <div
      style={{
        padding: "1rem",
        marginTop: "1rem",
        border: "1px solid #ccc",
        borderRadius: "6px",
        background: "#f9f9f9",
        width: "100%",
        maxWidth: "400px",
      }}
    >
      <h3 style={{ margin: 0, marginBottom: "0.5rem" }}>Font details</h3>

      <label>Font name</label>
      <input
        type="text"
        value={fontName || ""}
        onChange={(e) => update("fontName", e.target.value)}
        style={{ width: "100%", marginBottom: "0.5rem" }}
      />

      <label>Style name</label>
      <input
        type="text"
        value={styleName || ""}
        onChange={(e) => update("styleName", e.target.value)}
        style={{ width: "100%", marginBottom: "0.5rem" }}
      />

      <label>Units per em</label>
      <input
        type="number"
        value={unitsPerEm ?? 1000}
        onChange={(e) => update("unitsPerEm", parseInt(e.target.value, 10))}
        style={{ width: "100%", marginBottom: "0.5rem" }}
      />

      <label>Ascender</label>
      <input
        type="number"
        value={ascender ?? 800}
        onChange={(e) => update("ascender", parseInt(e.target.value, 10))}
        style={{ width: "100%", marginBottom: "0.5rem" }}
      />

      <label>Descender</label>
      <input
        type="number"
        value={descender ?? -200}
        onChange={(e) => update("descender", parseInt(e.target.value, 10))}
        style={{ width: "100%", marginBottom: "0.5rem" }}
      />

      <label>Side padding (canvas)</label>
      <input
        type="number"
        value={padding ?? 50}
        onChange={(e) => update("padding", parseInt(e.target.value, 10))}
        style={{ width: "100%", marginBottom: "0.5rem" }}
      />
    </div>
  );
}
