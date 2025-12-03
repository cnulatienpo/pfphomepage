// BatchActions.tsx
// Global actions applied to the entire glyph set.

import React from "react";
import {
  stretchTaller,
  squishShorter,
  makeThicker,
  makeThinner,
  nudge
} from "@engine/shapeTools";
import { setupPaper } from "@engine/paperSetup";

export default function BatchActions({ glyphs, onChange }) {
  function apply(fn) {
    const out = {};
    for (const c in glyphs) {
      const g = glyphs[c];
      out[c] = fn(g);
    }
    onChange(out);
  }

  function shiftBaseline(amount) {
    const out = {};
    for (const c in glyphs) {
      const g = glyphs[c];
      out[c] = nudge(g, 0, amount);
    }
    onChange(out);
  }

  function rotateAll(deg) {
    const paper = setupPaper();
    const out = {};
    for (const c in glyphs) {
      const g = glyphs[c];
      const cl = g.clone();
      cl.rotate(deg);
      out[c] = cl;
    }
    onChange(out);
  }

  function resetAll() {
    onChange({});
  }

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "0.5rem",
        padding: "0.5rem",
        background: "#f3f3f3",
        border: "1px solid #ccc",
        borderRadius: "6px",
        marginTop: "1rem"
      }}
    >
      <button onClick={() => apply(g => stretchTaller(g, 1.1))}>
        stretch all
      </button>

      <button onClick={() => apply(g => squishShorter(g, 0.9))}>
        squish all
      </button>

      <button onClick={() => apply(g => makeThicker(g, 4))}>
        thicken all
      </button>

      <button onClick={() => apply(g => makeThinner(g, 4))}>
        thin all
      </button>

      <button onClick={() => shiftBaseline(-10)}>
        lift baseline
      </button>

      <button onClick={() => shiftBaseline(10)}>
        drop baseline
      </button>

      <button onClick={() => rotateAll(-4)}>
        rotate all ←
      </button>

      <button onClick={() => rotateAll(4)}>
        rotate all →
      </button>

      <button
        onClick={resetAll}
        style={{ background: "#ffdddd", borderColor: "#cc8888" }}
      >
        reset all
      </button>
    </div>
  );
}
