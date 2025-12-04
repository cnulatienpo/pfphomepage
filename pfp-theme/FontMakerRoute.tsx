// FontMakerRoute.tsx
// Page wrapper so the feature can live inside your theme builder routing.

import React from "react";
import FontMaker from "./FontMaker";        // your real maker
import FontPreviewPanel from "./FontPreviewPanel";

export default function FontMakerRoute() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 300px",
        height: "100%",
        overflow: "hidden"
      }}
    >
      <div style={{ overflow: "auto" }}>
        <FontMaker />
      </div>

      <div
        style={{
          borderLeft: "1px solid var(--steel-300)",
          padding: "10px",
          overflowY: "auto"
        }}
      >
        <FontPreviewPanel />
      </div>
    </div>
  );
}
