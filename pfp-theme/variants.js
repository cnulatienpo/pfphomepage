// variants.js
// Creates alternate font versions: chunky, skinny, shadow, outline, crumpled.
// Uses Paper.js to manipulate the vector shapes.

import { setupPaper } from "./paperSetup";
import {
  makeThicker,
  makeThinner,
  outline,
  shadow,
  stretchTaller,
  squishShorter
} from "./shapeTools";

export function makeChunky(glyphs, amount = 6) {
  const out = {};
  for (const key in glyphs) {
    const g = glyphs[key];
    out[key] = makeThicker(g, amount);
  }
  return out;
}

export function makeSkinny(glyphs, amount = 4) {
  const out = {};
  for (const key in glyphs) {
    const g = glyphs[key];
    out[key] = makeThinner(g, amount);
  }
  return out;
}

export function makeOutlineVersion(glyphs, amount = 4) {
  const out = {};
  for (const key in glyphs) {
    const g = glyphs[key];
    out[key] = outline(g, amount);
  }
  return out;
}

export function makeShadowVersion(glyphs, offsetX = 40, offsetY = 40) {
  const out = {};
  for (const key in glyphs) {
    const g = glyphs[key];
    out[key] = shadow(g, offsetX, offsetY);
  }
  return out;
}

// Fake paper crumple: distort control points with noise
export function makeCrumpleVersion(glyphs, intensity = 6) {
  const paper = setupPaper();
  const out = {};

  for (const key in glyphs) {
    const g = glyphs[key].clone();

    // apply wobble to segments
    g.segments.forEach(seg => {
      const nx = (Math.random() - 0.5) * intensity;
      const ny = (Math.random() - 0.5) * intensity;

      seg.point.x += nx;
      seg.point.y += ny;

      if (seg.handleIn) {
        seg.handleIn.x += nx * 0.5;
        seg.handleIn.y += ny * 0.5;
      }
      if (seg.handleOut) {
        seg.handleOut.x += nx * 0.5;
        seg.handleOut.y += ny * 0.5;
      }
    });

    out[key] = g;
  }

  return out;
}
