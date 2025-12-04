// GlyphTile.tsx
// Shows a single glyph as a draggable vector preview inside a tile.
// Integrates with Paper.js to render the glyph shape.

import React, { useRef, useEffect, useState } from "react";
import { setupPaper } from "pfp-theme/engine/paperSetup";
import { nudge } from "pfp-theme/engine/shapeTools";

export default function GlyphTile({ char, shape, onChange }) {
  const canvasRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    draw();
  }, [shape, offset]);

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas || !shape) return;

    const paper = setupPaper();
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    paper.project.clear();
    paper.view.viewSize = new paper.Size(canvas.width, canvas.height);

    const cloned = shape.clone();
    cloned.translate(new paper.Point(canvas.width / 2, canvas.height / 2));
    cloned.translate(new paper.Point(offset.x, offset.y));

    cloned.strokeColor = "black";
    cloned.strokeWidth = 2;

    paper.view.draw();
  }

  function startDrag(e) {
    setDragging(true);
  }

  function stopDrag(e) {
    if (!dragging) return;
    setDragging(false);

    const dx = e.movementX || 0;
    const dy = e.movementY || 0;

    const newOffset = {
      x: offset.x + dx,
      y: offset.y + dy
    };

    setOffset(newOffset);

    const newShape = nudge(shape, dx, dy);
    onChange(char, newShape);
  }

  return (
    <div
      style={{
        width: "70px",
        height: "70px",
        border: "2px solid #888",
        borderRadius: "6px",
        background: "#fafafa",
        position: "relative",
        cursor: "grab"
      }}
      onMouseDown={startDrag}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
    >
      <canvas
        ref={canvasRef}
        width={70}
        height={70}
        style={{ width: "70px", height: "70px" }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "2px",
          right: "4px",
          fontSize: "0.6rem",
          opacity: 0.5
        }}
      >
        {char}
      </div>
    </div>
  );
}
