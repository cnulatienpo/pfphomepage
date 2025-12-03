// shapeTools.js
// All the shape manipulation helpers for the Font Maker.
// These run on Paper.js paths returned from loadSvg().

import { setupPaper } from "./paperSetup";

export function makeThicker(path, amount = 2) {
  const paper = setupPaper();
  try {
    const clone = path.clone();
    const expanded = clone.strokeToPath({
      strokeWidth: amount,
      strokeCap: 'round',
      strokeJoin: 'round'
    });
    clone.remove();
    return expanded;
  } catch (e) {
    return path;
  }
}

export function makeThinner(path, amount = 2) {
  const paper = setupPaper();
  try {
    const clone = path.clone();
    const expanded = clone.strokeToPath({
      strokeWidth: Math.max(0.1, amount * 0.1),
      strokeCap: 'round',
      strokeJoin: 'round'
    });
    clone.remove();
    return expanded;
  } catch (e) {
    return path;
  }
}

export function stretchTaller(path, scale = 1.1) {
  const paper = setupPaper();
  try {
    const clone = path.clone();
    clone.scale(1, scale);
    return clone;
  } catch (e) {
    return path;
  }
}

export function squishShorter(path, scale = 0.9) {
  const paper = setupPaper();
  try {
    const clone = path.clone();
    clone.scale(1, scale);
    return clone;
  } catch (e) {
    return path;
  }
}

export function stretchWider(path, scale = 1.1) {
  const paper = setupPaper();
  try {
    const clone = path.clone();
    clone.scale(scale, 1);
    return clone;
  } catch (e) {
    return path;
  }
}

export function squishNarrower(path, scale = 0.9) {
  const paper = setupPaper();
  try {
    const clone = path.clone();
    clone.scale(scale, 1);
    return clone;
  } catch (e) {
    return path;
  }
}

export function nudge(path, x = 0, y = 0) {
  const paper = setupPaper();
  try {
    const clone = path.clone();
    clone.translate(new paper.Point(x, y));
    return clone;
  } catch (e) {
    return path;
  }
}

export function uniformScale(path, factor = 1.0) {
  const paper = setupPaper();
  try {
    const clone = path.clone();
    clone.scale(factor);
    return clone;
  } catch (e) {
    return path;
  }
}

export function autoCenter(path) {
  const paper = setupPaper();
  try {
    const clone = path.clone();
    clone.position = new paper.Point(0, 0);
    return clone;
  } catch (e) {
    return path;
  }
}

export function applySpacing(glyphs, spacing = 0) {
  const paper = setupPaper();
  const out = {};

  for (const key in glyphs) {
    const p = glyphs[key].clone();
    p.translate(new paper.Point(spacing, 0));
    out[key] = p;
  }
  return out;
}

export function autoKerning(glyphs) {
  const paper = setupPaper();
  const kerned = {};

  for (const key in glyphs) {
    const g = glyphs[key].clone();
    const bounds = g.bounds;
    const width = bounds.width;

    const offset = -Math.min(0, width * 0.05);
    g.translate(new paper.Point(offset, 0));
    kerned[key] = g;
  }

  return kerned;
}

// Simple outline (trace around it)
export function outline(path, amount = 2) {
  const paper = setupPaper();
  try {
    const clone = path.clone();
    const expanded = clone.strokeToPath({
      strokeWidth: amount * 2,
      strokeCap: 'round',
      strokeJoin: 'round'
    });
    clone.remove();
    return expanded;
  } catch (e) {
    return path;
  }
}

// Simple shadow offset
export function shadow(path, offsetX = 20, offsetY = 20) {
  const paper = setupPaper();
  try {
    const clone = path.clone();
    clone.translate(new paper.Point(offsetX, offsetY));
    return clone;
  } catch (e) {
    return path;
  }
}
