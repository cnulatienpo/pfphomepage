// FontPreviewCanvas.tsx
// Draws preview text USING the custom-built font.
// When user clicks “use this in the theme”, we hand the font object upward.

import React, { useRef, useEffect } from "react";
import { setupPaper } from "@engine/paperSetup";

export default function FontPreviewCanvas({ fontObj, previewText, onUse }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!fontObj) return;
    drawPreview();
  }, [fontObj, previewText]);

  function drawPreview() {
    const canvas = canvasRef.current;
    if (!canvas || !fontObj) return;

    const ctx = canvas.getContext("2d");
    const paper = setupPaper();

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // convert text → glyphs
    let x = 20;
    const yBase = 150;

    for (const char of previewText) {
      const glyph = fontObj.glyphs.glyphs.find(g => g.unicode === char.charCodeAt(0));
      if (!glyph) {
        x += 40;
        continue;
      }

      // draw glyph path
      const path = new paper.Path();

      glyph.path.commands.forEach(cmd => {
        if (cmd.type === "M") path.moveTo(cmd.x + x, yBase - cmd.y);
        if (cmd.type === "L") path.lineTo(cmd.x + x, yBase - cmd.y);
        if (cmd.type === "C") {
          path.cubicCurveTo(
            cmd.x1 + x, yBase - cmd.y1,
            cmd.x2 + x, yBase - cmd.y2,
            cmd.x + x, yBase - cmd.y
          );
        }
        if (cmd.type === "Z") path.closePath();
      });

      path.strokeColor = "black";
      path.strokeWidth = 2;

      x += glyph.advanceWidth * 0.05;
    }

    paper.view.draw();
  }

  function useInTheme() {
    if (fontObj && onUse) onUse(fontObj);
  }

  return (
    <div style={{ marginTop: "1rem" }}>
      <canvas
        ref={canvasRef}
        width={800}
        height={200}
        style={{
          width: "100%",
          height: "200px",
          border: "1px solid #ccc",
          background: "white"
        }}
      />

      <button
        style={{
          marginTop: "1rem",
          padding: "0.5rem 1rem",
          fontWeight: 700
        }}
        onClick={useInTheme}
      >
        use this in the theme
      </button>
    </div>
  );
}
