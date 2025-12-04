// GlyphControls.tsx
// Combines all per-letter controls into one stack:
// Nudge, Rotate, Scale, Delete.

import React from "react";
import GlyphNudgePanel from "./GlyphNudgePanel";
import GlyphRotatePanel from "./GlyphRotatePanel";
import GlyphScalePanel from "./GlyphScalePanel";
import GlyphDeletePanel from "./GlyphDeletePanel";

export default function GlyphControls({ char, shape, onChange, onDelete }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        width: "70px"
      }}
    >
      <GlyphNudgePanel char={char} shape={shape} onChange={onChange} />
      <GlyphRotatePanel char={char} shape={shape} onChange={onChange} />
      <GlyphScalePanel char={char} shape={shape} onChange={onChange} />
      <GlyphDeletePanel char={char} onDelete={onDelete} />
    </div>
  );
}
