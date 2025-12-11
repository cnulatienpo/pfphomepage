// buildFont.js
// Turns processed Paper.js glyphs into a real OpenType .ttf font.
// Uses opentype.js to assemble glyphs, metrics, and font tables.

import opentype from "./vendor/opentype";
import { setupPaper } from "./paperSetup";

// Convert a Paper.js Path into an OpenType.js path
function paperToOpenType(paperPath) {
  const commands = [];
  const segments = paperPath.segments;

  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    const prev = segments[i - 1];

    const x = s.point.x;
    const y = -s.point.y; // Flip Y for OpenType

    if (i === 0) {
      commands.push({ type: 'M', x, y });
    } else {
      const hx1 = prev.handleOut ? prev.handleOut.x + prev.point.x : prev.point.x;
      const hy1 = prev.handleOut ? -(prev.handleOut.y + prev.point.y) : -prev.point.y;
      const hx2 = s.handleIn ? s.handleIn.x + s.point.x : s.point.x;
      const hy2 = s.handleIn ? -(s.handleIn.y + s.point.y) : -s.point.y;

      const hasHandles =
        (prev.handleOut && (prev.handleOut.x !== 0 || prev.handleOut.y !== 0)) ||
        (s.handleIn && (s.handleIn.x !== 0 || s.handleIn.y !== 0));

      if (hasHandles) {
        commands.push({
          type: 'C',
          x1: hx1,
          y1: hy1,
          x2: hx2,
          y2: hy2,
          x,
          y
        });
      } else {
        commands.push({ type: 'L', x, y });
      }
    }
  }

  if (paperPath.closed) {
    commands.push({ type: 'Z' });
  }

  return new opentype.Path(commands);
}

// Build a single glyph
function buildGlyph(char, paperPath, index, unitsPerEm = 1000) {
  if (!paperPath) {
    return new opentype.Glyph({
      name: char,
      unicode: char.charCodeAt(0),
      advanceWidth: unitsPerEm * 0.5,
      path: new opentype.Path()
    });
  }

  const otPath = paperToOpenType(paperPath);
  const bounds = paperPath.bounds;
  const advance = bounds.width + 50;

  return new opentype.Glyph({
    name: char,
    unicode: char.charCodeAt(0),
    advanceWidth: advance,
    path: otPath
  });
}

// Build the full font
export function buildFont(glyphs, options = {}) {
  const {
    fontName = "MyFont",
    unitsPerEm = 1000,
    ascender = 800,
    descender = -200
  } = options;

  const glyphList = [];
  let index = 0;

  for (const char of Object.keys(glyphs)) {
    const g = glyphs[char];
    const built = buildGlyph(char, g, index, unitsPerEm);
    glyphList.push(built);
    index++;
  }

  const font = new opentype.Font({
    familyName: fontName,
    styleName: options.styleName || "Regular",
    unitsPerEm,
    ascender,
    descender,
    glyphs: glyphList
  });

  return font;
}
